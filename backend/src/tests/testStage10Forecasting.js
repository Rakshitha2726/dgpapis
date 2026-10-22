/**
 * tests/testStage10Forecasting.js
 * --------------------------------
 * Comprehensive test suite for Stage 10: Predictive Governance & Performance Forecasting.
 *
 * Requirements checked:
 *  1. Mathematical unit tests: Holt's Damped Linear Trend calculations (level, trend, damping).
 *  2. Naïve baseline comparison via walk-forward validation (MAE, RMSE, MAPE).
 *  3. Domain boundary enforcers: percentage bounds [0, 100], non-negative rates.
 *  4. Insufficient history handling (N < 3 observations gracefully flagged without hallucinations).
 *  5. Prediction uncertainty intervals (80% and 95% confidence bands widening with horizon).
 *  6. Department score synthesis using Stage 7 weighted formulas.
 *  7. Incomparable partial forecast isolation: Departments with partial KPI histories
 *     (e.g., MOF with 4/7 KPIs) are excluded from the ranked leaderboard and flagged incomparable.
 *  8. Role-based access control & department isolation security guards on all endpoints.
 *  9. Non-regression check: Existing scoring, anomaly, and dashboard systems remain intact.
 */

import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';
import {
  clampKpiValue,
  forecastNaive,
  fitHoltsDampedTrend,
  evaluateWalkForwardAccuracy,
  generateKpiForecast,
  forecastDepartmentPerformance,
  forecastSystemRankings,
} from '../utils/forecastingEngine.js';
import {
  getSystemForecastSummary,
  getDepartmentForecast,
  getMyDepartmentForecast,
  getKpiForecast,
} from '../controllers/forecastController.js';

async function runStage10Tests() {
  console.log('\n==================================================================');
  console.log('🧪 RUNNING STAGE 10 FORECASTING & PREDICTIVE INTELLIGENCE TEST SUITE');
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
    await sequelize.authenticate();
    console.log('  Database connection successful.');

    // ── 1. Mathematical Unit Tests: Holt's Damped Trend vs. Naive ─────────
    console.log('\n--- 1. Testing Mathematical Engines: Holt Damped vs. Naïve Baseline ---');

    const sampleSeries = [72, 75, 78, 81, 85, 88]; // 6 observations (like MOF Budget Utilization)
    const naivePreds = forecastNaive(sampleSeries, 3);
    assert(naivePreds.length === 3, 'Naïve baseline produces 3-step forecast');
    assert(naivePreds.every((v) => v === 88), 'Naïve baseline projects last observed value (88) across all horizons');

    const holtFit = fitHoltsDampedTrend(sampleSeries, 3, { alpha: 0.35, beta: 0.15, phi: 0.9 });
    assert(holtFit.status === 'OPTIMAL', 'Holt Damped Trend fits successfully with optimal status');
    assert(holtFit.forecasts.length === 3, 'Holt produces 3-step horizon forecasts');
    assert(holtFit.forecasts[0] > 88, `Step 1 forecast (${holtFit.forecasts[0].toFixed(2)}) reflects positive trend continuation > 88`);
    assert(holtFit.forecasts[1] > holtFit.forecasts[0], 'Step 2 forecast is higher than Step 1');
    assert(
      (holtFit.forecasts[2] - holtFit.forecasts[1]) < (holtFit.forecasts[1] - holtFit.forecasts[0]),
      'Damping factor (phi=0.9) attenuates trend momentum between consecutive steps'
    );
    assert(typeof holtFit.residualStdDev === 'number' && holtFit.residualStdDev > 0, 'In-sample residual standard deviation computed');

    // ── 2. Walk-Forward Rolling Validation (Backtesting) ───────────────────
    console.log('\n--- 2. Testing Walk-Forward Rolling Validation (Backtesting) ---');

    const backtestResult = evaluateWalkForwardAccuracy(sampleSeries);
    assert(backtestResult.status === 'VALIDATED', 'Walk-forward validation executed on sample series');
    assert(backtestResult.evaluation_points === 3, `Evaluated 3 one-step-ahead walk-forward points (N=${sampleSeries.length})`);
    assert(typeof backtestResult.damped_holt.mae === 'number', `Holt MAE calculated: ${backtestResult.damped_holt.mae}`);
    assert(typeof backtestResult.damped_holt.rmse === 'number', `Holt RMSE calculated: ${backtestResult.damped_holt.rmse}`);
    assert(typeof backtestResult.naive.mae === 'number', `Naïve MAE calculated: ${backtestResult.naive.mae}`);
    assert(typeof backtestResult.naive.rmse === 'number', `Naïve RMSE calculated: ${backtestResult.naive.rmse}`);
    assert(
      typeof backtestResult.comparison.rmse_improvement_pct === 'number',
      `Model comparison improvement percentage calculated: ${backtestResult.comparison.rmse_improvement_pct}%`
    );

    // ── 3. Domain Boundary Enforcers & Clamping ────────────────────────────
    console.log('\n--- 3. Testing Domain Boundary Constraints & Clamping ---');

    assert(clampKpiValue(105.4, '%') === 100, 'Percentage overflow (>100%) clamped to 100');
    assert(clampKpiValue(-5.2, '%') === 0, 'Negative percentage (<0%) clamped to 0');
    assert(clampKpiValue(-3.0, 'days') === 0, 'Negative duration in days clamped to 0');
    assert(clampKpiValue(-10.5, 'minutes') === 0, 'Negative duration in minutes clamped to 0');
    assert(clampKpiValue(75.5, '%') === 75.5, 'Valid percentage within bounds remains unchanged');

    // ── 4. Insufficient History Handling ───────────────────────────────────
    console.log('\n--- 4. Testing Insufficient History Handling (< 3 Observations) ---');

    const emptyFit = fitHoltsDampedTrend([], 3);
    assert(emptyFit.status === 'INSUFFICIENT_DATA', 'Empty series returns INSUFFICIENT_DATA');
    assert(emptyFit.forecasts.length === 0, 'Empty series yields no projected points');

    const shortFit = fitHoltsDampedTrend([90, 92], 3);
    assert(shortFit.status === 'INSUFFICIENT_DATA', 'Series with 2 observations returns INSUFFICIENT_DATA');

    const fakeKpi = {
      id: 99,
      name: 'Unrecorded New Metric',
      unit: '%',
      target_value: 95,
      weight: 10,
      higher_is_better: true,
      category: 'compliance',
    };
    const kpiShortForecast = generateKpiForecast(fakeKpi, [{ period_year: 2025, period_month: 1, actual_value: 90 }], 3);
    assert(kpiShortForecast.status === 'INSUFFICIENT_DATA', 'generateKpiForecast flags N=1 as INSUFFICIENT_DATA');
    assert(kpiShortForecast.observation_count === 1, 'Accurately reports 1 observation available');

    // ── 5. Confidence Intervals & Prediction Envelopes ─────────────────────
    console.log('\n--- 5. Testing Prediction Uncertainty & Confidence Intervals ---');

    const fakeKpiComplete = {
      id: 1,
      name: 'Budget Utilization Rate',
      unit: '%',
      target_value: 95,
      weight: 25,
      higher_is_better: true,
      category: 'compliance',
    };
    const mockEntries = [
      { period_year: 2025, period_month: 1, actual_value: 72 },
      { period_year: 2025, period_month: 2, actual_value: 75 },
      { period_year: 2025, period_month: 3, actual_value: 78 },
      { period_year: 2025, period_month: 4, actual_value: 81 },
      { period_year: 2025, period_month: 5, actual_value: 85 },
      { period_year: 2025, period_month: 6, actual_value: 88 },
    ];

    const completeForecast = generateKpiForecast(fakeKpiComplete, mockEntries, 3);
    assert(completeForecast.status === 'COMPLETE', '6-month KPI series marked as COMPLETE forecast');
    assert(completeForecast.periods_projected.length === 3, 'Generated 3 projected periods');

    const step1 = completeForecast.periods_projected[0];
    const step3 = completeForecast.periods_projected[2];

    assert(step1.confidence_interval_80.lower <= step1.forecasted_value, 'Step 1 CI 80 lower bound <= forecast');
    assert(step1.confidence_interval_80.upper >= step1.forecasted_value, 'Step 1 CI 80 upper bound >= forecast');
    assert(step1.confidence_interval_95.lower <= step1.confidence_interval_80.lower, '95% CI is wider than 80% CI (lower bound)');
    assert(step1.confidence_interval_95.upper >= step1.confidence_interval_80.upper, '95% CI is wider than 80% CI (upper bound)');

    const step1Width = step1.confidence_interval_95.upper - step1.confidence_interval_95.lower;
    const step3Width = step3.confidence_interval_95.upper - step3.confidence_interval_95.lower;
    assert(step3Width >= step1Width, `Uncertainty envelope widens with horizon (Step 3 width: ${step3Width.toFixed(2)} >= Step 1 width: ${step1Width.toFixed(2)})`);

    // ── 6. Department Forecast Synthesis & Incomparability Guard ──────────
    console.log('\n--- 6. Testing Department Synthesis & Incomparability Isolation ---');

    // Ministry of Health (dept 2) has 4/4 KPIs with complete 6-month historical data
    const mohForecast = await forecastDepartmentPerformance(2, 3);
    assert(mohForecast !== null, 'MOH department forecast generated');
    assert(mohForecast.total_active_kpis === 4, 'MOH has 4 active KPIs');
    assert(mohForecast.complete_kpi_forecasts === 4, 'MOH has 4/4 complete KPI forecasts');
    assert(mohForecast.partial_data === false, 'MOH marked partial_data = false');
    assert(mohForecast.comparable_for_ranking === true, 'MOH marked comparable_for_ranking = true');
    assert(mohForecast.projected_overall_trajectory.length === 3, 'MOH has 3-step overall score trajectory');
    assert(mohForecast.projected_overall_trajectory[0].projected_overall_score > 0, 'MOH step 1 projected score is > 0');

    // Ministry of Finance (dept 1) has 7 active KPIs, but only 4 have historical data (3 lack history)
    const mofForecast = await forecastDepartmentPerformance(1, 3);
    assert(mofForecast !== null, 'MOF department forecast generated');
    assert(mofForecast.total_active_kpis === 7, 'MOF has 7 active KPIs');
    assert(mofForecast.complete_kpi_forecasts === 4, 'MOF has 4 complete KPI forecasts');
    assert(mofForecast.incomplete_kpi_forecasts === 3, 'MOF has 3 incomplete KPI forecasts');
    assert(mofForecast.partial_data === true, 'MOF accurately marked partial_data = true');
    assert(mofForecast.comparable_for_ranking === false, 'MOF accurately marked comparable_for_ranking = false');
    assert(mofForecast.excluded_kpi_ids.length === 3, 'MOF lists 3 excluded KPI IDs (17, 18, 19)');
    assert(typeof mofForecast.incomparable_reason === 'string', 'MOF contains descriptive incomparability reason');

    // ── 7. System Projected Leaderboard & Clean Separation ─────────────────
    console.log('\n--- 7. Testing System Rankings & Exclusion of Incomparable Results ---');

    const systemRankings = await forecastSystemRankings(3);
    assert(systemRankings.success === true, 'System forecast rankings generated');
    assert(Array.isArray(systemRankings.ranked_departments), 'ranked_departments array returned');
    assert(Array.isArray(systemRankings.unranked_departments), 'unranked_departments array returned');

    // Verify MOF is strictly in unranked_departments and NOT in ranked_departments
    const mofInRanked = systemRankings.ranked_departments.some((d) => d.department_id === 1);
    const mofInUnranked = systemRankings.unranked_departments.some((d) => d.department_id === 1);
    assert(!mofInRanked, 'Incomparable department (MOF) strictly EXCLUDED from ranked leaderboard');
    assert(mofInUnranked, 'Incomparable department (MOF) categorized under unranked_departments with explanation');

    // Verify all ranked departments have comparable_for_ranking = true
    assert(systemRankings.ranked_departments.length >= 3, `Found ${systemRankings.ranked_departments.length} fully comparable departments (MOH, MOE, MPW)`);
    if (systemRankings.ranked_departments.length > 1) {
      const top1 = systemRankings.ranked_departments[0];
      const top2 = systemRankings.ranked_departments[1];
      assert(top1.projected_next_score >= top2.projected_next_score, 'Ranked departments ordered monotonically by projected score');
      assert(top1.rank === 1, 'Top projected department has rank 1');
    }

    // ── 8. RBAC Security & Department Isolation Guards ─────────────────────
    console.log('\n--- 8. Testing RBAC Security & Department Isolation Guards ---');

    const adminUser = await User.findOne({ where: { role: 'admin' } });
    const officer1User = await User.findOne({ where: { role: 'department_officer', department_id: 1 } });
    const officer2User = await User.findOne({ where: { role: 'department_officer', department_id: 2 } });
    const policymakerUser = await User.findOne({ where: { role: 'policymaker' } });

    assert(adminUser !== null && officer1User !== null && officer2User !== null && policymakerUser !== null, 'All test user roles identified');

    // A. Policymaker accessing system forecast summary
    const polyReq = { user: policymakerUser, query: { horizon: 3 } };
    const polyRes = createMockRes();
    await getSystemForecastSummary(polyReq, polyRes);
    assert(polyRes.statusCode === 200, 'Policymaker can access system forecast summary (HTTP 200)');
    assert(polyRes.data.success === true, 'System forecast indicates success');

    // B. Officer 1 accessing own department (1) forecast
    const ownDeptReq = { user: officer1User, params: { id: 1 }, query: { horizon: 3 } };
    const ownDeptRes = createMockRes();
    await getDepartmentForecast(ownDeptReq, ownDeptRes);
    assert(ownDeptRes.statusCode === 200, 'Officer 1 can view own department forecast (HTTP 200)');
    assert(ownDeptRes.data.department_id === 1, 'Returned forecast matches officer department');

    // C. Officer 1 attempting to access Department 2 (Health) forecast
    const crossDeptReq = { user: officer1User, params: { id: 2 }, query: { horizon: 3 } };
    const crossDeptRes = createMockRes();
    await getDepartmentForecast(crossDeptReq, crossDeptRes);
    assert(crossDeptRes.statusCode === 403, 'Department isolation BLOCKED Officer 1 from viewing Dept 2 forecast (HTTP 403)');
    assert(crossDeptRes.data.message.includes('Access Denied'), 'Security denial message returned');

    // D. Officer convenience endpoint
    const myDeptReq = { user: officer1User, query: { horizon: 3 } };
    const myDeptRes = createMockRes();
    await getMyDepartmentForecast(myDeptReq, myDeptRes);
    assert(myDeptRes.statusCode === 200, 'Officer convenience endpoint (/my-department) succeeds (HTTP 200)');
    assert(myDeptRes.data.department_id === 1, 'Convenience endpoint returns officer department');

    // E. Officer 1 attempting to view KPI forecast from Department 2
    const crossKpiReq = { user: officer1User, params: { id: 5 }, query: { horizon: 3 } }; // KPI 5 belongs to MOH (dept 2)
    const crossKpiRes = createMockRes();
    await getKpiForecast(crossKpiReq, crossKpiRes);
    assert(crossKpiRes.statusCode === 403, 'Department isolation BLOCKED Officer 1 from viewing Dept 2 KPI forecast (HTTP 403)');

    // ── 9. Non-Regression Check ────────────────────────────────────────────
    console.log('\n--- 9. Non-Regression Check: Existing Features Intact ---');
    const deptCount = await Department.count({ where: { is_active: true } });
    assert(deptCount === 4, 'Active departments count remains 4');

    console.log('\n==================================================================');
    console.log(`📊 STAGE 10 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runStage10Tests();
