import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  getCosts,
  getCost,
  createCost,
  updateCost,
  deleteCost,
  getCostCategories,
  getMonthlySummary,
} from '../controllers/costs.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const costValidation = [
  body('categoryId')
    .isUUID()
    .withMessage('Categoria non valida'),
  body('description')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Descrizione non valida'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Importo non valido'),
  body('frequency')
    .optional()
    .isIn(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'])
    .withMessage('Frequenza non valida'),
  body('startDate')
    .isISO8601()
    .withMessage('Data inizio non valida'),
  body('endDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Data fine non valida'),
  body('propertyId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Proprietà non valida'),
];

// Routes
router.get('/', getCosts);
router.get('/categories', getCostCategories);
router.get('/summary', getMonthlySummary);
router.get('/:id', getCost);
router.post('/', validate(costValidation), createCost);
router.put('/:id', updateCost);
router.delete('/:id', deleteCost);

export default router;
