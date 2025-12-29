import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  getBookings,
  getCalendar,
  checkAvailability,
  getBooking,
  createBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  addGuest,
  updateGuest,
  deleteGuest,
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  importBookings,
} from '../controllers/bookings.controller.js';

// Multer config for XLS upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xls|xlsx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Solo file XLS/XLSX sono permessi'));
    }
  },
});

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const bookingValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Proprietà non valida'),
  body('guestName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome ospite non valido'),
  body('checkIn')
    .isISO8601()
    .withMessage('Data check-in non valida'),
  body('checkOut')
    .isISO8601()
    .withMessage('Data check-out non valida'),
  body('numberOfGuests')
    .isInt({ min: 1 })
    .withMessage('Numero ospiti non valido'),
  body('grossRevenue')
    .isFloat({ min: 0 })
    .withMessage('Ricavo lordo non valido'),
  body('guestEmail')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Email non valida'),
  body('guestPhone')
    .optional({ values: 'falsy' })
    .trim(),
  body('channelId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Canale non valido'),
];

const guestValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome non valido'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Cognome non valido'),
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Data di nascita non valida'),
  body('documentType')
    .optional()
    .isIn(['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE'])
    .withMessage('Tipo documento non valido'),
];

const channelValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome canale non valido'),
  body('commissionRate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commissione non valida (0-100%)'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Colore non valido'),
];

// Booking routes
router.get('/', getBookings);
router.get('/calendar', getCalendar);
router.get('/check-availability', checkAvailability);
router.post('/import', upload.single('file'), importBookings);
router.get('/:id', getBooking);
router.post('/', validate(bookingValidation), createBooking);
router.put('/:id', updateBooking);
router.patch('/:id/status', updateBookingStatus);
router.delete('/:id', deleteBooking);

// Guest routes
router.post('/:id/guests', validate(guestValidation), addGuest);
router.put('/:id/guests/:guestId', updateGuest);
router.delete('/:id/guests/:guestId', deleteGuest);

// Channel routes
router.get('/channels/all', getChannels);
router.post('/channels', validate(channelValidation), createChannel);
router.put('/channels/:id', updateChannel);
router.delete('/channels/:id', deleteChannel);

export default router;
