/**
 * tests/testStage9AnomalyDetection.js
 * -----------------------------------
 * Comprehensive test suite for Stage 9: Automated Anomaly Detection and Data Quality Validation.
 *
 * Verifies:
 *  1. Mathematical unit tests: Median, MAD, and Modified Z-Score calculations.
 *  2. Zero-variance safety (preventing division-by-zero when historical values are identical).
 *  3. Contextual fairness: Low values consistent with history are NOT flagged as anomalies.
 *  4. Insufficient history handling (< 3 periods) without false positives.
 *  5. Data quality rule checks: Negative values, percentage overflow (>100%), scale mismatch, non-numeric.
 *  6. Database integration: System-wide period quality validation.
 *  7. Department isolation & role permission security guards.
 *  8. Regression check: Existing scoring and ranking outputs remain undisturbed.
 */

import { sequelize } from '../config/database.js';
import { Department, KPI, User, PerformanceEntry } from '../models/index.js';
import {
  calculateMedian,
  calculateMAD,
  computeModifiedZScore,
  checkEntryDataQuality,
  checkHistoricalAnomaly,
  runPeriodDataQualityValidation,
  MIN_HISTORICAL_PERIODS,
} from '../utils/anomalyDetector.js';
import { computeDepartmentScore, getDepartmentRankings } from '../utils/scoreEngine.js';
import {
  getSystemQualitySummary,
  getDepartmentQualitySummary,
} from '../controllers/anomalyController.js';

async function runStage9Tests() {
  console.log('\n==================================================================');
  console.log('🧪 RUNNING STAGE 9 ANOMALY DETECTION & DATA QUALITY TEST SUITE');
  console.log('==================================================================\n');

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

  function createMockRes() {
    return {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    };
  }

  try {
    // ── 1. Mathematical Unit Tests: Median & MAD ──────────────────────────
    console.log('--- 1. Testing Statistical Mathematics: Median & MAD ---');

    // Median on odd array
    assert(calculateMedian([10, 20, 30]) === 20, 'Median of [10, 20, 30] is 20');

    // Median on even array
    assert(calculateMedian([10, 20, 30, 40]) === 25, 'Median of [10, 20, 30, 40] is 25');

    // Median on unsorted array with decimals
    assert(calculateMedian([45.5, 12.1, 88.0]) === 45.5, 'Median handles unsorted decimals');

    // MAD calculation on known array: [88, 90, 92] -> Median = 90, deviations = [2, 0, 2] -> MAD = 2
    const testValues = [88, 90, 92];
    const med1 = calculateMedian(testValues);
    const mad1 = calculateMAD(testValues, med1);
    assert(med1 === 90, 'Median of [88, 90, 92] is 90');
    assert(mad1 === 2, 'MAD of [88, 90, 92] is 2');

    // MAD calculation on zero variance: [95, 95, 95] -> MAD = 0
    const zeroVarValues = [95, 95, 95];
    const medZero = calculateMedian(zeroVarValues);
    const madZero = calculateMAD(zeroVarValues, medZero);
    assert(madZero === 0, 'MAD on identical values [95, 95, 95] is 0 (zero variance)');


    // ── 2. Modified Z-Score & Zero Variance Safety ─────────────────────────
    console.log('\n--- 2. Testing Modified Z-Score & Zero Variance Handling ---');

    // Normal observation within expected range: median=90, mad=2, observed=92
    // diff = 2 -> Z = (0.6745 * 2) / 2 = 0.67 (< 2.5 Normal)
    const zNormal = computeModifiedZScore(92, 90, 2);
    assert(zNormal.modifiedZScore < 2.5, `Normal observation Z-score is within expected bounds (${zNormal.modifiedZScore} < 2.5)`);

    // Extreme outlier: median=90, mad=2, observed=20
    // diff = 70 -> Z = (0.6745 * 70) / 2 = 23.61 (>= 3.5 High Outlier)
    const zOutlier = computeModifiedZScore(20, 90, 2);
    assert(zOutlier.modifiedZScore >= 3.5, `Extreme drop observation produces high Z-score (${zOutlier.modifiedZScore} >= 3.5)`);

    // Zero variance handling: median=100, mad=0, observed=100 -> deviation=0, Z=0
    const zZeroIdentical = computeModifiedZScore(100, 100, 0);
    assert(zZeroIdentical.modifiedZScore === 0, 'Zero variance with identical value yields Z=0 without division by zero');

    // Zero variance with significant jump: median=100, mad=0, observed=50 (50% drop)
    const zZeroJump = computeModifiedZScore(50, 100, 0);
    assert(zZeroJump.isZeroVariance === true, 'Flagged as zero variance scenario');
    assert(zZeroJump.modifiedZScore >= 3.5, `Zero variance with 50% shift yields High Severity proxy Z-score (${zZeroJump.modifiedZScore})`);


    // ── 3. Data Quality Rule Checks ────────────────────────────────────────
    console.log('\n--- 3. Testing Data Quality Domain Rules ---');

    const mockDept = { id: 1, name: 'Ministry of Finance', code: 'MOF' };
    const mockKpiPct = { id: 101, name: 'Budget Utilization', unit: '%', target_value: 95 };
    const mockKpiCount = { id: 102, name: 'Processing Days', unit: 'days', target_value: 5 };

    // A. Percentage upper bounds check (> 100%)
    const pctOverEntry = { actual_value: 125.0, period_year: 2026, period_month: 9, status: 'submitted' };
    const pctAlerts = checkEntryDataQuality(pctOverEntry, mockKpiPct, mockDept);
    assert(pctAlerts.length > 0, 'Percentage > 100% generates data quality alert');
    assert(pctAlerts[0].code === 'PERCENTAGE_BOUND_EXCEEDED', 'Alert code is PERCENTAGE_BOUND_EXCEEDED');
    assert(pctAlerts[0].severity === 'HIGH', 'Percentage bound alert is marked HIGH severity');

    // B. Negative value check
    const negEntry = { actual_value: -15.5, period_year: 2026, period_month: 9, status: 'submitted' };
    const negAlerts = checkEntryDataQuality(negEntry, mockKpiPct, mockDept);
    assert(negAlerts.some((a) => a.code === 'NEGATIVE_VALUE_DISALLOWED'), 'Negative value generates NEGATIVE_VALUE_DISALLOWED alert');

    // C. Non-numeric value check
    const nanEntry = { actual_value: 'abc_invalid', period_year: 2026, period_month: 9, status: 'submitted' };
    const nanAlerts = checkEntryDataQuality(nanEntry, mockKpiPct, mockDept);
    assert(nanAlerts.some((a) => a.code === 'NON_NUMERIC_VALUE'), 'Non-numeric string generates NON_NUMERIC_VALUE alert');

    // D. Unrealistic scale check (> 5x target on non-percentage metric)
    const scaleEntry = { actual_value: 35.0, period_year: 2026, period_month: 9, status: 'submitted' };
    const scaleAlerts = checkEntryDataQuality(scaleEntry, mockKpiCount, mockDept);
    assert(scaleAlerts.some((a) => a.code === 'UNREALISTIC_SCALE_TARGET'), 'Value 35 days on 5-day target generates UNREALISTIC_SCALE_TARGET alert');


    // ── 4. Historical Anomaly Detection Edge Cases ─────────────────────────
    console.log('\n--- 4. Testing Historical Anomaly Engine & Contextual Fairness ---');

    // A. Insufficient history (< 3 periods): should NOT generate false positive
    const insufficientHistory = [{ actual_value: 90 }, { actual_value: 92 }];
    const currentNorm = { actual_value: 40, period_year: 2026, period_month: 9, status: 'submitted' };
    const insuffAlert = checkHistoricalAnomaly(currentNorm, insufficientHistory, mockKpiPct, mockDept);
    assert(insuffAlert === null, 'Fewer than 3 historical periods gracefully skips without false positive alerts');

    // B. Low value that is CONSISTENT with history (NOT an anomaly solely because it is low)
    const consistentlyLowHistory = [
      { actual_value: 30 },
      { actual_value: 32 },
      { actual_value: 31 },
      { actual_value: 33 },
    ];
    const consistentLowEntry = { actual_value: 31.5, period_year: 2026, period_month: 9, status: 'submitted' };
    const lowAnomalyAlert = checkHistoricalAnomaly(consistentLowEntry, consistentlyLowHistory, mockKpiPct, mockDept);
    assert(lowAnomalyAlert === null, 'Consistently low metric matching past baseline is NOT flagged as an anomaly');

    // C. Sudden genuine statistical outlier drop
    const steadyHistory = [
      { actual_value: 90 },
      { actual_value: 92 },
      { actual_value: 91 },
      { actual_value: 93 },
    ];
    const dropEntry = { actual_value: 35.0, period_year: 2026, period_month: 9, status: 'submitted' };
    const genuineDropAlert = checkHistoricalAnomaly(dropEntry, steadyHistory, mockKpiPct, mockDept);
    assert(genuineDropAlert !== null, 'Sudden drop from steady historical baseline is detected');
    assert(genuineDropAlert.severity === 'HIGH', 'Sudden drop is classified as HIGH severity');
    assert(genuineDropAlert.direction === 'PLUMMET', 'Direction correctly identifies PLUMMET');


    // ── 5. Database Integration & Period Quality Summary ──────────────────
    console.log('\n--- 5. Testing Database Integration & System Quality Validation ---');

    await sequelize.authenticate();
    console.log('  Database connection successful.');

    // Run system-wide validation for period 2026-09
    const systemValidation = await runPeriodDataQualityValidation({
      periodYear: 2026,
      periodMonth: 9,
    });

    assert(systemValidation !== null, 'System data quality validation returned result object');
    assert(typeof systemValidation.summary?.total_alerts === 'number', 'Summary contains total_alerts count');
    assert(systemValidation.summary?.data_integrity_score === null, 'Summary returns null data_integrity_score when 0 submissions evaluated');
    const periodWithData = await runPeriodDataQualityValidation({ periodYear: 2025, periodMonth: 6 });
    assert(typeof periodWithData.summary?.data_integrity_score === 'number', 'Summary contains numeric data_integrity_score when submissions exist');
    assert(Array.isArray(systemValidation.alerts), 'Alerts array is returned');
    assert(typeof systemValidation.disclaimer === 'string', 'Non-fraud disclaimer is present in results');


    // ── 6. Role-Based Access Control & Department Isolation ───────────────
    console.log('\n--- 6. Testing RBAC Security & Department Isolation ---');

    const adminUser = await User.findOne({ where: { role: 'admin' } });
    const officerUser = await User.findOne({ where: { role: 'department_officer' } });
    const policymakerUser = await User.findOne({ where: { role: 'policymaker' } });

    assert(adminUser !== null && officerUser !== null && policymakerUser !== null, 'Found required test users');

    // A. Policymaker accessing system quality summary
    const polyReq = { user: policymakerUser, query: { period_year: 2026, period_month: 9 } };
    const polyRes = createMockRes();
    await getSystemQualitySummary(polyReq, polyRes);
    assert(polyRes.statusCode === 200, 'Policymaker can access system-wide quality summary (HTTP 200)');
    assert(polyRes.data.success === true, 'System quality response indicates success');

    // B. Officer accessing own department quality summary
    const ownDeptReq = {
      user: officerUser,
      params: { id: officerUser.department_id },
      query: { period_year: 2026, period_month: 9 },
    };
    const ownDeptRes = createMockRes();
    await getDepartmentQualitySummary(ownDeptReq, ownDeptRes);
    assert(ownDeptRes.statusCode === 200, `Officer can access own department (${officerUser.department_id}) summary`);

    // C. Officer attempting to access ANOTHER department (Isolation Guard Check)
    const unauthorizedDeptId = officerUser.department_id === 1 ? 2 : 1;
    const rogueOfficerReq = {
      user: officerUser,
      params: { id: unauthorizedDeptId },
      query: { period_year: 2026, period_month: 9 },
    };
    const rogueOfficerRes = createMockRes();
    await getDepartmentQualitySummary(rogueOfficerReq, rogueOfficerRes);
    assert(rogueOfficerRes.statusCode === 403, `Department isolation blocked officer from viewing department ${unauthorizedDeptId} (HTTP 403)`);


    // ── 7. Non-Regression Check: Scoring and Rankings Preserved ────────────
    console.log('\n--- 7. Non-Regression Check: Existing Scoring & Ranking Preservation ---');

    const sampleDept = await Department.findOne({ where: { is_active: true } });
    const scoreResult = await computeDepartmentScore(sampleDept.id, 2026, 9);
    assert(scoreResult !== null && scoreResult.department_id === sampleDept.id, 'Scoring engine outputs intact');

    const rankingResult = await getDepartmentRankings(2026, 9);
    assert(Array.isArray(rankingResult.ranked_departments), 'Rankings engine outputs intact');


    console.log('\n==================================================================');
    console.log(`📊 STAGE 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================================\n');

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

runStage9Tests();
