/**
 * services/forecastService.js
 * ----------------------------
 * Axios API wrapper for Stage 10 Forecasting & Predictive Intelligence endpoints.
 */

import api from './api.js';

const forecastService = {
  /**
   * Fetch system-wide projected leaderboard and validation benchmarks (Policymaker / Admin).
   * @param {number} [horizon=3]
   */
  getSystemForecast: async (horizon = 3) => {
    const response = await api.get('/forecasts/summary', { params: { horizon } });
    return response.data;
  },

  /**
   * Fetch department-scoped forecast with KPI breakdowns and confidence bands.
   * @param {number} departmentId
   * @param {number} [horizon=3]
   */
  getDepartmentForecast: async (departmentId, horizon = 3) => {
    const response = await api.get(`/forecasts/department/${departmentId}`, { params: { horizon } });
    return response.data;
  },

  /**
   * Fetch officer's own department projected trajectory.
   * @param {number} [horizon=3]
   */
  getMyDepartmentForecast: async (horizon = 3) => {
    const response = await api.get('/forecasts/my-department', { params: { horizon } });
    return response.data;
  },

  /**
   * Fetch single KPI trajectory and walk-forward validation accuracy.
   * @param {number} kpiId
   * @param {number} [horizon=3]
   */
  getKpiForecast: async (kpiId, horizon = 3) => {
    const response = await api.get(`/forecasts/kpi/${kpiId}`, { params: { horizon } });
    return response.data;
  },
};

export default forecastService;
