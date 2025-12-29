import prisma from '../config/database.js';
import { hashPassword, comparePassword, generateRandomToken } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.service.js';

// Create new user (admin only - requires authentication)
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email già registrata' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with email already verified (no email verification needed)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        isEmailVerified: true, // Auto-verify since admin creates the user
        settings: {
          create: {
            companyName: firstName ? `${firstName}'s Company` : 'La Mia Azienda',
          },
        },
        // Create default booking channels
        channels: {
          create: [
            { name: 'Diretto', commissionRate: 0, color: '#10b981' },
            { name: 'Airbnb', commissionRate: 3, color: '#ff5a5f' },
            { name: 'Booking.com', commissionRate: 15, color: '#003580' },
          ],
        },
        // Create default product categories
        categories: {
          create: [
            { name: 'Colazione', slug: 'colazione', icon: 'Coffee', orderIndex: 0 },
            { name: 'Bagno', slug: 'bagno', icon: 'Bath', orderIndex: 1 },
            { name: 'Biancheria', slug: 'biancheria', icon: 'Bed', orderIndex: 2 },
            { name: 'Consumabili', slug: 'consumabili', icon: 'Package', orderIndex: 3 },
            { name: 'Pulizie', slug: 'pulizie', icon: 'Sparkles', orderIndex: 4 },
          ],
        },
      },
      include: { settings: true },
    });

    res.status(201).json({
      message: 'Utente creato con successo.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { settings: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        settings: user.settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.json({ message: 'Logout effettuato con successo' });
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshTokens = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token mancante' });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Refresh token non valido' });
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Clean up expired token
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      return res.status(401).json({ error: 'Refresh token scaduto o non valido' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.userId);

    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
};

// Verify email
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token di verifica non valido' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    res.json({ message: 'Email verificata con successo' });
  } catch (error) {
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'Se l\'email esiste, riceverai le istruzioni per il reset della password.',
      });
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetExpiry,
      },
    });

    // Send reset email
    try {
      await sendPasswordResetEmail(email, resetToken, user.firstName);
    } catch (emailError) {
      console.error('Error sending reset email:', emailError);
    }

    res.json({
      message: 'Se l\'email esiste, riceverai le istruzioni per il reset della password.',
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Invalidate all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    res.json({ message: 'Password reimpostata con successo' });
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { settings: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      settings: user.settings,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// Resend verification email
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({ message: 'Se l\'email esiste, riceverai il link di verifica.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email già verificata' });
    }

    // Generate new token
    const emailVerifyToken = generateRandomToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken },
    });

    try {
      await sendVerificationEmail(email, emailVerifyToken, user.firstName);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    res.json({ message: 'Se l\'email esiste, riceverai il link di verifica.' });
  } catch (error) {
    next(error);
  }
};
