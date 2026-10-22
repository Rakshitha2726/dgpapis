/**
 * utils/anomalyDetector.js
 * ------------------------
 * Automated Anomaly Detection and Data Quality Validation Engine (Stage 9).
 *
 * Provides explainable statistical anomaly detection and comprehensive
 * data-quality checks across government department KPI submissions.
 *
 * ─── 1. Robust Statistical Method: Median & Median Absolute Deviation (MAD) ───
 *
 *  Given historical observations X = [x_1, x_2, ..., x_n] for a department's KPI
 *  from prior submitted or approved periods:
 *
 *    1. Median: M = median(X)
 *    2. Absolute Deviations: D_i = |x_i - M|
 *    3. Median Absolute Deviation: MAD = median(D)
 *    4. Modified Z-Score (Boris Iglewicz & David Hoaglin standard):
 *         M_z = (0.6745 * |x_observed - M|) / MAD
 *       (0.6745 is the scale factor matching MAD to standard deviation for normal data)
 *
 * ─── 2. Thresholds & Minimum History Requirements ─────────────────────────────
 *
 *  - MIN_HISTORICAL_PERIODS = 3 (Minimum 3 prior submitted/approved periods required)
 *  - Detection Thresholds:
 *      * HIGH Severity:   M_z >= 3.5  (or >= 40% sudden shift when MAD == 0)
 *      * MEDIUM Severity: 2.5 <= M_z < 3.5 (or 20% - 40% shift when MAD == 0)
 *      * NORMAL:          M_z < 2.5
 *
 * ─── 3. Zero Variance & Edge Cases ─────────────────────────────────────────────
 *
 *  - Zero Variance (MAD == 0, e.g. [90, 90, 90]):
 *      If observed == M -> M_z = 0 (Normal).
 *      If observed != M -> Evaluate relative percentage difference |x - M| / M.
 *  - Insufficient History (< 3 periods):
 *      Logged as INSUFFICIENT_HISTORY metadata; no false positive alert is generated.
 *  - Missing Historical Periods:
 *      Gaps between periods are preserved chronologically; no synthetic zeroes are fabricated.
 *  - Contextual Fairness:
 *      A low score is NOT an anomaly solely because it is low. Anomalies represent
 *      statistical deviations from the department's own historical baseline.
 *
 * ─── 4. Non-Fraud Disclaimer ──────────────────────────────────────────────────
 *  Statistical alerts are quality-assurance indicators suggesting human verification,
 *  NOT proof of misconduct or fraud.
 */

import { Op } from 'sequelize';
import { Department, KPI, PerformanceEntry } from '../models/index.js';

// Documented Constants
export const MIN_HISTORICAL_PERIODS = 3;
export const SEVERITY_LEVELS = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

export const CHECK_TYPES = Object.freeze({
  HISTORICAL_ANOMALY: 'HISTORICAL_ANOMALY',
  DATA_QUALITY_RULE:  'DATA_QUALITY_RULE',
  COMPLETENESS:       'COMPLETENESS',
});

export const ALERT_CODES = Object.freeze({
  STATISTICAL_OUTLIER:        'STATISTICAL_OUTLIER',
  PERCENTAGE_BOUND_EXCEEDED:  'PERCENTAGE_BOUND_EXCEEDED',
  UNREALISTIC_SCALE_TARGET:   'UNREALISTIC_SCALE_TARGET',
  NEGATIVE_VALUE_DISALLOWED:  'NEGATIVE_VALUE_DISALLOWED',
  NON_NUMERIC_VALUE:          'NON_NUMERIC_VALUE',
  MISSING_PERIOD_SUBMISSION:  'MISSING_PERIOD_SUBMISSION',
});

/**
 * Calculate the median of a numerical array.
 * @param {number[]} values
 * @returns {number|null}
 */
export const calculateMedian = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].map(Number).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(4));
};

/**
 * Calculate Median Absolute Deviation (MAD).
 * @param {number[]} values
 * @param {number} median
 * @returns {number}
 */
export const calculateMAD = (values, median) => {
  if (!Array.isArray(values) || values.length === 0 || median === null) return 0;
  const deviations = values.map((v) => Math.abs(Number(v) - median));
  return calculateMedian(deviations) || 0;
};

/**
 * Compute the Modified Z-Score using MAD.
 * Handles zero variance (MAD == 0) safely without division by zero.
 *
 * @param {number} observedValue
 * @param {number} median
 * @param {number} mad
 * @returns {{ modifiedZScore: number, isZeroVariance: boolean, percentageShift: number|null }}
 */
export const computeModifiedZScore = (observedValue, median, mad) => {
  const diff = Math.abs(observedValue - median);

  // Case 1: Identical to median -> zero deviation
  if (diff === 0) {
    return { modifiedZScore: 0, isZeroVariance: mad === 0, percentageShift: 0 };
  }

  // Case 2: Zero variance (MAD == 0) but observed value differs
  if (mad === 0) {
    const percentageShift = median !== 0
      ? (diff / Math.abs(median)) * 100
      : diff * 100;

    // Map percentage shift to synthetic Z-score equivalents for severity classification
    let syntheticZ = 0;
    if (percentageShift >= 40) {
      syntheticZ = 4.0; // High
    } else if (percentageShift >= 20) {
      syntheticZ = 2.8; // Medium
    } else {
      syntheticZ = 1.5; // Within reasonable variation
    }

    return {
      modifiedZScore: parseFloat(syntheticZ.toFixed(2)),
      isZeroVariance: true,
      percentageShift: parseFloat(percentageShift.toFixed(2)),
    };
  }

  // Case 3: Standard MAD non-zero variance
  // Standard factor 0.6745 relates MAD to standard deviation of a normal distribution
  const modifiedZScore = (0.6745 * diff) / mad;
  const percentageShift = median !== 0
    ? (diff / Math.abs(median)) * 100
    : null;

  return {
    modifiedZScore: parseFloat(modifiedZScore.toFixed(2)),
    isZeroVariance: false,
    percentageShift: percentageShift !== null ? parseFloat(percentageShift.toFixed(2)) : null,
  };
};

/**
 * Perform Data Quality Checks on a single performance entry.
 * Validates domain rules, bounds, and schema constraints.
 *
 * @param {Object} entry - PerformanceEntry record or object
 * @param {Object} kpi - KPI record
 * @param {Object} department - Department record
 * @returns {Array<Object>} List of quality rule alerts (empty if clean)
 */
export const checkEntryDataQuality = (entry, kpi, department) => {
  const alerts = [];
  if (!entry || !kpi || !department) return alerts;

  const rawVal = entry.actual_value;
  const numVal = Number(rawVal);

  // 1. Non-numeric or invalid decimal
  if (!Number.isFinite(numVal) || isNaN(numVal)) {
    alerts.push({
      id: `dq_nan_${department.id}_${kpi.id}_${entry.period_year}_${entry.period_month}`,
      check_type: CHECK_TYPES.DATA_QUALITY_RULE,
      code: ALERT_CODES.NON_NUMERIC_VALUE,
      severity: SEVERITY_LEVELS.HIGH,
      department_id: department.id,
      department_name: department.name,
      department_code: department.code,
      kpi_id: kpi.id,
      kpi_name: kpi.name,
      kpi_unit: kpi.unit,
      period_year: entry.period_year,
      period_month: entry.period_month,
      observed_value: rawVal,
      benchmark_target: parseFloat(kpi.target_value),
      historical_baseline: null,
      direction: null,
      explanation: `Observed value '${rawVal}' is not a valid finite number.`,
      suggested_action: 'Re-enter or correct the numerical actual value with valid decimal precision.',
      status: entry.status,
    });
    return alerts; // Stop further numeric checks on NaN
  }

  // 2. Negative Value Check (KPI targets are >= 0)
  if (numVal < 0) {
    alerts.push({
      id: `dq_neg_${department.id}_${kpi.id}_${entry.period_year}_${entry.period_month}`,
      check_type: CHECK_TYPES.DATA_QUALITY_RULE,
      code: ALERT_CODES.NEGATIVE_VALUE_DISALLOWED,
      severity: SEVERITY_LEVELS.HIGH,
      department_id: department.id,
      department_name: department.name,
      department_code: department.code,
      kpi_id: kpi.id,
      kpi_name: kpi.name,
      kpi_unit: kpi.unit,
      period_year: entry.period_year,
      period_month: entry.period_month,
      observed_value: numVal,
      benchmark_target: parseFloat(kpi.target_value),
      historical_baseline: null,
      direction: 'PLUMMET',
      explanation: `Negative actual value (${numVal}) reported for metric with non-negative target benchmark (${kpi.target_value} ${kpi.unit}).`,
      suggested_action: 'Verify if the minus sign was entered accidentally during data entry.',
      status: entry.status,
    });
  }

  // 3. Percentage Upper Bounds Check
  if (kpi.unit === '%' && numVal > 100) {
    alerts.push({
      id: `dq_pct_${department.id}_${kpi.id}_${entry.period_year}_${entry.period_month}`,
      check_type: CHECK_TYPES.DATA_QUALITY_RULE,
      code: ALERT_CODES.PERCENTAGE_BOUND_EXCEEDED,
      severity: SEVERITY_LEVELS.HIGH,
      department_id: department.id,
      department_name: department.name,
      department_code: department.code,
      kpi_id: kpi.id,
      kpi_name: kpi.name,
      kpi_unit: kpi.unit,
      period_year: entry.period_year,
      period_month: entry.period_month,
      observed_value: numVal,
      benchmark_target: parseFloat(kpi.target_value),
      historical_baseline: null,
      direction: 'SURGE',
      explanation: `Reported percentage value (${numVal}%) exceeds maximum theoretical limit of 100% for metric '${kpi.name}'.`,
      suggested_action: 'Check whether a raw count was entered instead of a percentage, or if a decimal was misplaced.',
      status: entry.status,
    });
  }

  // 4. Unrealistic Scale Check (Value > 500% of Target Benchmark for non-percentage metrics)
  const target = parseFloat(kpi.target_value);
  if (kpi.unit !== '%' && target > 0 && numVal > target * 5) {
    alerts.push({
      id: `dq_scale_${department.id}_${kpi.id}_${entry.period_year}_${entry.period_month}`,
      check_type: CHECK_TYPES.DATA_QUALITY_RULE,
      code: ALERT_CODES.UNREALISTIC_SCALE_TARGET,
      severity: SEVERITY_LEVELS.MEDIUM,
      department_id: department.id,
      department_name: department.name,
      department_code: department.code,
      kpi_id: kpi.id,
      kpi_name: kpi.name,
      kpi_unit: kpi.unit,
      period_year: entry.period_year,
      period_month: entry.period_month,
      observed_value: numVal,
      benchmark_target: target,
      historical_baseline: null,
      direction: 'SURGE',
      explanation: `Observed value (${numVal} ${kpi.unit}) is more than 5x the target benchmark (${target} ${kpi.unit}), indicating a potential scale or unit mismatch.`,
      suggested_action: 'Confirm measurement unit (e.g. thousands vs units, hours vs days) with the submitting officer.',
      status: entry.status,
    });
  }

  return alerts;
};

/**
 * Perform Historical Anomaly Detection for a single KPI entry against its past submissions.
 *
 * @param {Object} currentEntry - Current period's PerformanceEntry
 * @param {Array<Object>} historicalEntries - Prior submitted/approved PerformanceEntry records
 * @param {Object} kpi - KPI record
 * @param {Object} department - Department record
 * @returns {Object|null} Alert object if anomalous; null if normal or insufficient history
 */
export const checkHistoricalAnomaly = (currentEntry, historicalEntries, kpi, department) => {
  if (!currentEntry || !kpi || !department) return null;

  // Filter valid numerical historical actuals
  const validHistory = (historicalEntries || [])
    .map((e) => Number(e.actual_value))
    .filter((v) => Number.isFinite(v));

  // Check minimum history requirement
  if (validHistory.length < MIN_HISTORICAL_PERIODS) {
    return null; // Gracefully skip when history is below statistical minimum
  }

  const observed = Number(currentEntry.actual_value);
  if (!Number.isFinite(observed)) return null;

  const median = calculateMedian(validHistory);
  const mad = calculateMAD(validHistory, median);
  const { modifiedZScore, isZeroVariance, percentageShift } = computeModifiedZScore(observed, median, mad);

  // Classification thresholds
  let severity = null;
  if (modifiedZScore >= 3.5) {
    severity = SEVERITY_LEVELS.HIGH;
  } else if (modifiedZScore >= 2.5) {
    severity = SEVERITY_LEVELS.MEDIUM;
  }

  if (!severity) {
    return null; // Normal variation
  }

  const isSurge = observed > median;
  const direction = isSurge ? 'SURGE' : 'PLUMMET';
  const directionText = isSurge ? 'surge above' : 'drop below';

  let explanation = '';
  if (isZeroVariance) {
    explanation = `Observed value (${observed} ${kpi.unit}) represents a ${percentageShift}% ${directionText} the uniform historical baseline (median: ${median} ${kpi.unit}, n=${validHistory.length} periods, zero variance).`;
  } else {
    explanation = `Observed value (${observed} ${kpi.unit}) represents a statistically significant ${directionText} historical median (${median} ${kpi.unit}) with Modified Z-Score = ${modifiedZScore} (MAD: ${mad}, n=${validHistory.length} periods).`;
  }

  const suggestedAction = isSurge
    ? 'Verify whether sudden operational surge or achievement is documented and supported by departmental evidence.'
    : 'Consult with department officer to confirm whether this reflects operational delays or a data transcription oversight.';

  return {
    id: `ha_${department.id}_${kpi.id}_${currentEntry.period_year}_${currentEntry.period_month}`,
    check_type: CHECK_TYPES.HISTORICAL_ANOMALY,
    code: ALERT_CODES.STATISTICAL_OUTLIER,
    severity,
    department_id: department.id,
    department_name: department.name,
    department_code: department.code,
    kpi_id: kpi.id,
    kpi_name: kpi.name,
    kpi_unit: kpi.unit,
    period_year: currentEntry.period_year,
    period_month: currentEntry.period_month,
    observed_value: observed,
    benchmark_target: parseFloat(kpi.target_value),
    historical_baseline: {
      median,
      mad,
      sample_size: validHistory.length,
      modified_z_score: modifiedZScore,
      is_zero_variance: isZeroVariance,
      percentage_shift: percentageShift,
    },
    direction,
    explanation,
    suggested_action: suggestedAction,
    status: currentEntry.status,
  };
};

/**
 * Run full anomaly detection and data quality validation for a given reporting period.
 *
 * @param {Object} options
 * @param {number} [options.departmentId] - Optional department ID filter
 * @param {number} options.periodYear - Reporting year
 * @param {number} options.periodMonth - Reporting month
 * @returns {Promise<Object>} Aggregated results with metadata, quality score, and structured alerts
 */
export const runPeriodDataQualityValidation = async ({ departmentId, periodYear, periodMonth }) => {
  const targetYear = Number(periodYear);
  const targetMonth = Number(periodMonth);

  // 1. Fetch active departments
  const deptWhere = { is_active: true };
  if (departmentId) {
    deptWhere.id = departmentId;
  }
  const departments = await Department.findAll({
    where: deptWhere,
    order: [['name', 'ASC']],
  });

  const alerts = [];
  let totalActiveKpisChecked = 0;
  let totalSubmissionsChecked = 0;
  let cleanSubmissionsCount = 0;
  let insufficientHistoryCount = 0;

  for (const dept of departments) {
    // Active KPIs for this department
    const activeKpis = await KPI.findAll({
      where: { department_id: dept.id, is_active: true },
      order: [['id', 'ASC']],
    });

    totalActiveKpisChecked += activeKpis.length;

    // Fetch all submissions for this department for the target period
    const currentEntries = await PerformanceEntry.findAll({
      where: {
        department_id: dept.id,
        period_year: targetYear,
        period_month: targetMonth,
      },
    });

    const entryByKpi = {};
    for (const entry of currentEntries) {
      entryByKpi[entry.kpi_id] = entry;
    }

    // Evaluate each KPI
    for (const kpi of activeKpis) {
      const entry = entryByKpi[kpi.id];

      // Completeness check
      if (!entry || entry.status === 'draft') {
        alerts.push({
          id: `comp_missing_${dept.id}_${kpi.id}_${targetYear}_${targetMonth}`,
          check_type: CHECK_TYPES.COMPLETENESS,
          code: ALERT_CODES.MISSING_PERIOD_SUBMISSION,
          severity: SEVERITY_LEVELS.MEDIUM,
          department_id: dept.id,
          department_name: dept.name,
          department_code: dept.code,
          kpi_id: kpi.id,
          kpi_name: kpi.name,
          kpi_unit: kpi.unit,
          period_year: targetYear,
          period_month: targetMonth,
          observed_value: entry ? Number(entry.actual_value) : null,
          benchmark_target: parseFloat(kpi.target_value),
          historical_baseline: null,
          direction: null,
          explanation: entry
            ? `Submission for KPI '${kpi.name}' is currently in draft status and not yet finalized for evaluation.`
            : `No performance entry submitted for active KPI '${kpi.name}' in reporting period ${targetYear}-${String(targetMonth).padStart(2, '0')}.`,
          suggested_action: 'Notify Department Officer to finalize and submit performance data for this period.',
          status: entry ? entry.status : 'missing',
        });
        continue;
      }

      totalSubmissionsChecked++;
      let entryHasAlerts = false;

      // 1. Data Quality Rule Checks (bounds, types)
      const dqAlerts = checkEntryDataQuality(entry, kpi, dept);
      if (dqAlerts.length > 0) {
        alerts.push(...dqAlerts);
        entryHasAlerts = true;
      }

      // 2. Fetch historical submitted/approved entries prior to this period
      // Excludes current period, only looks at finalized records
      const priorEntries = await PerformanceEntry.findAll({
        where: {
          department_id: dept.id,
          kpi_id: kpi.id,
          status: { [Op.in]: ['submitted', 'approved'] },
          [Op.or]: [
            { period_year: { [Op.lt]: targetYear } },
            {
              period_year: targetYear,
              period_month: { [Op.lt]: targetMonth },
            },
          ],
        },
        order: [
          ['period_year', 'ASC'],
          ['period_month', 'ASC'],
        ],
      });

      if (priorEntries.length < MIN_HISTORICAL_PERIODS) {
        insufficientHistoryCount++;
      }

      // 3. Historical Anomaly Detection
      const haAlert = checkHistoricalAnomaly(entry, priorEntries, kpi, dept);
      if (haAlert) {
        alerts.push(haAlert);
        entryHasAlerts = true;
      }

      if (!entryHasAlerts) {
        cleanSubmissionsCount++;
      }
    }
  }

  // Summary statistics
  const highSeverityCount = alerts.filter((a) => a.severity === SEVERITY_LEVELS.HIGH).length;
  const mediumSeverityCount = alerts.filter((a) => a.severity === SEVERITY_LEVELS.MEDIUM).length;
  const affectedDeptIds = new Set(alerts.map((a) => a.department_id));

  const totalEvaluated = totalSubmissionsChecked;
  const dataQualityScore = totalEvaluated > 0
    ? parseFloat(((cleanSubmissionsCount / totalEvaluated) * 100).toFixed(1))
    : null;

  return {
    period_year: targetYear,
    period_month: targetMonth,
    summary: {
      total_alerts: alerts.length,
      high_severity_count: highSeverityCount,
      medium_severity_count: mediumSeverityCount,
      affected_departments_count: affectedDeptIds.size,
      total_active_kpis: totalActiveKpisChecked,
      total_submissions_evaluated: totalSubmissionsChecked,
      clean_submissions_count: cleanSubmissionsCount,
      data_integrity_score: dataQualityScore,
      insufficient_history_kpis: insufficientHistoryCount,
      min_history_requirement: MIN_HISTORICAL_PERIODS,
    },
    alerts,
    disclaimer: '⚠️ Automated anomaly and quality alerts are statistical diagnostic indicators to guide verification. They do NOT constitute evidence of wrongdoing or fraud.',
  };
};

/**
 * Helper used by report generation to fetch anomaly warnings for a department/period.
 * Returns an array of human‑readable strings (explanations) extracted from the alerts
 * produced by `runPeriodDataQualityValidation`.
 */
export const detectAnomaliesForDepartment = async (departmentId, year, month) => {
  const result = await runPeriodDataQualityValidation({
    departmentId,
    periodYear: year,
    periodMonth: month,
  });
  if (!result || !Array.isArray(result.alerts)) return [];
  return result.alerts.map((a) => a.explanation || a.code);
};
