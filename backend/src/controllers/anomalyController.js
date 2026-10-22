/**
 * controllers/anomalyController.js
 * ---------------------------------
 * Controller for Stage 9: Automated Anomaly Detection & Data Quality Validation.
 * Enforces role-based isolation, parameter validation, and structured diagnostics.
 */

import { Department } from '../models/index.js';
import { runPeriodDataQualityValidation } from '../utils/anomalyDetector.js';

/**
 * GET /api/anomalies/summary
 * Cross-department system-wide anomaly and quality summary.
 * Roles: admin, policymaker
 */
export const getSystemQualitySummary = async (req, res) => {
  const now = new Date();
  const periodYear = req.query.period_year ? Number(req.query.period_year) : now.getFullYear();
  const periodMonth = req.query.period_month ? Number(req.query.period_month) : now.getMonth() + 1;
  const deptIdFilter = req.query.department_id ? Number(req.query.department_id) : undefined;
  const severityFilter = req.query.severity ? req.query.severity.toUpperCase() : 'ALL';
  const checkTypeFilter = req.query.check_type ? req.query.check_type.toUpperCase() : 'ALL';

  const results = await runPeriodDataQualityValidation({
    departmentId: deptIdFilter,
    periodYear,
    periodMonth,
  });

  // Apply in-memory filters if specified
  let filteredAlerts = results.alerts;
  if (severityFilter && severityFilter !== 'ALL') {
    filteredAlerts = filteredAlerts.filter((a) => a.severity === severityFilter);
  }
  if (checkTypeFilter && checkTypeFilter !== 'ALL') {
    filteredAlerts = filteredAlerts.filter((a) => a.check_type === checkTypeFilter);
  }

  res.status(200).json({
    success: true,
    period_year: results.period_year,
    period_month: results.period_month,
    summary: results.summary,
    filtered_alerts_count: filteredAlerts.length,
    alerts: filteredAlerts,
    disclaimer: results.disclaimer,
  });
};

/**
 * GET /api/anomalies/department/:id
 * Department-scoped anomaly and quality validation.
 * Roles: admin, policymaker, department_officer (strictly own department)
 */
export const getDepartmentQualitySummary = async (req, res) => {
  const { id } = req.params;
  const targetDeptId = Number(id);
  const user = req.user;

  // Department Isolation Guard
  if (user.role === 'department_officer') {
    if (!user.department_id || user.department_id !== targetDeptId) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Department Officers can only inspect data quality alerts for their assigned department.',
      });
    }
  }

  const department = await Department.findByPk(targetDeptId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${targetDeptId} not found.`,
    });
  }

  const now = new Date();
  const periodYear = req.query.period_year ? Number(req.query.period_year) : now.getFullYear();
  const periodMonth = req.query.period_month ? Number(req.query.period_month) : now.getMonth() + 1;
  const severityFilter = req.query.severity ? req.query.severity.toUpperCase() : 'ALL';

  const results = await runPeriodDataQualityValidation({
    departmentId: targetDeptId,
    periodYear,
    periodMonth,
  });

  let filteredAlerts = results.alerts;
  if (severityFilter && severityFilter !== 'ALL') {
    filteredAlerts = filteredAlerts.filter((a) => a.severity === severityFilter);
  }

  res.status(200).json({
    success: true,
    department: {
      id: department.id,
      name: department.name,
      code: department.code,
    },
    period_year: results.period_year,
    period_month: results.period_month,
    summary: results.summary,
    alerts: filteredAlerts,
    disclaimer: results.disclaimer,
  });
};

/**
 * GET /api/anomalies/my-department
 * Convenience endpoint for logged-in Department Officers to inspect their assigned department.
 * Role: department_officer
 */
export const getMyDepartmentQualitySummary = async (req, res) => {
  const user = req.user;

  if (!user.department_id) {
    return res.status(400).json({
      success: false,
      message: 'You are not currently assigned to any department. Contact an administrator.',
    });
  }

  const now = new Date();
  const periodYear = req.query.period_year ? Number(req.query.period_year) : now.getFullYear();
  const periodMonth = req.query.period_month ? Number(req.query.period_month) : now.getMonth() + 1;

  const results = await runPeriodDataQualityValidation({
    departmentId: user.department_id,
    periodYear,
    periodMonth,
  });

  res.status(200).json({
    success: true,
    department_id: user.department_id,
    period_year: results.period_year,
    period_month: results.period_month,
    summary: results.summary,
    alerts: results.alerts,
    disclaimer: results.disclaimer,
  });
};
