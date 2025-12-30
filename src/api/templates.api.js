import api from './axios';

export const getTemplates = async () => {
  const response = await api.get('/templates');
  return response.data;
};

export const getTemplate = async (id) => {
  const response = await api.get(`/templates/${id}`);
  return response.data;
};

export const createTemplate = async (data) => {
  const response = await api.post('/templates', data);
  return response.data;
};

export const updateTemplate = async (id, data) => {
  const response = await api.put(`/templates/${id}`, data);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await api.delete(`/templates/${id}`);
  return response.data;
};

export const duplicateTemplate = async (id) => {
  const response = await api.post(`/templates/${id}/duplicate`);
  return response.data;
};
