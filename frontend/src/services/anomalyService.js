/**
 * services/anomalyService.js
 * ---------------------------
 * Axios API wrapper for Stage 9 Anomaly Detection & Data Quality Validation endpoints.
 */

import api from './api.js';

const anomalyService = {
  /**
   * Fetch cross-department system quality summary and alerts (Policymaker / Admin).
   * @param {Object} [params]
   * @param {number} [params.period_year]
   * @param {number} [params.period_month]
   * @param {number} [params.department_id]
   * @param {string} [params.severity]
   * @param {string} [params.check_type]
   */
  getSystemSummary: async (params = {}) => {
    const response = await api.get('/anomalies/summary', { params });
    return response.data;
  },

  /**
   * Fetch department-scoped quality summary (Admin, Policymaker, or Department Officer for own dept).
   * @param {number} departmentId
   * @param {Object} [params]
   */
  getDepartmentSummary: async (departmentId, params = {}) => {
    const response = await api.get(`/anomalies/department/${departmentId}`, { params });
    return response.data;
  },

  /**
   * Fetch officer's own department quality summary.
   * @param {Object} [params]
   */
  getMyDepartmentSummary: async (params = {}) => {
    const response = await api.get('/anomalies/my-department', { params });
    return response.data;
  },
};

export default anomalyService;
