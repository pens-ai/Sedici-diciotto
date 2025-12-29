import api from './axios';

export const getOverview = async (params = {}) => {
  const response = await api.get('/analytics/overview', { params });
  return response.data;
};

export const getRevenueTrends = async (params = {}) => {
  const response = await api.get('/analytics/revenue-trends', { params });
  return response.data;
};

export const getOccupancyRates = async (params = {}) => {
  const response = await api.get('/analytics/occupancy-rates', { params });
  return response.data;
};

export const getPropertyPerformance = async (params = {}) => {
  const response = await api.get('/analytics/property-performance', { params });
  return response.data;
};

export const getChannelBreakdown = async (params = {}) => {
  const response = await api.get('/analytics/channel-breakdown', { params });
  return response.data;
};

export const getUpcomingBookings = async (params = {}) => {
  const response = await api.get('/analytics/upcoming-bookings', { params });
  return response.data;
};
