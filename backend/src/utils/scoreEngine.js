/**
 * utils/scoreEngine.js
 * --------------------
 * Core scoring logic for the DGPAPIS Performance Score Calculation Engine.
 *
 * ⚠️  ILLUSTRATIVE PROJECT VALUES:
 *   All scoring formulas, weight distributions, and performance thresholds are
 *   illustrative values from the research paper design. They are NOT official
 *   government standards or policies.
 *
 * ─── KPI Score Formula ───────────────────────────────────────────────────────
 *
 *   if KPI.higher_is_better:
 *     raw_kpi_score = (actual_value / target_value) × 100
 *   else:
 *     raw_kpi_score = (target_value / actual_value) × 100
 *
 *   normalized_kpi_score = MIN(raw_kpi_score, 100)   ← capped at 100
 *
 * ─── Weighted Department Score ───────────────────────────────────────────────
 *
 *   overall_score = Σ (normalized_kpi_score × kpi_weight) / Σ kpi_weight
 *
 *   Uses ONLY:
 *     - Active KPIs (is_active = true)
 *     - Submitted performance entries
 *     - KPIs belonging to the department
 *     - The selected reporting period
 *
 * ─── Missing Data ────────────────────────────────────────────────────────────
 *
 *   If one or more active KPIs have no submitted entry in the period,
 *   the score is marked as 'incomplete'. The partial score is still calculated
 *   from available data, but the status clearly signals missing KPIs.
 *   A department with incomplete data is NOT ranked alongside complete departments.
 *
 * ─── Performance Labels (Illustrative) ──────────────────────────────────────
 *
 *   90–100    Excellent
 *   75–89.99  Good
 *   60–74.99  Needs Improvement
 *    0–59.99  Poor
 */

import { Op } from 'sequelize';
import { KPI, PerformanceEntry, Department, DepartmentScore } from '../models/index.js';
import { derivePerformanceLabel, DEPT_SCORE_STATUSES } from '../models/DepartmentScore.js';

// ── KPI-level calculation ─────────────────────────────────────────────────────

/**
 * Calculate a normalized KPI score from actual vs target.
 * Capped at 100. Returns 0 for invalid/zero targets.
 *
 * @param {number} actualValue
 * @param {number} targetValue
 * @param {boolean} higherIsBetter
 * @returns {number} normalized score 0–100
 */
export const calculateNormalizedKpiScore = (actualValue, targetValue, higherIsBetter) => {
  const actual = Number(actualValue);
  const target = Number(targetValue);

  // Safety: zero or negative target is not a valid benchmark
  if (!isFinite(target) || target <= 0) return 0;

  // Safety: actual must be a valid number; negative actuals treated as 0
  const safeActual = isFinite(actual) ? Math.max(actual, 0) : 0;

  // Safety: for lower-is-better, an actual of 0 would cause division by zero
  if (!higherIsBetter && safeActual === 0) return 100; // 0 actual on a lower-is-better KPI is perfect

  const raw = higherIsBetter
    ? (safeActual / target) * 100
    : (target / safeActual) * 100;

  return Math.min(parseFloat(raw.toFixed(4)), 100);
};

/**
 * Calculate the weighted contribution of a single KPI to the department score.
 *
 * @param {number} normalizedKpiScore  0–100
 * @param {number} kpiWeight           1–100 (percentage or relative weight)
 * @returns {number} weighted contribution
 */
export const calculateWeightedContribution = (normalizedKpiScore, kpiWeight) => {
  return parseFloat(((normalizedKpiScore * kpiWeight) / 100).toFixed(4));
};

/**
 * Calculate the overall normalized weighted average score:
 * Overall score = Sum of (normalized KPI score × KPI weight) / Sum of applicable KPI weights
 *
 * @param {number} sumWeightedProducts  Σ (normalized_score × weight)
 * @param {number} totalApplicableWeight  Σ applicable weight
 * @returns {number|null} score 0–100 or null if totalApplicableWeight <= 0
 */
export const calculateNormalizedWeightedScore = (sumWeightedProducts, totalApplicableWeight) => {
  const totalWeight = Number(totalApplicableWeight);
  if (!isFinite(totalWeight) || totalWeight <= 0) return null;
  const raw = Number(sumWeightedProducts) / totalWeight;
  return Math.min(Math.max(parseFloat(raw.toFixed(2)), 0), 100);
};

// ── Department-level score calculation ───────────────────────────────────────

/**
 * Calculate the full department performance score for a given reporting period.
 *
 * Returns a detailed breakdown object including:
 *   - KPI-level scores and contributions
 *   - Overall weighted score (0–100, or null if no data at all)
 *   - Missing KPI information
 *   - data_status: 'complete' | 'incomplete'
 *   - Performance label (Illustrative)
 *
 * @param {number} departmentId
 * @param {number} periodYear
 * @param {number} periodMonth
 * @returns {Promise<Object>} score result
 */
export const computeDepartmentScore = async (departmentId, periodYear, periodMonth) => {
  // Fetch department
  const department = await Department.findByPk(departmentId);
  if (!department) {
    throw new Error(`Department with ID ${departmentId} not found.`);
  }

  // Fetch ALL active KPIs for this department
  const activeKpis = await KPI.findAll({
    where: { department_id: departmentId, is_active: true },
    order: [['name', 'ASC']],
  });

  if (activeKpis.length === 0) {
    return {
      department_id: departmentId,
      department_name: department.name,
      department_code: department.code,
      period_year: periodYear,
      period_month: periodMonth,
      data_status: DEPT_SCORE_STATUSES.INCOMPLETE,
      overall_score: null,
      performance_label: null,
      active_kpi_count: 0,
      submitted_kpi_count: 0,
      total_applicable_weight: 0,
      missing_kpis: [],
      kpi_breakdown: [],
      note: 'No active KPIs found for this department. Score cannot be calculated.',
    };
  }

  // Fetch submitted performance entries for this department × period
  const entries = await PerformanceEntry.findAll({
    where: {
      department_id: departmentId,
      period_year: periodYear,
      period_month: periodMonth,
      status: { [Op.in]: ['submitted', 'approved'] },
    },
    include: [{ model: KPI, as: 'kpi', attributes: ['id', 'name', 'unit', 'target_value', 'weight', 'higher_is_better', 'is_active'] }],
  });

  // Build a lookup: kpi_id → entry
  const entryByKpiId = {};
  for (const entry of entries) {
    entryByKpiId[entry.kpi_id] = entry;
  }

  // Build KPI breakdown
  const kpiBreakdown = [];
  const missingKpis = [];
  let weightedScoreSum = 0;
  let submittedCount = 0;

  for (const kpi of activeKpis) {
    const entry = entryByKpiId[kpi.id];

    if (!entry) {
      missingKpis.push({ id: kpi.id, name: kpi.name, unit: kpi.unit, weight: kpi.weight });
      kpiBreakdown.push({
        kpi_id: kpi.id,
        kpi_name: kpi.name,
        unit: kpi.unit,
        target_value: parseFloat(kpi.target_value),
        actual_value: null,
        direction: kpi.higher_is_better ? 'Higher is Better ↑' : 'Lower is Better ↓',
        higher_is_better: kpi.higher_is_better,
        weight: kpi.weight,
        normalized_kpi_score: null,
        weighted_contribution: null,
        status: 'MISSING — No submitted entry for this period',
      });
      continue;
    }

    submittedCount++;
    const normalizedScore = calculateNormalizedKpiScore(
      entry.actual_value,
      kpi.target_value,
      kpi.higher_is_better
    );
    const weightedContrib = calculateWeightedContribution(normalizedScore, kpi.weight);
    weightedScoreSum += weightedContrib;

    kpiBreakdown.push({
      kpi_id: kpi.id,
      kpi_name: kpi.name,
      unit: kpi.unit,
      target_value: parseFloat(kpi.target_value),
      actual_value: parseFloat(entry.actual_value),
      direction: kpi.higher_is_better ? 'Higher is Better ↑' : 'Lower is Better ↓',
      higher_is_better: kpi.higher_is_better,
      weight: kpi.weight,
      normalized_kpi_score: normalizedScore,
      weighted_contribution: weightedContrib,
      performance_entry_id: entry.id,
      status: 'OK',
    });
  }

  const totalApplicableWeight = activeKpis.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);
  const isComplete = missingKpis.length === 0;

  // Normalized weighted average: Sum of (normalized_score × weight) / Sum of applicable weights
  const overallScore =
    submittedCount > 0 && totalApplicableWeight > 0
      ? calculateNormalizedWeightedScore(weightedScoreSum * 100, totalApplicableWeight)
      : null;

  const performanceLabel = overallScore !== null ? derivePerformanceLabel(overallScore) : null;

  return {
    department_id: departmentId,
    department_name: department.name,
    department_code: department.code,
    period_year: periodYear,
    period_month: periodMonth,
    data_status: isComplete ? DEPT_SCORE_STATUSES.COMPLETE : DEPT_SCORE_STATUSES.INCOMPLETE,
    overall_score: overallScore,
    performance_label: performanceLabel,
    active_kpi_count: activeKpis.length,
    submitted_kpi_count: submittedCount,
    total_applicable_weight: totalApplicableWeight,
    missing_kpis: missingKpis,
    kpi_breakdown: kpiBreakdown,
    // Disclaimer
    disclaimer: '⚠️ Score thresholds (Excellent/Good/Needs Improvement/Poor) are ILLUSTRATIVE PROJECT VALUES used for research demonstration. They are not official government standards.',
  };
};

// ── Persist computed score ────────────────────────────────────────────────────

/**
 * Compute and persist (upsert) a department score for a period.
 * If a record already exists, it is recalculated and overwritten.
 *
 * @param {number} departmentId
 * @param {number} periodYear
 * @param {number} periodMonth
 * @returns {Promise<{ result: Object, record: DepartmentScore, recalculated: boolean }>}
 */
export const computeAndSaveDepartmentScore = async (departmentId, periodYear, periodMonth) => {
  const result = await computeDepartmentScore(departmentId, periodYear, periodMonth);

  const scoreData = {
    department_id: departmentId,
    period_year: periodYear,
    period_month: periodMonth,
    overall_score: result.overall_score,
    performance_label: result.performance_label,
    data_status: result.data_status,
    active_kpi_count: result.active_kpi_count,
    submitted_kpi_count: result.submitted_kpi_count,
    missing_kpi_ids: result.missing_kpis.map((k) => k.id),
    calculated_at: new Date(),
  };

  // Upsert: update existing or create new
  const [record, created] = await DepartmentScore.findOrCreate({
    where: { department_id: departmentId, period_year: periodYear, period_month: periodMonth },
    defaults: scoreData,
  });

  if (!created) {
    await record.update(scoreData);
  }

  return { result, record, recalculated: !created };
};

// ── Department Ranking ────────────────────────────────────────────────────────

/**
 * Retrieve department rankings for a selected reporting period.
 *
 * Only departments with data_status = 'complete' are ranked.
 * Departments with incomplete data are listed separately.
 * Ties are handled consistently (same rank for same score, next rank skips).
 *
 * @param {number} periodYear
 * @param {number} periodMonth
 * @returns {Promise<Object>} ranking result with ranked and unranked lists
 */
export const getDepartmentRankings = async (periodYear, periodMonth) => {
  const scores = await DepartmentScore.findAll({
    where: { period_year: periodYear, period_month: periodMonth },
    include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code', 'is_active'] }],
    order: [['overall_score', 'DESC']],
  });

  const ranked = [];
  const unranked = [];
  let currentRank = 1;
  let previousScore = null;
  let rankOffset = 0;

  for (const s of scores) {
    const score = s.overall_score !== null ? parseFloat(s.overall_score) : null;

    if (s.data_status === DEPT_SCORE_STATUSES.COMPLETE && score !== null) {
      if (previousScore !== null && score === previousScore) {
        // Tie: same rank, but increment offset for next
        rankOffset++;
      } else if (previousScore !== null && score !== previousScore) {
        currentRank += rankOffset + 1;
        rankOffset = 0;
      }

      ranked.push({
        rank: currentRank,
        department_id: s.department_id,
        department_name: s.department?.name,
        department_code: s.department?.code,
        overall_score: score,
        performance_label: s.performance_label,
        calculated_at: s.calculated_at,
      });

      previousScore = score;
    } else {
      unranked.push({
        rank: null,
        department_id: s.department_id,
        department_name: s.department?.name,
        department_code: s.department?.code,
        overall_score: score,
        performance_label: null,
        data_status: s.data_status,
        active_kpi_count: s.active_kpi_count,
        submitted_kpi_count: s.submitted_kpi_count,
        reason: 'Incomplete data — not all active KPIs have submitted entries for this period.',
        calculated_at: s.calculated_at,
      });
    }
  }

  return {
    period_year: periodYear,
    period_month: periodMonth,
    ranked_departments: ranked,
    unranked_departments: unranked,
    total_scored: scores.length,
    total_ranked: ranked.length,
    total_unranked: unranked.length,
    disclaimer: '⚠️ Rankings are based on illustrative project scoring formulas. They are NOT official government rankings or evaluations.',
  };
};
