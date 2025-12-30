import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { parsePDF, importBookingFromPDF } from '../controllers/pdfImport.controller.js';

const router = express.Router();

// Configure multer for memory storage (no disk save)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo file PDF sono accettati'), false);
    }
  },
});

// Parse PDF and return extracted data (preview)
router.post('/parse', authenticate, upload.single('pdf'), parsePDF);

// Import booking from parsed data
router.post('/import', authenticate, importBookingFromPDF);

export default router;
