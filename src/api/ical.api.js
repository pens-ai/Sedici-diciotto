import api from './axios';

export const getICalSettings = async (propertyId) => {
  const response = await api.get(`/ical/settings/${propertyId}`);
  return response.data;
};

export const generateICalToken = async (propertyId) => {
  const response = await api.post(`/ical/generate-token/${propertyId}`);
  return response.data;
};

export const addICalUrl = async (propertyId, data) => {
  const response = await api.post(`/ical/add-url/${propertyId}`, data);
  return response.data;
};

export const removeICalUrl = async (propertyId, urlId) => {
  const response = await api.delete(`/ical/remove-url/${propertyId}/${urlId}`);
  return response.data;
};

export const syncICalendar = async (propertyId) => {
  const response = await api.post(`/ical/sync/${propertyId}`);
  return response.data;
};

export const resetCalendarBlocks = async (propertyId) => {
  const response = await api.delete(`/ical/reset/${propertyId}`);
  return response.data;
};
