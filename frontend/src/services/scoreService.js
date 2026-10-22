/**
 * services/scoreService.js
 * -------------------------
 * Axios API wrapper for Stage 7 Performance Score & Ranking Engine endpoints.
 */

import api from './api.js';

// ── Admin: Trigger calculations ───────────────────────────────────────────────

/**
 * Calculate (or recalculate) a single department's score for a period.
 * Admin only.
 */
export const calculateDepartmentScore = (departmentId, periodYear, periodMonth) =>
  api.post('/scores/calculate', {
    department_id: departmentId,
    period_year: periodYear,
    period_month: periodMonth,
  });

/**
 * Calculate scores for ALL active departments for a period.
 * Admin only.
 */
export const calculateAllScores = (periodYear, periodMonth) =>
  api.post('/scores/calculate-all', {
    period_year: periodYear,
    period_month: periodMonth,
  });

// ── Read: Score retrieval ─────────────────────────────────────────────────────

/**
 * Get the live-calculated breakdown score for a specific department + period.
 * Admin/Policymaker: any dept. Officer: own dept only.
 */
export const getDepartmentScore = (departmentId, periodYear, periodMonth) =>
  api.get(`/scores/department/${departmentId}`, {
    params: { period_year: periodYear, period_month: periodMonth },
  });

/**
 * Convenience route for officers: get score for their own department.
 */
export const getMyDepartmentScore = (periodYear, periodMonth) =>
  api.get('/scores/my-score', {
    params: { period_year: periodYear, period_month: periodMonth },
  });

/**
 * Get historical score records for a department across all periods.
 */
export const getDepartmentScoreHistory = (departmentId) =>
  api.get(`/scores/history/${departmentId}`);

/**
 * Get department rankings for a selected period.
 */
export const getDepartmentRankings = (periodYear, periodMonth) =>
  api.get('/scores/rankings', {
    params: { period_year: periodYear, period_month: periodMonth },
  });

/**
 * Get list of all periods that have stored score records.
 */
export const getAvailablePeriods = () =>
  api.get('/scores/periods');
