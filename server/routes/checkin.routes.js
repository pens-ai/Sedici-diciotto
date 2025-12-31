import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadDocument } from '../middleware/upload.js';
import {
  generateCheckInToken,
  getBookingByToken,
  submitGuestData,
  uploadDocumentPhoto,
  getBookingGuests,
  confirmGuest,
  confirmAllGuests,
  generateAlloggiatiTxt,
  generateRoss1000Xml,
  getReferenceData,
  resetGuestData,
  searchComuni,
  getComuneByCode,
} from '../controllers/checkin.controller.js';

const router = Router();

// ============ PUBLIC ROUTES (for guests) ============

// Get booking info by token
router.get('/public/:token', getBookingByToken);

// Submit guest data
router.post('/public/:token/guests', submitGuestData);

// Upload document photo
router.post('/public/:token/guests/:guestId/document', uploadDocument.single('document'), uploadDocumentPhoto);

// Get reference data (countries, provinces, document types)
router.get('/reference-data', getReferenceData);

// Search Italian comuni (for autocomplete)
router.get('/comuni', searchComuni);

// Get comune by ISTAT code
router.get('/comuni/:codice', getComuneByCode);

// ============ AUTHENTICATED ROUTES (for hosts) ============

// Generate check-in token for a booking
router.post('/bookings/:bookingId/token', authenticate, generateCheckInToken);

// Get guests for a booking
router.get('/bookings/:bookingId/guests', authenticate, getBookingGuests);

// Confirm a single guest
router.put('/bookings/:bookingId/guests/:guestId/confirm', authenticate, confirmGuest);

// Confirm all guests
router.put('/bookings/:bookingId/confirm-all', authenticate, confirmAllGuests);

// Generate Alloggiati Web TXT file
router.get('/bookings/:bookingId/alloggiati', authenticate, generateAlloggiatiTxt);

// Generate ROSS1000 XML file (SIT Basilicata)
router.get('/bookings/:bookingId/ross1000', authenticate, generateRoss1000Xml);

// Reset guest data (delete all guests and reopen link)
router.delete('/bookings/:bookingId/guests', authenticate, resetGuestData);

export default router;
