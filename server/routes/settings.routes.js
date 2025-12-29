import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { uploadLogo as uploadLogoMiddleware } from '../middleware/upload.js';
import {
  getProfile,
  updateProfile,
  getCompany,
  updateCompany,
  updateTheme,
  uploadLogo,
  changePassword,
  exportData,
  deleteAccount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/settings.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const profileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome non valido'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Cognome non valido'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email non valida'),
];

const companyValidation = [
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Nome azienda troppo lungo'),
  body('vatNumber')
    .optional()
    .trim(),
  body('fiscalCode')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim(),
  body('companyEmail')
    .optional()
    .isEmail()
    .withMessage('Email non valida'),
];

const themeValidation = [
  body('primaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Colore primario non valido'),
  body('secondaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Colore secondario non valido'),
  body('logoIcon')
    .optional()
    .trim(),
];

const passwordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Password attuale richiesta'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La nuova password deve avere almeno 8 caratteri')
    .matches(/[A-Z]/)
    .withMessage('La password deve contenere almeno una lettera maiuscola')
    .matches(/[0-9]/)
    .withMessage('La password deve contenere almeno un numero'),
];

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', validate(profileValidation), updateProfile);

// Company routes
router.get('/company', getCompany);
router.put('/company', validate(companyValidation), updateCompany);

// Theme routes
router.put('/theme', validate(themeValidation), updateTheme);
router.post('/logo', uploadLogoMiddleware.single('logo'), uploadLogo);

// Security routes
router.put('/password', validate(passwordValidation), changePassword);

// Data routes
router.get('/export-data', exportData);
router.delete('/account', deleteAccount);

// Notification routes
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

export default router;
