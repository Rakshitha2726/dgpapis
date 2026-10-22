/**
 * services/dashboardService.js
 * -----------------------------
 * Axios API wrapper for Stage 8 Dashboard endpoints.
 */

import api from './api.js';

const dashboardService = {
  // Admin dashboard summary stats
  getAdminStats: async () => {
    const response = await api.get('/dashboard/admin-stats');
    return response.data;
  },

  // Officer dashboard summary (strictly isolated to officer's assigned department)
  getOfficerSummary: async () => {
    const response = await api.get('/dashboard/officer-summary');
    return response.data;
  },

  // Policymaker dashboard summary
  getPolicymakerSummary: async (year, month) => {
    const params = {};
    if (year) params.period_year = year;
    if (month) params.period_month = month;
    const response = await api.get('/dashboard/policymaker-summary', { params });
    return response.data;
  },
};

export default dashboardService;
