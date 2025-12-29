import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImages as uploadMiddleware } from '../middleware/upload.js';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadImages,
  deleteImage,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/properties.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const propertyValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Il nome deve avere tra 2 e 255 caratteri'),
  body('beds')
    .isInt({ min: 1 })
    .withMessage('Numero di posti letto non valido'),
  body('bathrooms')
    .isInt({ min: 1 })
    .withMessage('Numero di bagni non valido'),
  body('description')
    .optional()
    .trim(),
  body('address')
    .optional()
    .trim(),
  body('squareMeters')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Metri quadri non validi'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE'])
    .withMessage('Stato non valido'),
];

const templateValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Il nome deve avere tra 2 e 255 caratteri'),
  body('minGuests')
    .isInt({ min: 1 })
    .withMessage('Minimo ospiti non valido'),
  body('maxGuests')
    .isInt({ min: 1 })
    .withMessage('Massimo ospiti non valido'),
  body('products')
    .optional()
    .isArray()
    .withMessage('I prodotti devono essere un array'),
  body('products.*.productId')
    .optional()
    .isUUID()
    .withMessage('ID prodotto non valido'),
  body('products.*.quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantità non valida'),
];

// Property routes
router.get('/', getProperties);
router.get('/:id', getProperty);
router.post('/', validate(propertyValidation), createProperty);
router.put('/:id', validate(propertyValidation), updateProperty);
router.delete('/:id', deleteProperty);

// Image routes
router.post('/:id/images', uploadMiddleware.array('images', 10), uploadImages);
router.delete('/:id/images/:imageId', deleteImage);

// Template routes
router.get('/:id/templates', getTemplates);
router.post('/:id/templates', validate(templateValidation), createTemplate);
router.put('/:id/templates/:templateId', validate(templateValidation), updateTemplate);
router.delete('/:id/templates/:templateId', deleteTemplate);

export default router;
