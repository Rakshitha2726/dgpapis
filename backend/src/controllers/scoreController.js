/**
 * controllers/scoreController.js
 * --------------------------------
 * HTTP request handlers for the Stage 7 Performance Score & Ranking Engine.
 *
 * ⚠️  ILLUSTRATIVE PROJECT VALUES:
 *   All scores, thresholds, and rankings are based on illustrative research-paper
 *   evaluation formulas. They are NOT official government standards.
 *
 * Role-Based Access Control:
 *   - POST /api/scores/calculate       → admin only (trigger calculation)
 *   - GET  /api/scores/department/:id  → admin, policymaker; department_officer (own dept only)
 *   - GET  /api/scores/breakdown/:id   → admin, policymaker; department_officer (own dept only)
 *   - GET  /api/scores/rankings        → admin, policymaker (full), department_officer (read-only)
 *   - GET  /api/scores/my-score        → department_officer (own dept only, convenience route)
 */

import { DepartmentScore, Department, KPI } from '../models/index.js';
import {
  computeAndSaveDepartmentScore,
  computeDepartmentScore,
  getDepartmentRankings,
} from '../utils/scoreEngine.js';
import { Op } from 'sequelize';

// ── Calculate / Recalculate a Department Score ────────────────────────────────

/**
 * POST /api/scores/calculate
 * Body: { department_id, period_year, period_month }
 *
 * Triggers calculation (or recalculation) of the department score for a period.
 * Admin only — officers submit data, policymakers view data, admins run the engine.
 */
export const calculateDepartmentScore = async (req, res) => {
  const { department_id, period_year, period_month } = req.body;

  if (!department_id || !period_year || !period_month) {
    return res.status(400).json({
      success: false,
      message: 'department_id, period_year, and period_month are required.',
    });
  }

  const year  = parseInt(period_year, 10);
  const month = parseInt(period_month, 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ success: false, message: 'period_year must be between 2000 and 2100.' });
  }
  if (isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ success: false, message: 'period_month must be between 1 and 12.' });
  }

  const { result, record, recalculated } = await computeAndSaveDepartmentScore(
    parseInt(department_id, 10), year, month
  );

  return res.status(200).json({
    success: true,
    message: recalculated
      ? `Score for ${result.department_name} (${year}-${String(month).padStart(2, '0')}) recalculated successfully.`
      : `Score for ${result.department_name} (${year}-${String(month).padStart(2, '0')}) calculated successfully.`,
    recalculated,
    score: result,
    record_id: record.id,
  });
};

/**
 * POST /api/scores/calculate-all
 * Body: { period_year, period_month }
 *
 * Calculate scores for ALL active departments for a period.
 * Admin only.
 */
export const calculateAllDepartmentScores = async (req, res) => {
  const { period_year, period_month } = req.body;

  if (!period_year || !period_month) {
    return res.status(400).json({
      success: false,
      message: 'period_year and period_month are required.',
    });
  }

  const year  = parseInt(period_year, 10);
  const month = parseInt(period_month, 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ success: false, message: 'period_year must be between 2000 and 2100.' });
  }
  if (isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ success: false, message: 'period_month must be between 1 and 12.' });
  }

  const activeDepts = await Department.findAll({ where: { is_active: true } });

  if (activeDepts.length === 0) {
    return res.status(400).json({ success: false, message: 'No active departments found.' });
  }

  const results = [];
  const errors  = [];

  for (const dept of activeDepts) {
    try {
      const { result, record, recalculated } = await computeAndSaveDepartmentScore(dept.id, year, month);
      results.push({
        department_id: dept.id,
        department_name: dept.name,
        department_code: dept.code,
        overall_score: result.overall_score,
        data_status: result.data_status,
        performance_label: result.performance_label,
        recalculated,
        record_id: record.id,
      });
    } catch (err) {
      errors.push({ department_id: dept.id, department_name: dept.name, error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    message: `Batch score calculation complete for ${year}-${String(month).padStart(2, '0')}.`,
    period_year: year,
    period_month: month,
    total_processed: results.length,
    total_errors: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
    disclaimer: '⚠️ Scores are based on illustrative project formulas, not official government standards.',
  });
};

// ── Get Score for a Department ────────────────────────────────────────────────

/**
 * GET /api/scores/department/:departmentId?period_year=YYYY&period_month=M
 *
 * Retrieve the stored score for a specific department and period.
 * Department Officers: restricted to their own department.
 * Admins & Policymakers: any department.
 */
export const getDepartmentScore = async (req, res) => {
  const { departmentId } = req.params;
  const { period_year, period_month } = req.query;
  const user = req.user;

  // Department Officers: enforce isolation
  if (user.role === 'department_officer' && Number(departmentId) !== user.department_id) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You can only view scores for your assigned department.',
    });
  }

  if (!period_year || !period_month) {
    return res.status(400).json({
      success: false,
      message: 'period_year and period_month query parameters are required.',
    });
  }

  const year  = parseInt(period_year, 10);
  const month = parseInt(period_month, 10);

  // Return live-calculated breakdown (not just stored record) for full detail
  const result = await computeDepartmentScore(parseInt(departmentId, 10), year, month);

  // Also get the stored record if available
  const storedRecord = await DepartmentScore.findOne({
    where: { department_id: departmentId, period_year: year, period_month: month },
  });

  return res.status(200).json({
    success: true,
    score: result,
    stored_record: storedRecord
      ? { id: storedRecord.id, calculated_at: storedRecord.calculated_at, recalculate_url: `POST /api/scores/calculate` }
      : null,
  });
};

/**
 * GET /api/scores/my-score?period_year=YYYY&period_month=M
 *
 * Convenience endpoint for Department Officers.
 * Returns score for their own assigned department.
 */
export const getMyDepartmentScore = async (req, res) => {
  const user = req.user;
  const { period_year, period_month } = req.query;

  if (!user.department_id) {
    return res.status(400).json({
      success: false,
      message: 'You are not assigned to any department.',
    });
  }

  if (!period_year || !period_month) {
    return res.status(400).json({
      success: false,
      message: 'period_year and period_month query parameters are required.',
    });
  }

  const year  = parseInt(period_year, 10);
  const month = parseInt(period_month, 10);

  const result = await computeDepartmentScore(user.department_id, year, month);

  return res.status(200).json({
    success: true,
    score: result,
  });
};

// ── Score History for a Department ───────────────────────────────────────────

/**
 * GET /api/scores/history/:departmentId
 *
 * Returns stored score records across all periods for a department.
 * Useful for historical trend comparison.
 * Department Officers: own dept only.
 */
export const getDepartmentScoreHistory = async (req, res) => {
  const { departmentId } = req.params;
  const user = req.user;

  if (user.role === 'department_officer' && Number(departmentId) !== user.department_id) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You can only view score history for your assigned department.',
    });
  }

  const department = await Department.findByPk(departmentId);
  if (!department) {
    return res.status(404).json({ success: false, message: `Department ${departmentId} not found.` });
  }

  const history = await DepartmentScore.findAll({
    where: { department_id: departmentId },
    order: [['period_year', 'DESC'], ['period_month', 'DESC']],
  });

  return res.status(200).json({
    success: true,
    department: { id: department.id, name: department.name, code: department.code },
    count: history.length,
    history: history.map((h) => ({
      id: h.id,
      period_year: h.period_year,
      period_month: h.period_month,
      overall_score: h.overall_score !== null ? parseFloat(h.overall_score) : null,
      performance_label: h.performance_label,
      data_status: h.data_status,
      active_kpi_count: h.active_kpi_count,
      submitted_kpi_count: h.submitted_kpi_count,
      calculated_at: h.calculated_at,
    })),
    disclaimer: '⚠️ Scores are based on illustrative project formulas.',
  });
};

// ── Department Rankings ───────────────────────────────────────────────────────

/**
 * GET /api/scores/rankings?period_year=YYYY&period_month=M
 *
 * Returns department rankings for a selected period.
 * Only departments with data_status = 'complete' are ranked.
 * All authenticated roles can view rankings.
 * Officers see their own department highlighted (frontend may use this info).
 */
export const getDepartmentRankingsHandler = async (req, res) => {
  const { period_year, period_month } = req.query;

  if (!period_year || !period_month) {
    return res.status(400).json({
      success: false,
      message: 'period_year and period_month query parameters are required.',
    });
  }

  const year  = parseInt(period_year, 10);
  const month = parseInt(period_month, 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ success: false, message: 'period_year must be between 2000 and 2100.' });
  }
  if (isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ success: false, message: 'period_month must be between 1 and 12.' });
  }

  const rankings = await getDepartmentRankings(year, month);

  return res.status(200).json({
    success: true,
    ...rankings,
  });
};

// ── All Available Score Periods ───────────────────────────────────────────────

/**
 * GET /api/scores/periods
 *
 * Returns a list of all distinct year/month periods that have stored scores.
 * Useful for populating period-selector dropdowns in the UI.
 */
export const getAvailablePeriods = async (req, res) => {
  const { sequelize } = await import('../config/database.js');

  const periods = await DepartmentScore.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('period_year')), 'period_year'],
      'period_month',
    ],
    order: [['period_year', 'DESC'], ['period_month', 'DESC']],
    raw: true,
  });

  // Deduplicate (DISTINCT on two columns)
  const seen = new Set();
  const unique = [];
  for (const p of periods) {
    const key = `${p.period_year}-${p.period_month}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ period_year: p.period_year, period_month: p.period_month });
    }
  }

  return res.status(200).json({
    success: true,
    count: unique.length,
    periods: unique,
  });
};
