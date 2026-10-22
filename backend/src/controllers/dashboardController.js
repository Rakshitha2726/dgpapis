/**
 * controllers/dashboardController.js
 * -----------------------------------
 * Aggregated summary endpoints for Stage 8 Dashboard Integration.
 * Provides role-tailored performance metrics, charts data, and submission statuses.
 */

import { Department, KPI, PerformanceEntry, DepartmentScore } from '../models/index.js';
import { computeDepartmentScore, getDepartmentRankings } from '../utils/scoreEngine.js';
import { Op } from 'sequelize';

/**
 * GET /api/dashboard/admin-stats
 * Role: admin
 */
export const getAdminDashboardStats = async (req, res) => {
  const totalDepartments = await Department.count();
  const activeDepartments = await Department.count({ where: { is_active: true } });

  const totalKpis = await KPI.count();
  const activeKpis = await KPI.count({ where: { is_active: true } });

  const totalSubmissions = await PerformanceEntry.count();
  const finalEntries = await PerformanceEntry.count({ where: { status: 'approved' } });
  const pendingEntries = await PerformanceEntry.count({ where: { status: 'draft' } });
  // Optionally include 'submitted' status as pending if needed
  // const pendingEntries = await PerformanceEntry.count({ where: { status: { [Op.in]: ['draft', 'submitted'] } } });

  // Latest scores count
  const totalScoredPeriods = await DepartmentScore.count();

  // Recent submission activity
  const recentSubmissions = await PerformanceEntry.findAll({
    limit: 5,
    order: [['updated_at', 'DESC']],
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      { model: KPI, as: 'kpi', attributes: ['id', 'name', 'unit'] },
    ],
  });

  res.status(200).json({
    success: true,
    stats: {
      total_departments: totalDepartments,
      active_departments: activeDepartments,
      inactive_departments: totalDepartments - activeDepartments,
      total_kpis: totalKpis,
      active_kpis: activeKpis,
      inactive_kpis: totalKpis - activeKpis,
      total_submissions: totalSubmissions,
      submitted_entries: finalEntries, // approved submissions
      draft_entries: pendingEntries, // drafts pending
      total_scored_periods: totalScoredPeriods,
    },
    recent_activity: recentSubmissions,
  });
};

/**
 * GET /api/dashboard/officer-summary
 * Role: department_officer
 * Strictly isolated to officer's assigned department.
 */
export const getOfficerDashboardSummary = async (req, res) => {
  const user = req.user;

  if (!user.department_id) {
    return res.status(400).json({
      success: false,
      message: 'You are not assigned to any department. Contact an administrator.',
    });
  }

  const deptId = user.department_id;
  const department = await Department.findByPk(deptId);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${deptId} not found.`,
    });
  }

  // Active KPIs for department
  const activeKpis = await KPI.findAll({
    where: { department_id: deptId, is_active: true },
    attributes: ['id', 'name', 'unit', 'target_value', 'weight', 'higher_is_better'],
    order: [['name', 'ASC']],
  });

  // Available periods for this department
  const periods = await PerformanceEntry.findAll({
    where: { department_id: deptId },
    attributes: ['period_year', 'period_month'],
    group: ['period_year', 'period_month'],
    order: [
      ['period_year', 'DESC'],
      ['period_month', 'DESC'],
    ],
  });

  let latestScore = null;
  const now = new Date();
  let periodYear = now.getFullYear();
  let periodMonth = now.getMonth() + 1;

  if (periods.length > 0) {
    periodYear = periods[0].period_year;
    periodMonth = periods[0].period_month;
  }

  // Calculate or fetch current score
  try {
    latestScore = await computeDepartmentScore(deptId, periodYear, periodMonth);
  } catch (err) {
    latestScore = null;
  }

  // Historical score trend for officer's department
  const scoreHistory = await DepartmentScore.findAll({
    where: { department_id: deptId },
    order: [
      ['period_year', 'ASC'],
      ['period_month', 'ASC'],
    ],
  });

  res.status(200).json({
    success: true,
    department: {
      id: department.id,
      name: department.name,
      code: department.code,
      is_active: department.is_active,
    },
    active_kpi_count: activeKpis.length,
    active_kpis: activeKpis,
    current_period: {
      year: periodYear,
      month: periodMonth,
    },
    current_score: latestScore,
    history_trend: scoreHistory.map((h) => ({
      period: `${h.period_year}-${String(h.period_month).padStart(2, '0')}`,
      year: h.period_year,
      month: h.period_month,
      overall_score: h.overall_score !== null ? parseFloat(h.overall_score) : null,
      performance_label: h.performance_label,
      data_status: h.data_status,
    })),
  });
};

/**
 * GET /api/dashboard/policymaker-summary
 * Role: policymaker, admin
 */
export const getPolicymakerDashboardSummary = async (req, res) => {
  const now = new Date();
  const year = req.query.period_year ? Number(req.query.period_year) : now.getFullYear();
  const month = req.query.period_month ? Number(req.query.period_month) : now.getMonth() + 1;

  // Get cross-department rankings for requested period
  const rankings = await getDepartmentRankings(year, month);

  // System-wide overview
  const totalDepartments = await Department.count({ where: { is_active: true } });
  const completedScores = rankings.ranked_departments;
  const incompleteScores = rankings.unranked_departments;

  let averageScore = null;
  if (completedScores.length > 0) {
    const sum = completedScores.reduce((acc, curr) => acc + curr.overall_score, 0);
    averageScore = parseFloat((sum / completedScores.length).toFixed(2));
  }

  const topDepartment = completedScores.length > 0 ? completedScores[0] : null;

  // Historical trend summary across all completed scores
  const allScores = await DepartmentScore.findAll({
    include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }],
    order: [
      ['period_year', 'ASC'],
      ['period_month', 'ASC'],
      ['overall_score', 'DESC'],
    ],
  });

  // KPI performance summary
  const totalKpis = await KPI.count({ where: { is_active: true } });

  res.status(200).json({
    success: true,
    period_year: year,
    period_month: month,
    overview: {
      total_active_departments: totalDepartments,
      completed_departments_count: completedScores.length,
      incomplete_departments_count: incompleteScores.length,
      average_system_score: averageScore,
      top_performing_department: topDepartment,
      total_active_kpis: totalKpis,
    },
    rankings: rankings,
    historical_scores: allScores,
  });
};
