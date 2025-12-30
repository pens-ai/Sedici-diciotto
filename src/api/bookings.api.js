import api from './axios';

export const getBookings = async (params = {}) => {
  const response = await api.get('/bookings', { params });
  return response.data;
};

export const getBooking = async (id) => {
  const response = await api.get(`/bookings/${id}`);
  return response.data;
};

export const createBooking = async (data) => {
  const response = await api.post('/bookings', data);
  return response.data;
};

export const updateBooking = async (id, data) => {
  const response = await api.put(`/bookings/${id}`, data);
  return response.data;
};

export const updateBookingStatus = async (id, status) => {
  const response = await api.patch(`/bookings/${id}/status`, { status });
  return response.data;
};

export const deleteBooking = async (id) => {
  const response = await api.delete(`/bookings/${id}`);
  return response.data;
};

export const getCalendar = async (params) => {
  const response = await api.get('/bookings/calendar', { params });
  return response.data;
};

export const checkAvailability = async (params) => {
  const response = await api.get('/bookings/check-availability', { params });
  return response.data;
};

// Guest registry
export const addGuest = async (bookingId, data) => {
  const response = await api.post(`/bookings/${bookingId}/guests`, data);
  return response.data;
};

export const updateGuest = async (bookingId, guestId, data) => {
  const response = await api.put(`/bookings/${bookingId}/guests/${guestId}`, data);
  return response.data;
};

export const deleteGuest = async (bookingId, guestId) => {
  const response = await api.delete(`/bookings/${bookingId}/guests/${guestId}`);
  return response.data;
};

// Channels
export const getChannels = async () => {
  const response = await api.get('/bookings/channels/all');
  return response.data;
};

export const createChannel = async (data) => {
  const response = await api.post('/bookings/channels', data);
  return response.data;
};

export const updateChannel = async (id, data) => {
  const response = await api.put(`/bookings/channels/${id}`, data);
  return response.data;
};

export const deleteChannel = async (id) => {
  const response = await api.delete(`/bookings/channels/${id}`);
  return response.data;
};

// Import bookings from XLS
export const importBookings = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  // Don't set Content-Type header - axios will set it automatically with boundary
  const response = await api.post('/bookings/import', formData);
  return response.data;
};

// Parse PDF for booking data (Booking.com, etc.)
export const parsePDF = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);
  const response = await api.post('/pdf-import/parse', formData);
  return response.data;
};

// Import booking from parsed PDF data
export const importBookingFromPDF = async (propertyId, parsedData) => {
  const response = await api.post('/pdf-import/import', { propertyId, parsedData });
  return response.data;
};
