import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getOverview,
  getRevenueTrends,
  getOccupancyRates,
  getPropertyPerformance,
  getChannelBreakdown,
  getUpcomingBookings,
} from '../controllers/analytics.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/overview', getOverview);
router.get('/revenue-trends', getRevenueTrends);
router.get('/occupancy-rates', getOccupancyRates);
router.get('/property-performance', getPropertyPerformance);
router.get('/channel-breakdown', getChannelBreakdown);
router.get('/upcoming-bookings', getUpcomingBookings);

export default router;
