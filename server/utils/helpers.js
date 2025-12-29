import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export const calculateNights = (checkIn, checkOut) => {
  const start = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn;
  const end = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut;
  return differenceInDays(end, start);
};

export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

export const getMonthRange = (year, month) => {
  const date = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

export const calculateCommission = (grossRevenue, commissionRate) => {
  const gross = parseFloat(grossRevenue);
  const rate = parseFloat(commissionRate) / 100;
  const commission = gross * rate;
  const net = gross - commission;

  return {
    commissionAmount: Math.round(commission * 100) / 100,
    netRevenue: Math.round(net * 100) / 100,
  };
};

export const calculateBookingMargin = (netRevenue, variableCosts) => {
  const net = parseFloat(netRevenue);
  const costs = parseFloat(variableCosts);
  return Math.round((net - costs) * 100) / 100;
};

export const paginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const sanitizeFilename = (filename) => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};
