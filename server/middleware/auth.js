import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { jwtConfig } from '../config/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Accesso non autorizzato',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, jwtConfig.secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { settings: true }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Utente non trovato',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token scaduto',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token non valido',
        code: 'INVALID_TOKEN'
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Errore di autenticazione' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtConfig.secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { settings: true }
    });

    if (user) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // Token invalid or expired, continue without user
    next();
  }
};
