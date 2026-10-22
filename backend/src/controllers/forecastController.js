/**
 * controllers/forecastController.js
 * ---------------------------------
 * Stage 10: Predictive Performance Intelligence & Historical Forecasting Controller.
 *
 * Implements role-based access control and strict department data isolation.
 */

import { Department, KPI, PerformanceEntry } from '../models/index.js';
import {
  forecastSystemRankings,
  forecastDepartmentPerformance,
  generateKpiForecast,
} from '../utils/forecastingEngine.js';

/**
 * GET /api/forecasts/summary
 * Cross-Department Projected Leaderboard & Accuracy Benchmark (Policymaker / Admin).
 */
export const getSystemForecastSummary = async (req, res) => {
  const horizon = parseInt(req.query.horizon, 10) || 3;
  const rankings = await forecastSystemRankings(horizon);

  return res.status(200).json({
    success: true,
    ...rankings,
  });
};

/**
 * GET /api/forecasts/department/:id
 * Department-level projected trajectory with KPI breakdowns and confidence intervals.
 * RBAC: Officers strictly constrained to their assigned department.
 */
export const getDepartmentForecast = async (req, res) => {
  const departmentId = parseInt(req.params.id, 10);
  const horizon = parseInt(req.query.horizon, 10) || 3;

  // Strict Department Officer Isolation Guard
  if (req.user.role === 'department_officer' && req.user.department_id !== departmentId) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Department Officers can only view forecasts for their assigned department.',
    });
  }

  const department = await Department.findByPk(departmentId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${departmentId} not found.`,
    });
  }

  const forecast = await forecastDepartmentPerformance(departmentId, horizon);

  return res.status(200).json({
    success: true,
    ...forecast,
  });
};

/**
 * GET /api/forecasts/my-department
 * Convenience endpoint for logged-in Department Officer.
 */
export const getMyDepartmentForecast = async (req, res) => {
  if (req.user.role !== 'department_officer' || !req.user.department_id) {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is accessible only to department officers with an assigned department.',
    });
  }

  const horizon = parseInt(req.query.horizon, 10) || 3;
  const forecast = await forecastDepartmentPerformance(req.user.department_id, horizon);

  return res.status(200).json({
    success: true,
    ...forecast,
  });
};

/**
 * GET /api/forecasts/kpi/:id
 * Granular trajectory and backtesting comparison for a single KPI.
 */
export const getKpiForecast = async (req, res) => {
  const kpiId = parseInt(req.params.id, 10);
  const horizon = parseInt(req.query.horizon, 10) || 3;

  const kpi = await KPI.findByPk(kpiId);
  if (!kpi) {
    return res.status(404).json({
      success: false,
      message: `KPI with ID ${kpiId} not found.`,
    });
  }

  // Isolation check for Department Officers
  if (req.user.role === 'department_officer' && req.user.department_id !== kpi.department_id) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Department Officers can only view forecasts for KPIs within their assigned department.',
    });
  }

  const entries = await PerformanceEntry.findAll({
    where: {
      kpi_id: kpi.id,
      status: ['submitted', 'approved'],
    },
    order: [
      ['period_year', 'ASC'],
      ['period_month', 'ASC'],
    ],
  });

  const forecast = generateKpiForecast(kpi, entries, horizon);

  return res.status(200).json({
    success: true,
    department_id: kpi.department_id,
    forecast,
  });
};
