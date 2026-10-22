import api from './api';

export const departmentService = {
  /**
   * Fetch list of departments with optional filters
   */
  getAllDepartments: async (params = {}) => {
    const response = await api.get('/departments', { params });
    return response.data;
  },

  /**
   * Fetch single department by ID
   */
  getDepartmentById: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  /**
   * Create a new department (Admin only)
   */
  createDepartment: async (departmentData) => {
    const response = await api.post('/departments', departmentData);
    return response.data;
  },

  /**
   * Update an existing department (Admin only)
   */
  updateDepartment: async (id, departmentData) => {
    const response = await api.put(`/departments/${id}`, departmentData);
    return response.data;
  },

  /**
   * Soft deactivate a department (Admin only)
   */
  deactivateDepartment: async (id) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};

export default departmentService;
