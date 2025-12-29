import prisma from '../config/database.js';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval, startOfYear, endOfYear, differenceInDays } from 'date-fns';

// Get overview statistics
export const getOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : startOfMonth(new Date());
    const end = endDate ? new Date(endDate) : endOfMonth(new Date());

    // Previous period for comparison
    const periodLength = differenceInDays(end, start);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - periodLength - 1);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    // Current period bookings
    const currentBookings = await prisma.booking.findMany({
      where: {
        userId: req.userId,
        status: { not: 'CANCELLED' },
        checkIn: { gte: start, lte: end },
      },
    });

    // Previous period bookings
    const prevBookings = await prisma.booking.findMany({
      where: {
        userId: req.userId,
        status: { not: 'CANCELLED' },
        checkIn: { gte: prevStart, lte: prevEnd },
      },
    });

    // Fixed costs for the period
    const fixedCosts = await prisma.fixedCost.findMany({
      where: {
        userId: req.userId,
        isActive: true,
        startDate: { lte: end },
        OR: [
          { endDate: null },
          { endDate: { gte: start } },
        ],
      },
    });

    // Calculate metrics
    const currentMetrics = {
      bookings: currentBookings.length,
      grossRevenue: currentBookings.reduce((sum, b) => sum + parseFloat(b.grossRevenue), 0),
      netRevenue: currentBookings.reduce((sum, b) => sum + parseFloat(b.netRevenue), 0),
      variableCosts: currentBookings.reduce((sum, b) => sum + parseFloat(b.variableCosts), 0),
      nights: currentBookings.reduce((sum, b) => sum + b.nights, 0),
    };

    const prevMetrics = {
      bookings: prevBookings.length,
      grossRevenue: prevBookings.reduce((sum, b) => sum + parseFloat(b.grossRevenue), 0),
      netRevenue: prevBookings.reduce((sum, b) => sum + parseFloat(b.netRevenue), 0),
    };

    // Calculate monthly fixed costs
    const months = Math.max(1, Math.ceil(periodLength / 30));
    let totalFixedCosts = 0;
    fixedCosts.forEach(cost => {
      const amount = parseFloat(cost.amount);
      switch (cost.frequency) {
        case 'MONTHLY':
          totalFixedCosts += amount * months;
          break;
        case 'QUARTERLY':
          totalFixedCosts += (amount / 3) * months;
          break;
        case 'YEARLY':
          totalFixedCosts += (amount / 12) * months;
          break;
        case 'ONE_TIME':
          totalFixedCosts += amount;
          break;
      }
    });

    const netMargin = currentMetrics.netRevenue - currentMetrics.variableCosts - totalFixedCosts;

    // Calculate changes
    const calcChange = (current, prev) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    res.json({
      period: { start, end },
      bookings: {
        total: currentMetrics.bookings,
        change: calcChange(currentMetrics.bookings, prevMetrics.bookings),
      },
      grossRevenue: {
        total: Math.round(currentMetrics.grossRevenue * 100) / 100,
        change: calcChange(currentMetrics.grossRevenue, prevMetrics.grossRevenue),
      },
      netRevenue: {
        total: Math.round(currentMetrics.netRevenue * 100) / 100,
        change: calcChange(currentMetrics.netRevenue, prevMetrics.netRevenue),
      },
      variableCosts: {
        total: Math.round(currentMetrics.variableCosts * 100) / 100,
      },
      fixedCosts: {
        total: Math.round(totalFixedCosts * 100) / 100,
      },
      netMargin: {
        total: Math.round(netMargin * 100) / 100,
      },
      totalNights: currentMetrics.nights,
    });
  } catch (error) {
    next(error);
  }
};

// Get revenue trends
export const getRevenueTrends = async (req, res, next) => {
  try {
    const { months: monthsParam = 12 } = req.query;
    const monthsCount = parseInt(monthsParam);

    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(end, monthsCount - 1));

    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId,
        status: { not: 'CANCELLED' },
        checkIn: { gte: start, lte: end },
      },
      orderBy: { checkIn: 'asc' },
    });

    // Group by month
    const months = eachMonthOfInterval({ start, end });
    const trends = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthBookings = bookings.filter(b => {
        const checkIn = new Date(b.checkIn);
        return checkIn >= monthStart && checkIn <= monthEnd;
      });

      return {
        month: format(month, 'yyyy-MM'),
        label: format(month, 'MMM yyyy'),
        bookings: monthBookings.length,
        grossRevenue: Math.round(monthBookings.reduce((sum, b) => sum + parseFloat(b.grossRevenue), 0) * 100) / 100,
        netRevenue: Math.round(monthBookings.reduce((sum, b) => sum + parseFloat(b.netRevenue), 0) * 100) / 100,
        variableCosts: Math.round(monthBookings.reduce((sum, b) => sum + parseFloat(b.variableCosts), 0) * 100) / 100,
        netMargin: Math.round(monthBookings.reduce((sum, b) => sum + parseFloat(b.netMargin), 0) * 100) / 100,
        nights: monthBookings.reduce((sum, b) => sum + b.nights, 0),
      };
    });

    res.json(trends);
  } catch (error) {
    next(error);
  }
};

// Get occupancy rates
export const getOccupancyRates = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const start = startOfYear(new Date(parseInt(year), 0, 1));
    const end = endOfYear(new Date(parseInt(year), 0, 1));
    const daysInYear = differenceInDays(end, start) + 1;

    const properties = await prisma.property.findMany({
      where: { userId: req.userId, status: 'ACTIVE' },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId,
        status: { not: 'CANCELLED' },
        OR: [
          { checkIn: { gte: start, lte: end } },
          { checkOut: { gte: start, lte: end } },
          { AND: [{ checkIn: { lte: start } }, { checkOut: { gte: end } }] },
        ],
      },
    });

    const occupancy = properties.map(property => {
      const propertyBookings = bookings.filter(b => b.propertyId === property.id);

      // Calculate occupied nights within the year
      let occupiedNights = 0;
      propertyBookings.forEach(b => {
        const bookingStart = new Date(b.checkIn) < start ? start : new Date(b.checkIn);
        const bookingEnd = new Date(b.checkOut) > end ? end : new Date(b.checkOut);
        occupiedNights += Math.max(0, differenceInDays(bookingEnd, bookingStart));
      });

      const occupancyRate = Math.round((occupiedNights / daysInYear) * 100);

      return {
        propertyId: property.id,
        propertyName: property.name,
        occupiedNights,
        availableNights: daysInYear - occupiedNights,
        occupancyRate,
        bookingsCount: propertyBookings.length,
      };
    });

    // Overall occupancy
    const totalOccupiedNights = occupancy.reduce((sum, p) => sum + p.occupiedNights, 0);
    const totalAvailableNights = properties.length * daysInYear;
    const overallOccupancy = totalAvailableNights > 0
      ? Math.round((totalOccupiedNights / totalAvailableNights) * 100)
      : 0;

    res.json({
      year: parseInt(year),
      overall: {
        occupancyRate: overallOccupancy,
        totalOccupiedNights,
        totalAvailableNights,
      },
      byProperty: occupancy,
    });
  } catch (error) {
    next(error);
  }
};

// Get property performance
export const getPropertyPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : startOfYear(new Date());
    const end = endDate ? new Date(endDate) : endOfYear(new Date());

    const properties = await prisma.property.findMany({
      where: { userId: req.userId },
      include: {
        bookings: {
          where: {
            status: { not: 'CANCELLED' },
            checkIn: { gte: start, lte: end },
          },
        },
        fixedCosts: {
          where: {
            isActive: true,
            startDate: { lte: end },
            OR: [
              { endDate: null },
              { endDate: { gte: start } },
            ],
          },
        },
      },
    });

    const months = Math.max(1, Math.ceil(differenceInDays(end, start) / 30));

    const performance = properties.map(property => {
      const grossRevenue = property.bookings.reduce((sum, b) => sum + parseFloat(b.grossRevenue), 0);
      const netRevenue = property.bookings.reduce((sum, b) => sum + parseFloat(b.netRevenue), 0);
      const variableCosts = property.bookings.reduce((sum, b) => sum + parseFloat(b.variableCosts), 0);

      let fixedCostsTotal = 0;
      property.fixedCosts.forEach(cost => {
        const amount = parseFloat(cost.amount);
        switch (cost.frequency) {
          case 'MONTHLY':
            fixedCostsTotal += amount * months;
            break;
          case 'QUARTERLY':
            fixedCostsTotal += (amount / 3) * months;
            break;
          case 'YEARLY':
            fixedCostsTotal += (amount / 12) * months;
            break;
          case 'ONE_TIME':
            fixedCostsTotal += amount;
            break;
        }
      });

      const netMargin = netRevenue - variableCosts - fixedCostsTotal;
      const nights = property.bookings.reduce((sum, b) => sum + b.nights, 0);

      return {
        propertyId: property.id,
        propertyName: property.name,
        bookingsCount: property.bookings.length,
        nights,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        variableCosts: Math.round(variableCosts * 100) / 100,
        fixedCosts: Math.round(fixedCostsTotal * 100) / 100,
        netMargin: Math.round(netMargin * 100) / 100,
        avgRevenuePerNight: nights > 0 ? Math.round((grossRevenue / nights) * 100) / 100 : 0,
      };
    });

    // Sort by net margin descending
    performance.sort((a, b) => b.netMargin - a.netMargin);

    res.json(performance);
  } catch (error) {
    next(error);
  }
};

// Get channel breakdown
export const getChannelBreakdown = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : startOfYear(new Date());
    const end = endDate ? new Date(endDate) : endOfYear(new Date());

    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId,
        status: { not: 'CANCELLED' },
        checkIn: { gte: start, lte: end },
      },
      include: { channel: true },
    });

    // Group by channel
    const channelMap = new Map();

    bookings.forEach(b => {
      const channelName = b.channel?.name || 'Diretto';
      const channelColor = b.channel?.color || '#22c55e';

      if (!channelMap.has(channelName)) {
        channelMap.set(channelName, {
          name: channelName,
          color: channelColor,
          bookings: 0,
          grossRevenue: 0,
          commissions: 0,
          netRevenue: 0,
        });
      }

      const channel = channelMap.get(channelName);
      channel.bookings += 1;
      channel.grossRevenue += parseFloat(b.grossRevenue);
      channel.commissions += parseFloat(b.commissionAmount);
      channel.netRevenue += parseFloat(b.netRevenue);
    });

    const breakdown = Array.from(channelMap.values()).map(c => ({
      ...c,
      grossRevenue: Math.round(c.grossRevenue * 100) / 100,
      commissions: Math.round(c.commissions * 100) / 100,
      netRevenue: Math.round(c.netRevenue * 100) / 100,
      percentage: bookings.length > 0 ? Math.round((c.bookings / bookings.length) * 100) : 0,
    }));

    // Sort by bookings descending
    breakdown.sort((a, b) => b.bookings - a.bookings);

    res.json(breakdown);
  } catch (error) {
    next(error);
  }
};

// Get upcoming bookings
export const getUpcomingBookings = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        checkIn: { gte: today },
      },
      include: {
        property: true,
        channel: true,
      },
      orderBy: { checkIn: 'asc' },
      take: parseInt(limit),
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};
