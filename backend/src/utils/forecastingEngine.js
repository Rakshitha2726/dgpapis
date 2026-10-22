/**
 * utils/forecastingEngine.js
 * ---------------------------
 * Stage 10: Predictive Performance Intelligence & Historical Forecasting Engine.
 *
 * Implements:
 *  1. Holt's Linear Exponential Smoothing with Damped Trend (Gardner & McKenzie).
 *  2. Naïve Last-Observed-Value Baseline Model.
 *  3. Walk-Forward Rolling Validation (Backtesting) comparing Holt's vs. Naïve.
 *  4. Prediction Uncertainty Intervals (80% and 95% confidence bands).
 *  5. Domain-specific boundary enforcers (percentage [0, 100], non-negative rates).
 *  6. Minimum observation guards (strict N >= 3 requirement).
 *  7. Department-level score synthesis using Stage 7 weighted formulas.
 *  8. Incomparable partial forecast isolation: Departments with incomplete KPI histories
 *     are explicitly excluded from the ranked leaderboard.
 *
 * ⚠️ EXPERIMENTAL MODEL NOTICE:
 *   Primary historical KPI series contain exactly 6 monthly observations (Jan–Jun 2025).
 *   Forecasts and uncertainty intervals are experimental statistical diagnostic projections.
 *   They do NOT assert definitive predictive accuracy or official government projections.
 */

import { Department, KPI, PerformanceEntry } from '../models/index.js';
import { Op } from 'sequelize';
import { calculateNormalizedKpiScore, calculateWeightedContribution } from './scoreEngine.js';
import { derivePerformanceLabel } from '../models/DepartmentScore.js';

export const MIN_FORECAST_PERIODS = 3;
export const DEFAULT_ALPHA = 0.35; // Level smoothing
export const DEFAULT_BETA  = 0.15; // Trend smoothing
export const DEFAULT_PHI   = 0.90; // Trend damping factor (0 < phi < 1)

export const FORECAST_DISCLAIMER =
  '⚠️ EXPERIMENTAL STATISTICAL PROJECTION: Forecasts are generated using Holt’s Damped Linear Trend model ' +
  'benchmarked against a naïve baseline over 6 monthly historical observations. They represent indicative statistical ' +
  'trajectories under status-quo assumptions and do not constitute verified predictive certainty or official policy targets.';

/**
 * Clamp a predicted numerical value according to KPI domain constraints.
 */
export const clampKpiValue = (value, unit) => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  let clamped = Number(value);
  const normalizedUnit = (unit || '').trim().toLowerCase();

  if (normalizedUnit === '%' || normalizedUnit === 'percent' || normalizedUnit === 'percentage') {
    clamped = Math.max(0, Math.min(100, clamped));
  } else if (normalizedUnit === 'days' || normalizedUnit === 'minutes' || normalizedUnit === 'score') {
    clamped = Math.max(0, clamped);
  }

  return parseFloat(clamped.toFixed(4));
};

/**
 * 1. Naïve Baseline Forecast
 * Projects the last observed value forward across all horizon steps.
 */
export const forecastNaive = (historyValues, horizon = 3) => {
  if (!Array.isArray(historyValues) || historyValues.length === 0) return [];
  const lastVal = Number(historyValues[historyValues.length - 1]);
  return Array.from({ length: horizon }, () => lastVal);
};

/**
 * 2. Holt's Damped Linear Trend Forecasting
 * Computes level (ell) and trend (b) with damping factor phi.
 *
 * @param {number[]} historyValues - Sequential historical values
 * @param {number} horizon - Periods ahead to project (1 to 6)
 * @param {Object} [params] - Model hyper-parameters
 * @returns {Object} Forecast trajectory and in-sample fitted values
 */
export const fitHoltsDampedTrend = (
  historyValues,
  horizon = 3,
  params = {}
) => {
  const values = historyValues.map(Number);
  const n = values.length;

  if (n < MIN_FORECAST_PERIODS) {
    return {
      status: 'INSUFFICIENT_DATA',
      reason: `At least ${MIN_FORECAST_PERIODS} historical observations are required. Found: ${n}.`,
      forecasts: [],
      fitted: [],
      residuals: [],
    };
  }

  const alpha = params.alpha ?? DEFAULT_ALPHA;
  const beta  = params.beta  ?? DEFAULT_BETA;
  const phi   = params.phi   ?? DEFAULT_PHI;

  // Initialize level and trend
  let ell = values[0];
  let b = values[1] - values[0];

  const fitted = [ell];
  const residuals = [0];

  for (let t = 1; t < n; t++) {
    const prevEll = ell;
    const prevB = b;
    const y = values[t];

    const oneStepForecast = prevEll + phi * prevB;
    fitted.push(oneStepForecast);
    residuals.push(y - oneStepForecast);

    ell = alpha * y + (1 - alpha) * (prevEll + phi * prevB);
    b = beta * (ell - prevEll) + (1 - beta) * phi * prevB;
  }

  // Generate future multi-step forecasts
  const forecasts = [];
  let cumPhi = 0;
  for (let h = 1; h <= horizon; h++) {
    cumPhi += Math.pow(phi, h);
    const pred = ell + b * cumPhi;
    forecasts.push(pred);
  }

  // Calculate in-sample residual standard deviation
  const validResiduals = residuals.slice(1);
  const sumSquaredResiduals = validResiduals.reduce((sum, r) => sum + r * r, 0);
  const residualVariance = validResiduals.length > 1
    ? sumSquaredResiduals / (validResiduals.length - 1)
    : 0;
  const residualStdDev = Math.sqrt(residualVariance);

  return {
    status: 'OPTIMAL',
    model: 'Holt Damped Linear Trend',
    parameters: { alpha, beta, phi },
    finalLevel: ell,
    finalTrend: b,
    fitted,
    residuals,
    residualStdDev,
    forecasts,
  };
};

/**
 * 3. Walk-Forward Rolling Validation (Backtesting)
 * Evaluates one-step-ahead prediction accuracy for Holt's vs. Naïve Baseline.
 */
export const evaluateWalkForwardAccuracy = (historyValues, params = {}) => {
  const values = historyValues.map(Number);
  const n = values.length;

  if (n < 4) {
    return {
      status: 'INSUFFICIENT_HISTORY_FOR_BACKTESTING',
      evaluation_points: 0,
      damped_holt: null,
      naive: null,
    };
  }

  const holtErrors = [];
  const naiveErrors = [];
  const actuals = [];

  // Walk forward from minimum training window (3 observations) up to N - 1
  for (let t = MIN_FORECAST_PERIODS; t < n; t++) {
    const trainingSubset = values.slice(0, t);
    const actualNext = values[t];
    actuals.push(actualNext);

    // 1. Holt's one-step prediction
    const holtFit = fitHoltsDampedTrend(trainingSubset, 1, params);
    const holtPred = holtFit.forecasts?.[0] ?? trainingSubset[trainingSubset.length - 1];
    holtErrors.push(holtPred - actualNext);

    // 2. Naïve one-step prediction
    const naivePred = trainingSubset[trainingSubset.length - 1];
    naiveErrors.push(naivePred - actualNext);
  }

  const k = holtErrors.length;
  if (k === 0) {
    return {
      status: 'NO_EVALUATION_POINTS',
      evaluation_points: 0,
      damped_holt: null,
      naive: null,
    };
  }

  const computeMetrics = (errors) => {
    const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / k;
    const mse = errors.reduce((sum, e) => sum + e * e, 0) / k;
    const rmse = Math.sqrt(mse);

    // Safe MAPE
    let mapeSum = 0;
    let mapeCount = 0;
    for (let i = 0; i < k; i++) {
      if (Math.abs(actuals[i]) > 0.0001) {
        mapeSum += (Math.abs(errors[i]) / Math.abs(actuals[i])) * 100;
        mapeCount++;
      }
    }
    const mape = mapeCount > 0 ? mapeSum / mapeCount : 0;

    return {
      mae: parseFloat(mae.toFixed(4)),
      rmse: parseFloat(rmse.toFixed(4)),
      mape: parseFloat(mape.toFixed(2)),
    };
  };

  const holtMetrics = computeMetrics(holtErrors);
  const naiveMetrics = computeMetrics(naiveErrors);

  // Compute improvement percentage over baseline (positive = Holt is better)
  const rmseImprovementPct = naiveMetrics.rmse > 0
    ? parseFloat((((naiveMetrics.rmse - holtMetrics.rmse) / naiveMetrics.rmse) * 100).toFixed(2))
    : 0;

  const maeImprovementPct = naiveMetrics.mae > 0
    ? parseFloat((((naiveMetrics.mae - holtMetrics.mae) / naiveMetrics.mae) * 100).toFixed(2))
    : 0;

  return {
    status: 'VALIDATED',
    evaluation_points: k,
    damped_holt: holtMetrics,
    naive: naiveMetrics,
    comparison: {
      rmse_improvement_pct: rmseImprovementPct,
      mae_improvement_pct: maeImprovementPct,
      superior_model: holtMetrics.rmse <= naiveMetrics.rmse ? 'HOLT_DAMPED' : 'NAIVE_BASELINE',
    },
  };
};

/**
 * 4. Comprehensive KPI Forecast Generator
 * Combines forecasting, uncertainty intervals, domain clamping, and validation benchmarks.
 */
export const generateKpiForecast = (kpi, entries, horizon = 3, params = {}) => {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.period_year !== b.period_year) return a.period_year - b.period_year;
    return a.period_month - b.period_month;
  });

  const historyValues = sortedEntries.map((e) => Number(e.actual_value));
  const observationCount = historyValues.length;

  if (observationCount < MIN_FORECAST_PERIODS) {
    return {
      kpi_id: kpi.id,
      kpi_name: kpi.name,
      unit: kpi.unit,
      target_value: Number(kpi.target_value),
      weight: Number(kpi.weight),
      higher_is_better: kpi.higher_is_better,
      category: kpi.category,
      status: 'INSUFFICIENT_DATA',
      observation_count: observationCount,
      min_required: MIN_FORECAST_PERIODS,
      reason: `At least ${MIN_FORECAST_PERIODS} historical monthly observations required. Only ${observationCount} available.`,
      periods_projected: [],
      validation_benchmark: null,
    };
  }

  // Fit model
  const fitResult = fitHoltsDampedTrend(historyValues, horizon, params);
  const naiveProjections = forecastNaive(historyValues, horizon);
  const validationBenchmark = evaluateWalkForwardAccuracy(historyValues, params);

  // Establish base period for future horizon naming
  const lastEntry = sortedEntries[sortedEntries.length - 1];
  let currentYear = lastEntry.period_year;
  let currentMonth = lastEntry.period_month;

  const phi = params.phi ?? DEFAULT_PHI;
  const stdDev = Math.max(fitResult.residualStdDev || 0, 0.05); // Minimum variance floor

  const periodsProjected = [];

  for (let h = 1; h <= horizon; h++) {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }

    const rawForecast = fitResult.forecasts[h - 1];
    const clampedForecast = clampKpiValue(rawForecast, kpi.unit);
    const naiveVal = clampKpiValue(naiveProjections[h - 1], kpi.unit);

    // Horizon-dependent uncertainty expansion
    let sumPhiPow = 0;
    for (let j = 1; j < h; j++) {
      sumPhiPow += Math.pow(phi, 2 * j);
    }
    const horizonStdDev = stdDev * Math.sqrt(1 + sumPhiPow);

    // 80% CI (z = 1.28) and 95% CI (z = 1.96)
    const ci80_margin = 1.28 * horizonStdDev;
    const ci95_margin = 1.96 * horizonStdDev;

    const lower80 = clampKpiValue(rawForecast - ci80_margin, kpi.unit);
    const upper80 = clampKpiValue(rawForecast + ci80_margin, kpi.unit);
    const lower95 = clampKpiValue(rawForecast - ci95_margin, kpi.unit);
    const upper95 = clampKpiValue(rawForecast + ci95_margin, kpi.unit);

    // Projected normalized KPI score
    const target = Number(kpi.target_value);
    const projectedScore = calculateNormalizedKpiScore(clampedForecast, target, kpi.higher_is_better);
    const weightedContribution = calculateWeightedContribution(projectedScore, Number(kpi.weight));

    // Target attainment classification
    let targetStatus = 'ON_TRACK';
    if (projectedScore < 75) {
      targetStatus = 'OFF_TRACK';
    } else if (projectedScore < 90) {
      targetStatus = 'AT_RISK';
    }

    periodsProjected.push({
      step: h,
      projected_year: currentYear,
      projected_month: currentMonth,
      period_label: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      forecasted_value: clampedForecast,
      naive_baseline_value: naiveVal,
      confidence_interval_80: { lower: lower80, upper: upper80 },
      confidence_interval_95: { lower: lower95, upper: upper95 },
      projected_normalized_score: projectedScore,
      projected_weighted_contribution: weightedContribution,
      target_benchmark: target,
      target_status: targetStatus,
    });
  }

  // Trajectory direction over horizon
  const firstVal = historyValues[historyValues.length - 1];
  const lastProjected = periodsProjected[periodsProjected.length - 1].forecasted_value;
  const delta = lastProjected - firstVal;
  let trajectory = 'STABLE';
  if (Math.abs(delta) > 0.5) {
    trajectory = delta > 0 ? 'UPWARD' : 'DOWNWARD';
  }

  return {
    kpi_id: kpi.id,
    kpi_name: kpi.name,
    unit: kpi.unit,
    target_value: Number(kpi.target_value),
    weight: Number(kpi.weight),
    higher_is_better: kpi.higher_is_better,
    category: kpi.category,
    status: 'COMPLETE',
    observation_count: observationCount,
    last_observed_value: firstVal,
    trajectory,
    model_applied: 'Holt Damped Linear Trend (phi=0.90)',
    validation_benchmark: validationBenchmark,
    periods_projected: periodsProjected,
  };
};

/**
 * 5. Synthesize Department-Level Forecast
 * Evaluates all active KPIs in a department and aggregates overall projected scores.
 *
 * Enforces requirement:
 * Departments with partial KPI histories are clearly labeled as `partial_data: true`
 * and flagged as `comparable_for_ranking: false` so they are not ranked alongside complete departments.
 */
export const forecastDepartmentPerformance = async (departmentId, horizon = 3, params = {}) => {
  const department = await Department.findByPk(departmentId);
  if (!department) return null;

  const activeKpis = await KPI.findAll({
    where: { department_id: departmentId, is_active: true },
    order: [['name', 'ASC']],
  });

  const kpiForecasts = [];
  let completeKpiCount = 0;
  let incompleteKpiCount = 0;
  const excludedKpiIds = [];

  for (const kpi of activeKpis) {
    const entries = await PerformanceEntry.findAll({
      where: {
        department_id: departmentId,
        kpi_id: kpi.id,
        status: ['submitted', 'approved'],
      },
      order: [
        ['period_year', 'ASC'],
        ['period_month', 'ASC'],
      ],
    });

    const forecast = generateKpiForecast(kpi, entries, horizon, params);
    kpiForecasts.push(forecast);

    if (forecast.status === 'COMPLETE') {
      completeKpiCount++;
    } else {
      incompleteKpiCount++;
      excludedKpiIds.push(kpi.id);
    }
  }

  const isComplete = activeKpis.length > 0 && incompleteKpiCount === 0;
  const isComparable = isComplete; // Strict ranking comparability rule

  // Aggregate department score trajectory per projected horizon step
  const projectedSteps = [];
  for (let h = 0; h < horizon; h++) {
    let sumContribution = 0;
    let evaluatedWeight = 0;

    let periodLabel = null;
    let projYear = null;
    let projMonth = null;

    for (const kf of kpiForecasts) {
      if (kf.status === 'COMPLETE' && kf.periods_projected?.[h]) {
        const stepData = kf.periods_projected[h];
        sumContribution += stepData.projected_weighted_contribution;
        evaluatedWeight += kf.weight;
        periodLabel = stepData.period_label;
        projYear = stepData.projected_year;
        projMonth = stepData.projected_month;
      }
    }

    // Re-scale if partial data, but retain comparability flag
    const projectedOverallScore = evaluatedWeight > 0
      ? parseFloat(((sumContribution / (isComplete ? 100 : evaluatedWeight)) * (isComplete ? 1 : 100)).toFixed(2))
      : 0;

    const projectedLabel = isComplete ? derivePerformanceLabel(projectedOverallScore) : 'Incomplete History';

    projectedSteps.push({
      step: h + 1,
      period_label: periodLabel,
      projected_year: projYear,
      projected_month: projMonth,
      projected_overall_score: projectedOverallScore,
      projected_performance_label: projectedLabel,
      evaluated_active_weight: evaluatedWeight,
      is_complete_evaluation: isComplete,
    });
  }

  return {
    department_id: department.id,
    department_name: department.name,
    department_code: department.code,
    total_active_kpis: activeKpis.length,
    complete_kpi_forecasts: completeKpiCount,
    incomplete_kpi_forecasts: incompleteKpiCount,
    partial_data: !isComplete,
    comparable_for_ranking: isComparable,
    incomparable_reason: isComparable
      ? null
      : `Department has ${incompleteKpiCount} active KPI(s) with fewer than ${MIN_FORECAST_PERIODS} historical monthly observations. Incomparable for official projected leaderboard ranking.`,
    excluded_kpi_ids: excludedKpiIds,
    kpi_forecasts: kpiForecasts,
    projected_overall_trajectory: projectedSteps,
    disclaimer: FORECAST_DISCLAIMER,
  };
};

/**
 * 6. System-Wide Forecasting & Projected Leaderboard
 * Ranks ONLY departments with complete forecasts.
 * Partials are separated into unranked_projected_departments.
 */
export const forecastSystemRankings = async (horizon = 3, params = {}) => {
  const departments = await Department.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']],
  });

  const departmentForecasts = [];
  for (const dept of departments) {
    const deptForecast = await forecastDepartmentPerformance(dept.id, horizon, params);
    if (deptForecast) {
      departmentForecasts.push(deptForecast);
    }
  }

  // 1. Separate into comparable vs incomparable
  const comparableDepts = departmentForecasts.filter((df) => df.comparable_for_ranking === true);
  const incomparableDepts = departmentForecasts.filter((df) => df.comparable_for_ranking === false);

  // 2. Rank comparable departments based on step 1 (immediate next period) projected overall score
  comparableDepts.sort((a, b) => {
    const scoreA = a.projected_overall_trajectory[0]?.projected_overall_score ?? 0;
    const scoreB = b.projected_overall_trajectory[0]?.projected_overall_score ?? 0;
    return scoreB - scoreA;
  });

  let currentRank = 1;
  const rankedDepartments = comparableDepts.map((d, idx) => {
    if (idx > 0) {
      const prevScore = comparableDepts[idx - 1].projected_overall_trajectory[0]?.projected_overall_score;
      const thisScore = d.projected_overall_trajectory[0]?.projected_overall_score;
      if (thisScore < prevScore) {
        currentRank = idx + 1;
      }
    }
    return {
      rank: currentRank,
      department_id: d.department_id,
      department_name: d.department_name,
      department_code: d.department_code,
      projected_next_score: d.projected_overall_trajectory[0]?.projected_overall_score,
      projected_next_label: d.projected_overall_trajectory[0]?.projected_performance_label,
      projected_trajectory_summary: d.projected_overall_trajectory,
    };
  });

  const unrankedDepartments = incomparableDepts.map((d) => ({
    department_id: d.department_id,
    department_name: d.department_name,
    department_code: d.department_code,
    reason: d.incomparable_reason,
    excluded_kpi_ids: d.excluded_kpi_ids,
    complete_kpis: d.complete_kpi_forecasts,
    total_active_kpis: d.total_active_kpis,
    partial_trajectory: d.projected_overall_trajectory,
  }));

  // Aggregated model benchmark across all complete KPIs
  const allKpiBenchmarks = [];
  for (const df of departmentForecasts) {
    for (const kf of df.kpi_forecasts) {
      if (kf.status === 'COMPLETE' && kf.validation_benchmark?.status === 'VALIDATED') {
        allKpiBenchmarks.push(kf.validation_benchmark);
      }
    }
  }

  const avgHoltRmse = allKpiBenchmarks.length > 0
    ? parseFloat((allKpiBenchmarks.reduce((s, b) => s + b.damped_holt.rmse, 0) / allKpiBenchmarks.length).toFixed(3))
    : 0;
  const avgNaiveRmse = allKpiBenchmarks.length > 0
    ? parseFloat((allKpiBenchmarks.reduce((s, b) => s + b.naive.rmse, 0) / allKpiBenchmarks.length).toFixed(3))
    : 0;

  const avgImprovement = avgNaiveRmse > 0
    ? parseFloat((((avgNaiveRmse - avgHoltRmse) / avgNaiveRmse) * 100).toFixed(2))
    : 0;

  return {
    success: true,
    horizon_periods: horizon,
    total_departments_evaluated: departmentForecasts.length,
    ranked_departments_count: rankedDepartments.length,
    unranked_departments_count: unrankedDepartments.length,
    ranked_departments: rankedDepartments,
    unranked_departments: unrankedDepartments,
    model_validation_summary: {
      evaluated_kpi_series_count: allKpiBenchmarks.length,
      average_holt_damped_rmse: avgHoltRmse,
      average_naive_baseline_rmse: avgNaiveRmse,
      net_model_improvement_pct: avgImprovement,
      superior_model: avgHoltRmse <= avgNaiveRmse ? 'HOLT_DAMPED_TREND' : 'NAIVE_BASELINE',
    },
    disclaimer: FORECAST_DISCLAIMER,
  };
};

// Helper to fetch a single‑step forecast for a KPI (used by report generation)
export const forecastKpi = async (kpiId, year, month) => {
  // Load KPI definition
  const kpi = await KPI.findByPk(kpiId);
  if (!kpi) return null;

  // Gather historical entries up to the requested period (inclusive)
  const entries = await PerformanceEntry.findAll({
    where: {
      kpi_id: kpiId,
      status: { [Op.in]: ['submitted', 'approved'] },
      [Op.or]: [
        { period_year: { [Op.lt]: year } },
        {
          period_year: year,
          period_month: { [Op.lte]: month },
        },
      ],
    },
    order: [
      ['period_year', 'ASC'],
      ['period_month', 'ASC'],
    ],
  });

  // Generate a one‑step‑ahead forecast (horizon = 1)
  const result = await generateKpiForecast(kpi, entries, 1);
  if (!result) return null;

  // Compute residual standard deviation directly from Holt fit for CI calculation
  const historyValues = entries.map((e) => Number(e.actual_value));
  const fit = fitHoltsDampedTrend(historyValues, 1);

  return {
    status: result.status,
    forecasts: result.periods_projected?.length ? [result.periods_projected[0].forecasted_value] : [],
    residualStdDev: fit.residualStdDev || 0,
  };
};
