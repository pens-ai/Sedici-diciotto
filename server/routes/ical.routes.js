import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  generateICalToken,
  exportICalendar,
  addICalUrl,
  removeICalUrl,
  syncICalendar,
  getICalSettings,
  getCalendarBlocks,
} from '../controllers/ical.controller.js';

const router = Router();

// Public route - export calendar (no auth required, token in URL)
router.get('/export/:token', exportICalendar);

// Protected routes - require authentication
router.get('/blocks', authenticate, getCalendarBlocks);
router.get('/settings/:propertyId', authenticate, getICalSettings);
router.post('/generate-token/:propertyId', authenticate, generateICalToken);
router.post('/add-url/:propertyId', authenticate, addICalUrl);
router.delete('/remove-url/:propertyId/:urlId', authenticate, removeICalUrl);
router.post('/sync/:propertyId', authenticate, syncICalendar);

export default router;
