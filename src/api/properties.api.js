import api from './axios';

export const getProperties = async (params = {}) => {
  const response = await api.get('/properties', { params });
  return response.data;
};

export const getProperty = async (id) => {
  const response = await api.get(`/properties/${id}`);
  return response.data;
};

export const createProperty = async (data) => {
  const response = await api.post('/properties', data);
  return response.data;
};

export const updateProperty = async (id, data) => {
  const response = await api.put(`/properties/${id}`, data);
  return response.data;
};

export const deleteProperty = async (id) => {
  const response = await api.delete(`/properties/${id}`);
  return response.data;
};

export const uploadImages = async (propertyId, files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });
  const response = await api.post(`/properties/${propertyId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteImage = async (propertyId, imageId) => {
  const response = await api.delete(`/properties/${propertyId}/images/${imageId}`);
  return response.data;
};

export const getTemplates = async (propertyId) => {
  const response = await api.get(`/properties/${propertyId}/templates`);
  return response.data;
};

export const createTemplate = async (propertyId, data) => {
  const response = await api.post(`/properties/${propertyId}/templates`, data);
  return response.data;
};

export const updateTemplate = async (propertyId, templateId, data) => {
  const response = await api.put(`/properties/${propertyId}/templates/${templateId}`, data);
  return response.data;
};

export const deleteTemplate = async (propertyId, templateId) => {
  const response = await api.delete(`/properties/${propertyId}/templates/${templateId}`);
  return response.data;
};
