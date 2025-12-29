import api from './axios';

export const getProducts = async (params = {}) => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const getProduct = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await api.post('/products', data);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await api.put(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/products/categories/all');
  return response.data;
};

export const createCategory = async (data) => {
  const response = await api.post('/products/categories', data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`/products/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/products/categories/${id}`);
  return response.data;
};

export const importProducts = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/products/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const exportProducts = async () => {
  const response = await api.get('/products/export', {
    responseType: 'blob',
  });
  return response.data;
};
