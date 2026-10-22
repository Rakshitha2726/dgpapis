import api from './api';

export const kpiService = {
  /**
   * Fetch all KPIs with optional filters
   */
  getAllKPIs: async (params = {}) => {
    const response = await api.get('/kpis', { params });
    return response.data;
  },

  /**
   * Fetch single KPI by ID
   */
  getKPIById: async (id) => {
    const response = await api.get(`/kpis/${id}`);
    return response.data;
  },

  /**
   * Fetch active weight summary for a department
   */
  getDepartmentWeightSummary: async (departmentId) => {
    const response = await api.get(`/kpis/department/${departmentId}/weight-summary`);
    return response.data;
  },

  /**
   * Create a new KPI (Admin only)
   */
  createKPI: async (kpiData) => {
    const response = await api.post('/kpis', kpiData);
    return response.data;
  },

  /**
   * Update an existing KPI (Admin only)
   */
  updateKPI: async (id, kpiData) => {
    const response = await api.put(`/kpis/${id}`, kpiData);
    return response.data;
  },

  /**
   * Soft deactivate a KPI (Admin only)
   */
  deactivateKPI: async (id) => {
    const response = await api.delete(`/kpis/${id}`);
    return response.data;
  },

  /**
   * Apply deduplicated research-paper illustrative presets to a department (Admin only)
   */
  applyIllustrativePresets: async (departmentId) => {
    const response = await api.post('/kpis/apply-presets', { department_id: departmentId });
    return response.data;
  },
};

export default kpiService;
