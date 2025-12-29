import api from './axios';

export const getCosts = async (params = {}) => {
  const response = await api.get('/costs', { params });
  return response.data;
};

export const getCost = async (id) => {
  const response = await api.get(`/costs/${id}`);
  return response.data;
};

export const createCost = async (data) => {
  const response = await api.post('/costs', data);
  return response.data;
};

export const updateCost = async (id, data) => {
  const response = await api.put(`/costs/${id}`, data);
  return response.data;
};

export const deleteCost = async (id) => {
  const response = await api.delete(`/costs/${id}`);
  return response.data;
};

export const getCostCategories = async () => {
  const response = await api.get('/costs/categories');
  return response.data;
};

export const getMonthlySummary = async (params) => {
  const response = await api.get('/costs/summary', { params });
  return response.data;
};
