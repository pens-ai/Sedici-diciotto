import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  getMe,
  getUsers,
} from '../controllers/auth.controller.js';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email non valida')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La password deve avere almeno 8 caratteri')
    .matches(/[A-Z]/)
    .withMessage('La password deve contenere almeno una lettera maiuscola')
    .matches(/[0-9]/)
    .withMessage('La password deve contenere almeno un numero'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Il nome deve avere tra 2 e 100 caratteri'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Il cognome deve avere tra 2 e 100 caratteri'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email non valida')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password richiesta'),
];

const passwordValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('La password deve avere almeno 8 caratteri')
    .matches(/[A-Z]/)
    .withMessage('La password deve contenere almeno una lettera maiuscola')
    .matches(/[0-9]/)
    .withMessage('La password deve contenere almeno un numero'),
];

// Routes
// Register requires authentication (only logged-in users can create new accounts)
router.post('/register', authenticate, validate(registerValidation), register);
router.post('/login', authLimiter, validate(loginValidation), login);
router.post('/logout', logout);
router.post('/refresh', refreshTokens);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, validate(passwordValidation), resetPassword);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, getUsers);

export default router;
