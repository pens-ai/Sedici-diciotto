import api from './axios';

export const getProfile = async () => {
  const response = await api.get('/settings/profile');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.put('/settings/profile', data);
  return response.data;
};

export const getCompany = async () => {
  const response = await api.get('/settings/company');
  return response.data;
};

export const updateCompany = async (data) => {
  const response = await api.put('/settings/company', data);
  return response.data;
};

export const updateTheme = async (data) => {
  const response = await api.put('/settings/theme', data);
  return response.data;
};

export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await api.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.put('/settings/password', data);
  return response.data;
};

export const exportData = async () => {
  const response = await api.get('/settings/export-data');
  return response.data;
};

export const deleteAccount = async (password) => {
  const response = await api.delete('/settings/account', { data: { password } });
  return response.data;
};

export const getNotifications = async (params = {}) => {
  const response = await api.get('/settings/notifications', { params });
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.put(`/settings/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.put('/settings/notifications/read-all');
  return response.data;
};
