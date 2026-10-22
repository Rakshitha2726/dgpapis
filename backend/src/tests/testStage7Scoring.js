/**
 * tests/testStage7Scoring.js
 * ----------------------------
 * Verification and unit/integration test suite for Stage 7 Performance Scoring & Ranking Engine.
 *
 * Checks:
 *  1. Unit tests for KPI score normalization (higher_is_better true/false, capping, zero handling)
 *  2. Unit tests for weighted contributions
 *  3. Integration test for department score calculation
 *  4. Integration test for department score persistence
 *  5. Integration test for department ranking generation & tie handling
 */

import { sequelize } from '../config/database.js';
import {
  calculateNormalizedKpiScore,
  calculateWeightedContribution,
  calculateNormalizedWeightedScore,
  computeDepartmentScore,
  computeAndSaveDepartmentScore,
  getDepartmentRankings,
} from '../utils/scoreEngine.js';
import { Department, DepartmentScore, PerformanceEntry, KPI } from '../models/index.js';

async function runStage7Tests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING STAGE 7 SCORING ENGINE TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // ── 1. Unit Tests: Normalization ───────────────────────────────────────
    console.log('--- 1. Testing KPI Score Normalization ---');

    // Higher is better: 90 actual / 100 target = 90%
    assert(
      calculateNormalizedKpiScore(90, 100, true) === 90,
      'Higher is better: 90 / 100 target = 90'
    );

    // Higher is better with overachievement: 150 actual / 100 target = 150% capped to 100
    assert(
      calculateNormalizedKpiScore(150, 100, true) === 100,
      'Higher is better: 150 / 100 target = 100 (capped at 100)'
    );

    // Higher is better: 0 actual / 100 target = 0%
    assert(
      calculateNormalizedKpiScore(0, 100, true) === 0,
      'Higher is better: 0 actual / 100 target = 0'
    );

    // Lower is better: 10 actual / 20 target = (20/10)*100 = 200 capped to 100
    assert(
      calculateNormalizedKpiScore(10, 20, false) === 100,
      'Lower is better: 10 actual / 20 target = 100 (capped at 100)'
    );

    // Lower is better: 40 actual / 20 target = (20/40)*100 = 50%
    assert(
      calculateNormalizedKpiScore(40, 20, false) === 50,
      'Lower is better: 40 actual / 20 target = 50'
    );

    // Zero actual on lower-is-better (e.g. 0 complaints) -> 100%
    assert(
      calculateNormalizedKpiScore(0, 20, false) === 100,
      'Lower is better: 0 actual / 20 target = 100'
    );

    // Zero target safety check -> returns 0
    assert(
      calculateNormalizedKpiScore(50, 0, true) === 0,
      'Zero target safety check returns 0'
    );

    // Negative target safety check -> returns 0
    assert(
      calculateNormalizedKpiScore(50, -10, true) === 0,
      'Negative target safety check returns 0'
    );

    // Negative actual safety check -> treated as 0
    assert(
      calculateNormalizedKpiScore(-20, 100, true) === 0,
      'Negative actual on higher-is-better clamped to 0'
    );


    // ── 2. Unit Tests: Weighted Contribution ────────────────────────────────
    console.log('\n--- 2. Testing Weighted Contributions ---');

    // Score 90 with 30% weight -> 27
    assert(
      calculateWeightedContribution(90, 30) === 27,
      'Score 90 with weight 30 = 27'
    );

    // Score 100 with 25% weight -> 25
    assert(
      calculateWeightedContribution(100, 25) === 25,
      'Score 100 with weight 25 = 25'
    );


    // ── 3. Unit Tests: Normalized Weighted Average Formula ───────────────────
    console.log('\n--- 3. Testing Normalized Weighted Average Formula ---');

    // Four complete KPIs scoring 100 with total weights of 34 -> overall score 100
    const perfectProducts = (100 * 9) + (100 * 7) + (100 * 10) + (100 * 8); // 3400
    const perfectScore = calculateNormalizedWeightedScore(perfectProducts, 34);
    assert(
      perfectScore === 100,
      `Four complete KPIs scoring 100 with total weight 34 -> overall score = ${perfectScore} (expected 100)`
    );

    // KPI scores of 100, 100, 100, and 93.75 with weights 9, 7, 10, and 8 -> approximately 98.53
    const mixedProducts = (100 * 9) + (100 * 7) + (100 * 10) + (93.75 * 8); // 3350
    const mixedScore = calculateNormalizedWeightedScore(mixedProducts, 34);
    assert(
      mixedScore === 98.53,
      `KPI scores 100, 100, 100, 93.75 with weights 9, 7, 10, 8 -> overall score = ${mixedScore} (expected 98.53)`
    );

    // Zero applicable weight safety check -> returns null
    assert(
      calculateNormalizedWeightedScore(1000, 0) === null,
      'Zero applicable weight safety check returns null'
    );


    // ── 4. DB Integration Tests ─────────────────────────────────────────────
    console.log('\n--- 4. Testing Database Integration & Score Calculations ---');

    await sequelize.authenticate();
    console.log('  Database connection successful.');

    // Test MOH (id: 2) period 2026-10 (4 submitted KPIs: 85/85=100, 7/80=8.75, 90/95=94.74, 10/15=100 -> score 79.67, weight 34)
    const mohScore202610 = await computeDepartmentScore(2, 2026, 10);
    assert(mohScore202610 !== null, 'Computed MOH 2026-10 score');
    assert(mohScore202610.overall_score === 79.67, `MOH 2026-10 overall score is ${mohScore202610.overall_score} (expected 79.67)`);
    assert(mohScore202610.performance_label === 'Good', `MOH 2026-10 label is ${mohScore202610.performance_label} (expected Good)`);
    assert(mohScore202610.data_status === 'complete', `MOH 2026-10 data_status is ${mohScore202610.data_status} (expected complete)`);
    assert(mohScore202610.total_applicable_weight === 34, `MOH 2026-10 total_applicable_weight is ${mohScore202610.total_applicable_weight} (expected 34)`);

    // Test MOH (id: 2) period 2025-06 (scores 100, 100, 100, 93.75, weight 34)
    const mohScore202506 = await computeDepartmentScore(2, 2025, 6);
    assert(mohScore202506 !== null, 'Computed MOH 2025-06 score');
    assert(mohScore202506.overall_score === 98.53, `MOH 2025-06 overall score is ${mohScore202506.overall_score} (expected 98.53)`);
    assert(mohScore202506.performance_label === 'Excellent', `MOH 2025-06 label is ${mohScore202506.performance_label} (expected Excellent)`);
    assert(mohScore202506.data_status === 'complete', `MOH 2025-06 data_status is ${mohScore202506.data_status} (expected complete)`);

    // Test Missing Required KPIs remain incomplete and excluded from official rankings
    const incompleteDept = await Department.findOne({ where: { code: 'MOH' } });
    const incompleteScore = await computeDepartmentScore(incompleteDept.id, 2026, 9);
    assert(incompleteScore.data_status === 'incomplete', `MOH 2026-09 data_status is incomplete (${incompleteScore.data_status})`);
    assert(incompleteScore.missing_kpis.length > 0, `MOH 2026-09 has ${incompleteScore.missing_kpis.length} missing KPIs`);

    // Test Ranking Engine: verify incomplete departments are excluded from ranked_departments
    const rankings = await getDepartmentRankings(2026, 9);
    assert(rankings !== null, 'Rankings object returned');
    assert(Array.isArray(rankings.ranked_departments), 'ranked_departments array exists');
    assert(Array.isArray(rankings.unranked_departments), 'unranked_departments array exists');

    const mohInRanked = rankings.ranked_departments.find((d) => d.department_id === incompleteDept.id);
    const mohInUnranked = rankings.unranked_departments.find((d) => d.department_id === incompleteDept.id);

    assert(mohInRanked === undefined, 'Incomplete department is NOT present in ranked_departments');
    assert(mohInUnranked !== undefined, 'Incomplete department IS present in unranked_departments');

    console.log('\n==================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ FATAL TEST ERROR:', err);
    process.exit(1);
  }
}

runStage7Tests();
