import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const propertyDir = path.join(uploadDir, 'properties');
    if (!fs.existsSync(propertyDir)) {
      fs.mkdirSync(propertyDir, { recursive: true });
    }
    cb(null, propertyDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo di file non supportato. Usa: JPG, PNG o WebP'), false);
  }
};

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    files: 10, // Max 10 files at once
  },
});

// Logo upload storage
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const logoDir = path.join(uploadDir, 'logos');
    if (!fs.existsSync(logoDir)) {
      fs.mkdirSync(logoDir, { recursive: true });
    }
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `logo-${req.userId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const uploadLogo = multer({
  storage: logoStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for logos
    files: 1,
  },
});

// Document upload storage (for guest ID photos)
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docDir = path.join(uploadDir, 'documents');
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }
    cb(null, docDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `doc-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for documents
    files: 1,
  },
});
