import prisma from '../config/database.js';
import ical, { ICalCalendarMethod } from 'ical-generator';
import nodeIcal from 'node-ical';
import crypto from 'crypto';

// ============ GENERATE ICAL TOKEN ============

export const generateICalToken = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: req.userId },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    // Generate unique token if not exists
    const token = property.iCalToken || crypto.randomBytes(24).toString('hex');

    await prisma.property.update({
      where: { id: propertyId },
      data: { iCalToken: token },
    });

    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('x-forwarded-host') || req.get('host');
    const baseUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;
    const exportUrl = `${baseUrl}/api/ical/export/${token}.ics`;

    res.json({
      token,
      url: exportUrl,
    });
  } catch (error) {
    next(error);
  }
};

// ============ EXPORT ICAL (PUBLIC) ============

export const exportICalendar = async (req, res, next) => {
  try {
    const { token } = req.params;
    // Remove .ics extension if present
    const cleanToken = token.replace('.ics', '');

    const property = await prisma.property.findUnique({
      where: { iCalToken: cleanToken },
      include: {
        bookings: {
          where: {
            status: { not: 'CANCELLED' },
            checkOut: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
          },
          orderBy: { checkIn: 'asc' },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Calendario non trovato' });
    }

    // Create iCal calendar
    const calendar = ical({
      name: property.name,
      prodId: { company: 'Gestionale Case Vacanza', product: 'Calendar' },
      method: ICalCalendarMethod.PUBLISH,
    });

    // Add bookings as events
    for (const booking of property.bookings) {
      calendar.createEvent({
        id: booking.id,
        start: booking.checkIn,
        end: booking.checkOut,
        allDay: true,
        summary: `${booking.guestName} - ${booking.iCalSource || 'Prenotazione'}`,
        description: `Ospiti: ${booking.numberOfGuests}\nNotti: ${booking.nights}${booking.notes ? '\nNote: ' + booking.notes : ''}`,
        status: booking.status === 'CONFIRMED' ? 'CONFIRMED' : 'TENTATIVE',
      });
    }

    // Set response headers for .ics file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${property.name.replace(/[^a-z0-9]/gi, '_')}.ics"`);
    res.send(calendar.toString());
  } catch (error) {
    next(error);
  }
};

// ============ ADD EXTERNAL ICAL URL ============

export const addICalUrl = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { name, url } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Nome e URL richiesti' });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: req.userId },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    // Get existing URLs or initialize empty array
    const existingUrls = property.iCalUrls || [];

    // Check if URL already exists
    if (existingUrls.some(u => u.url === url)) {
      return res.status(400).json({ error: 'URL già presente' });
    }

    // Add new URL
    const newUrls = [...existingUrls, { id: crypto.randomUUID(), name, url }];

    await prisma.property.update({
      where: { id: propertyId },
      data: { iCalUrls: newUrls },
    });

    res.json({ iCalUrls: newUrls });
  } catch (error) {
    next(error);
  }
};

// ============ REMOVE EXTERNAL ICAL URL ============

export const removeICalUrl = async (req, res, next) => {
  try {
    const { propertyId, urlId } = req.params;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: req.userId },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    const existingUrls = property.iCalUrls || [];
    const newUrls = existingUrls.filter(u => u.id !== urlId);

    await prisma.property.update({
      where: { id: propertyId },
      data: { iCalUrls: newUrls },
    });

    res.json({ iCalUrls: newUrls });
  } catch (error) {
    next(error);
  }
};

// ============ SYNC ICAL (IMPORT FROM EXTERNAL) ============
// Creates CalendarBlocks to show availability, NOT Bookings
// Host will then upload PDFs to create actual bookings with financial data

export const syncICalendar = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: req.userId },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    const iCalUrls = property.iCalUrls || [];

    if (iCalUrls.length === 0) {
      return res.status(400).json({ error: 'Nessun calendario esterno configurato' });
    }

    let imported = 0;
    let updated = 0;
    let errors = [];

    for (const calendarSource of iCalUrls) {
      try {
        // Fetch and parse iCal
        const events = await nodeIcal.async.fromURL(calendarSource.url);

        for (const [key, event] of Object.entries(events)) {
          if (event.type !== 'VEVENT') continue;

          const uid = event.uid;
          const start = new Date(event.start);
          const end = new Date(event.end);

          // Skip invalid dates
          if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

          // Skip past events (ended more than 7 days ago)
          if (end < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) continue;

          // Check if block already exists
          const existing = await prisma.calendarBlock.findFirst({
            where: {
              propertyId: property.id,
              iCalUid: uid,
            },
          });

          const title = event.summary || 'Blocco esterno';
          const notes = event.description || null;

          if (existing) {
            // Update if dates changed
            if (existing.startDate.getTime() !== start.getTime() ||
                existing.endDate.getTime() !== end.getTime() ||
                existing.title !== title) {
              await prisma.calendarBlock.update({
                where: { id: existing.id },
                data: {
                  startDate: start,
                  endDate: end,
                  title,
                  notes,
                },
              });
              updated++;
            }
            continue;
          }

          // Create new calendar block
          await prisma.calendarBlock.create({
            data: {
              propertyId: property.id,
              iCalUid: uid,
              source: calendarSource.name,
              startDate: start,
              endDate: end,
              title,
              notes,
            },
          });

          imported++;
        }
      } catch (err) {
        errors.push({ source: calendarSource.name, error: err.message });
      }
    }

    // Update last sync time
    await prisma.property.update({
      where: { id: propertyId },
      data: { iCalLastSync: new Date() },
    });

    res.json({
      imported,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      lastSync: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

// ============ GET CALENDAR BLOCKS ============

export const getCalendarBlocks = async (req, res, next) => {
  try {
    const { propertyId } = req.query;

    const where = {};

    if (propertyId) {
      // Verify property belongs to user
      const property = await prisma.property.findFirst({
        where: { id: propertyId, userId: req.userId },
      });
      if (!property) {
        return res.status(404).json({ error: 'Proprietà non trovata' });
      }
      where.propertyId = propertyId;
    } else {
      // Get all properties for user
      const userProperties = await prisma.property.findMany({
        where: { userId: req.userId },
        select: { id: true },
      });
      where.propertyId = { in: userProperties.map(p => p.id) };
    }

    // Only get blocks ending in the future (or last 7 days)
    where.endDate = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };

    const blocks = await prisma.calendarBlock.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json(blocks);
  } catch (error) {
    next(error);
  }
};

// ============ GET ICAL SETTINGS ============

export const getICalSettings = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: req.userId },
      select: {
        id: true,
        name: true,
        iCalToken: true,
        iCalUrls: true,
        iCalLastSync: true,
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    // Build export URL if token exists
    let exportUrl = null;
    if (property.iCalToken) {
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
      const host = req.get('x-forwarded-host') || req.get('host');
      const baseUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;
      exportUrl = `${baseUrl}/api/ical/export/${property.iCalToken}.ics`;
    }

    res.json({
      ...property,
      exportUrl,
    });
  } catch (error) {
    next(error);
  }
};
