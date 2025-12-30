import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from '../controllers/templates.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.get('/', getTemplates);
router.get('/:id', getTemplate);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);
router.post('/:id/duplicate', duplicateTemplate);

export default router;
