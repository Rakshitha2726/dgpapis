import api from './api';

export const performanceService = {
  /**
   * Fetch active KPIs for officer's assigned department
   */
  getActiveKpis: async (departmentId = null) => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await api.get('/performance/active-kpis', { params });
    return response.data;
  },

  /**
   * Fetch performance entries
   */
  getEntries: async (params = {}) => {
    const response = await api.get('/performance', { params });
    return response.data;
  },

  /**
   * Fetch single performance entry by ID
   */
  getEntryById: async (id) => {
    const response = await api.get(`/performance/${id}`);
    return response.data;
  },

  /**
   * Create a new performance entry (Department Officer only)
   */
  createEntry: async (entryData) => {
    const response = await api.post('/performance', entryData);
    return response.data;
  },

  /**
   * Update an existing performance entry (Department Officer only)
   */
  updateEntry: async (id, entryData) => {
    const response = await api.put(`/performance/${id}`, entryData);
    return response.data;
  },
};

export default performanceService;
