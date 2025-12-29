import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  importProducts,
  exportProducts,
} from '../controllers/products.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

// Validation rules
const productValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Il nome deve avere tra 2 e 255 caratteri'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Prezzo non valido'),
  body('unit')
    .trim()
    .notEmpty()
    .withMessage('Unità di misura richiesta'),
  body('categoryId')
    .isUUID()
    .withMessage('Categoria non valida'),
  body('description')
    .optional()
    .trim(),
  body('stockQuantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantità in stock non valida'),
  body('lowStockThreshold')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Soglia di stock non valida'),
];

const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Il nome deve avere tra 2 e 100 caratteri'),
  body('slug')
    .optional()
    .trim()
    .isSlug()
    .withMessage('Slug non valido'),
  body('icon')
    .optional()
    .trim(),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Colore non valido (formato: #RRGGBB)'),
];

// Product routes
router.get('/', getProducts);
router.get('/export', exportProducts);
router.get('/:id', getProduct);
router.post('/', validate(productValidation), createProduct);
router.post('/import', upload.single('file'), importProducts);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Category routes
router.get('/categories/all', getCategories);
router.post('/categories', validate(categoryValidation), createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;
