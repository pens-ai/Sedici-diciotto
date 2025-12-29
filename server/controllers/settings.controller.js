import prisma from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import path from 'path';
import fs from 'fs/promises';

// Get user profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.body;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email già in uso' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        firstName,
        lastName,
        ...(email && email !== req.user.email && {
          email,
          isEmailVerified: false,
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Get company settings
export const getCompany = async (req, res, next) => {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: req.userId,
          companyName: 'La Mia Azienda',
        },
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Update company settings
export const updateCompany = async (req, res, next) => {
  try {
    const { companyName, vatNumber, fiscalCode, address, phone, companyEmail } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId },
      update: {
        companyName,
        vatNumber,
        fiscalCode,
        address,
        phone,
        companyEmail,
      },
      create: {
        userId: req.userId,
        companyName,
        vatNumber,
        fiscalCode,
        address,
        phone,
        companyEmail,
      },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Update theme settings
export const updateTheme = async (req, res, next) => {
  try {
    const { primaryColor, secondaryColor, logoIcon } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId },
      update: {
        primaryColor,
        secondaryColor,
        logoIcon,
      },
      create: {
        userId: req.userId,
        primaryColor,
        secondaryColor,
        logoIcon,
      },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Upload logo
export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    // Delete old logo if exists
    const currentSettings = await prisma.userSettings.findUnique({
      where: { userId: req.userId },
    });

    if (currentSettings?.companyLogo) {
      try {
        const oldPath = path.join(process.cwd(), currentSettings.companyLogo.replace(/^\//, ''));
        await fs.unlink(oldPath);
      } catch (err) {
        console.error('Error deleting old logo:', err);
      }
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId },
      update: { companyLogo: logoUrl },
      create: {
        userId: req.userId,
        companyLogo: logoUrl,
      },
    });

    res.json({ logoUrl: settings.companyLogo });
  } catch (error) {
    next(error);
  }
};

// Change password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Password attuale non corretta' });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: req.userId },
    });

    res.json({ message: 'Password modificata con successo' });
  } catch (error) {
    next(error);
  }
};

// Export user data (GDPR)
export const exportData = async (req, res, next) => {
  try {
    const userData = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        settings: true,
        properties: {
          include: {
            images: true,
            templates: {
              include: { products: true },
            },
          },
        },
        products: {
          include: { category: true },
        },
        categories: true,
        bookings: {
          include: {
            guests: true,
            productCosts: true,
            channel: true,
          },
        },
        fixedCosts: {
          include: { category: true },
        },
        channels: true,
      },
    });

    // Remove sensitive data
    const { passwordHash, emailVerifyToken, resetPasswordToken, ...safeData } = userData;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=my-data.json');
    res.json(safeData);
  } catch (error) {
    next(error);
  }
};

// Delete account
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Password non corretta' });
    }

    // Delete user (cascade will delete related data)
    await prisma.user.delete({
      where: { id: req.userId },
    });

    res.json({ message: 'Account eliminato con successo' });
  } catch (error) {
    next(error);
  }
};

// Get notifications
export const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly = false, limit = 20 } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId,
        ...(unreadOnly === 'true' && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notifica non trovata' });
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ message: 'Notifica segnata come letta' });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'Tutte le notifiche segnate come lette' });
  } catch (error) {
    next(error);
  }
};
