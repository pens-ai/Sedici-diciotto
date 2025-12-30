import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import propertiesRoutes from './routes/properties.routes.js';
import productsRoutes from './routes/products.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import costsRoutes from './routes/costs.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import icalRoutes from './routes/ical.routes.js';
import templatesRoutes from './routes/templates.routes.js';
import pdfImportRoutes from './routes/pdfImport.routes.js';
import { startIcalSyncJob } from './jobs/icalSync.job.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // In production, allow same origin (frontend served from same server)
    if (isProduction) return callback(null, true);

    // Allow localhost and local network IPs in development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
    ];

    const isAllowed = allowedOrigins.some(allowed =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rate limiting (disabled for development)
// app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/costs', costsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/ical', icalRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/pdf-import', pdfImportRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));

  // Handle React routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// 404 handler (only for API routes in production)
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Server running on http://localhost:${PORT}
📝 Environment: ${process.env.NODE_ENV || 'development'}
🔗 API Base URL: http://localhost:${PORT}/api
  `);

  // Start iCal automatic sync job
  startIcalSyncJob();
});

export default app;
