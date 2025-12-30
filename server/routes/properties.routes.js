import { Router } from 'express';
import { body } from 'express-validator';
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

// Property routes
router.get('/', getProperties);
router.get('/:id', getProperty);
router.post('/', validate(propertyValidation), createProperty);
router.put('/:id', validate(propertyValidation), updateProperty);
router.delete('/:id', deleteProperty);

// Image routes
router.post('/:id/images', uploadMiddleware.array('images', 10), uploadImages);
router.delete('/:id/images/:imageId', deleteImage);

export default router;
