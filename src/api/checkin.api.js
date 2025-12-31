import api from './axios';

// ============ PUBLIC API (no auth required) ============

export const getBookingByToken = async (token) => {
  const response = await api.get(`/checkin/public/${token}`);
  return response.data;
};

export const submitGuestData = async (token, guests) => {
  const response = await api.post(`/checkin/public/${token}/guests`, { guests });
  return response.data;
};

export const uploadDocumentPhoto = async (token, guestId, file, side) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('side', side);
  const response = await api.post(`/checkin/public/${token}/guests/${guestId}/document`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getReferenceData = async () => {
  const response = await api.get('/checkin/reference-data');
  return response.data;
};

// ============ AUTHENTICATED API (host only) ============

export const generateCheckInToken = async (bookingId) => {
  const response = await api.post(`/checkin/bookings/${bookingId}/token`);
  return response.data;
};

export const getBookingGuests = async (bookingId) => {
  const response = await api.get(`/checkin/bookings/${bookingId}/guests`);
  return response.data;
};

export const confirmGuest = async (bookingId, guestId) => {
  const response = await api.put(`/checkin/bookings/${bookingId}/guests/${guestId}/confirm`);
  return response.data;
};

export const confirmAllGuests = async (bookingId) => {
  const response = await api.put(`/checkin/bookings/${bookingId}/confirm-all`);
  return response.data;
};

export const downloadAlloggiatiTxt = async (bookingId) => {
  const response = await api.get(`/checkin/bookings/${bookingId}/alloggiati`, {
    responseType: 'blob',
  });
  return response.data;
};

// Download ROSS1000 XML for SIT Basilicata
export const downloadRoss1000Xml = async (bookingId, options = {}) => {
  const params = new URLSearchParams();
  if (options.codiceStruttura) params.append('codiceStruttura', options.codiceStruttura);
  if (options.tipoTurismo) params.append('tipoTurismo', options.tipoTurismo);
  if (options.mezzoTrasporto) params.append('mezzoTrasporto', options.mezzoTrasporto);
  if (options.canalePrenotazione) params.append('canalePrenotazione', options.canalePrenotazione);

  const queryString = params.toString();
  const url = `/checkin/bookings/${bookingId}/ross1000${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url, {
    responseType: 'blob',
  });
  return response.data;
};

export const resetGuestData = async (bookingId) => {
  const response = await api.delete(`/checkin/bookings/${bookingId}/guests`);
  return response.data;
};
