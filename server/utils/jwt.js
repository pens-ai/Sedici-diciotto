import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    jwtConfig.secret,
    { expiresIn: jwtConfig.accessExpiry }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiry }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, jwtConfig.secret);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtConfig.refreshSecret);
};

export const getRefreshTokenExpiry = () => {
  const expiry = jwtConfig.refreshExpiry;
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1));

  const now = new Date();

  switch (unit) {
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
    default:
      now.setDate(now.getDate() + 7); // Default 7 days
  }

  return now;
};
