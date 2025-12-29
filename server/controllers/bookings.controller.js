import prisma from '../config/database.js';
import { paginationMeta, calculateNights, calculateCommission, calculateBookingMargin, getMonthRange } from '../utils/helpers.js';
import * as XLSX from 'xlsx';

// Get all bookings
export const getBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, propertyId, status, startDate, endDate, channelId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.userId,
      ...(propertyId && { propertyId }),
      ...(status && { status }),
      ...(channelId && { channelId }),
      ...(startDate && endDate && {
        OR: [
          { checkIn: { gte: new Date(startDate), lte: new Date(endDate) } },
          { checkOut: { gte: new Date(startDate), lte: new Date(endDate) } },
          { AND: [{ checkIn: { lte: new Date(startDate) } }, { checkOut: { gte: new Date(endDate) } }] },
        ],
      }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          property: true,
          channel: true,
          guests: true,
          productCosts: {
            include: { product: true },
          },
        },
        orderBy: { checkIn: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      data: bookings,
      meta: paginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get calendar data
export const getCalendar = async (req, res, next) => {
  try {
    const { year, month, propertyId } = req.query;

    const { start, end } = getMonthRange(parseInt(year), parseInt(month));

    const where = {
      userId: req.userId,
      ...(propertyId && { propertyId }),
      OR: [
        { checkIn: { gte: start, lte: end } },
        { checkOut: { gte: start, lte: end } },
        { AND: [{ checkIn: { lte: start } }, { checkOut: { gte: end } }] },
      ],
    };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        property: true,
        channel: true,
      },
      orderBy: { checkIn: 'asc' },
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

// Check availability
export const checkAvailability = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, excludeBookingId } = req.query;

    const where = {
      propertyId,
      status: { notIn: ['CANCELLED'] },
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
      OR: [
        { AND: [{ checkIn: { lte: new Date(checkIn) } }, { checkOut: { gt: new Date(checkIn) } }] },
        { AND: [{ checkIn: { lt: new Date(checkOut) } }, { checkOut: { gte: new Date(checkOut) } }] },
        { AND: [{ checkIn: { gte: new Date(checkIn) } }, { checkOut: { lte: new Date(checkOut) } }] },
      ],
    };

    const conflicting = await prisma.booking.findMany({
      where,
      select: { id: true, checkIn: true, checkOut: true, guestName: true },
    });

    res.json({
      available: conflicting.length === 0,
      conflicts: conflicting,
    });
  } catch (error) {
    next(error);
  }
};

// Get single booking
export const getBooking = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        property: true,
        channel: true,
        guests: true,
        productCosts: {
          include: { product: true },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// Create booking
export const createBooking = async (req, res, next) => {
  try {
    const {
      propertyId,
      channelId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      numberOfGuests,
      grossRevenue,
      specialRequests,
      notes,
      products,
    } = req.body;

    // Calculate nights
    const nights = calculateNights(checkIn, checkOut);

    // Get channel commission rate
    let commissionRate = 0;
    if (channelId) {
      const channel = await prisma.bookingChannel.findUnique({
        where: { id: channelId },
      });
      if (channel) {
        commissionRate = parseFloat(channel.commissionRate);
      }
    }

    // Calculate financials
    const { commissionAmount, netRevenue } = calculateCommission(grossRevenue, commissionRate);

    // Calculate variable costs from products
    let variableCosts = 0;
    if (products && products.length > 0) {
      for (const p of products) {
        const product = await prisma.product.findUnique({ where: { id: p.productId } });
        if (product) {
          variableCosts += parseFloat(product.price) * parseFloat(p.quantity) * nights;
        }
      }
    }

    const netMargin = calculateBookingMargin(netRevenue, variableCosts);

    const booking = await prisma.booking.create({
      data: {
        userId: req.userId,
        propertyId,
        channelId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        nights,
        numberOfGuests: parseInt(numberOfGuests),
        grossRevenue: parseFloat(grossRevenue),
        commissionRate,
        commissionAmount,
        netRevenue,
        variableCosts,
        netMargin,
        specialRequests,
        notes,
        productCosts: products?.length > 0 ? {
          create: await Promise.all(products.map(async (p) => {
            const product = await prisma.product.findUnique({ where: { id: p.productId } });
            const totalPrice = parseFloat(product.price) * parseFloat(p.quantity) * nights;
            return {
              productId: p.productId,
              productName: product.name,
              quantity: parseFloat(p.quantity) * nights,
              unitPrice: product.price,
              totalPrice,
            };
          })),
        } : undefined,
      },
      include: {
        property: true,
        channel: true,
        guests: true,
        productCosts: {
          include: { product: true },
        },
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

// Update booking
export const updateBooking = async (req, res, next) => {
  try {
    const existing = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const {
      propertyId,
      channelId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      numberOfGuests,
      grossRevenue,
      specialRequests,
      notes,
      status,
      products,
    } = req.body;

    // Calculate nights if dates changed
    const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : existing.nights;

    // Get commission rate
    let commissionRate = existing.commissionRate;
    if (channelId !== undefined) {
      if (channelId) {
        const channel = await prisma.bookingChannel.findUnique({ where: { id: channelId } });
        commissionRate = channel ? parseFloat(channel.commissionRate) : 0;
      } else {
        commissionRate = 0;
      }
    }

    // Calculate financials
    const gross = grossRevenue !== undefined ? parseFloat(grossRevenue) : parseFloat(existing.grossRevenue);
    const { commissionAmount, netRevenue } = calculateCommission(gross, commissionRate);

    // Calculate variable costs
    let variableCosts = parseFloat(existing.variableCosts);
    if (products !== undefined) {
      await prisma.bookingProductCost.deleteMany({ where: { bookingId: req.params.id } });

      variableCosts = 0;
      if (products.length > 0) {
        for (const p of products) {
          const product = await prisma.product.findUnique({ where: { id: p.productId } });
          if (product) {
            const totalPrice = parseFloat(product.price) * parseFloat(p.quantity) * nights;
            variableCosts += totalPrice;

            await prisma.bookingProductCost.create({
              data: {
                bookingId: req.params.id,
                productId: p.productId,
                productName: product.name,
                quantity: parseFloat(p.quantity) * nights,
                unitPrice: product.price,
                totalPrice,
              },
            });
          }
        }
      }
    }

    const netMargin = calculateBookingMargin(netRevenue, variableCosts);

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        propertyId,
        channelId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        nights,
        numberOfGuests: numberOfGuests ? parseInt(numberOfGuests) : undefined,
        grossRevenue: gross,
        commissionRate,
        commissionAmount,
        netRevenue,
        variableCosts,
        netMargin,
        specialRequests,
        notes,
        status,
      },
      include: {
        property: true,
        channel: true,
        guests: true,
        productCosts: {
          include: { product: true },
        },
      },
    });

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// Update booking status
export const updateBookingStatus = async (req, res, next) => {
  try {
    const existing = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const { status } = req.body;

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        property: true,
        channel: true,
      },
    });

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// Delete booking
export const deleteBooking = async (req, res, next) => {
  try {
    const existing = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    await prisma.booking.delete({ where: { id: req.params.id } });

    res.json({ message: 'Prenotazione eliminata con successo' });
  } catch (error) {
    next(error);
  }
};

// Guest registry
export const addGuest = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const { firstName, lastName, birthDate, birthCity, nationality, documentType, documentNumber, documentExpiry } = req.body;

    const guest = await prisma.guestRegistryEntry.create({
      data: {
        bookingId: req.params.id,
        firstName,
        lastName,
        birthDate: birthDate ? new Date(birthDate) : null,
        birthCity,
        nationality,
        documentType,
        documentNumber,
        documentExpiry: documentExpiry ? new Date(documentExpiry) : null,
      },
    });

    res.status(201).json(guest);
  } catch (error) {
    next(error);
  }
};

export const updateGuest = async (req, res, next) => {
  try {
    const guest = await prisma.guestRegistryEntry.findFirst({
      where: { id: req.params.guestId },
      include: {
        booking: { select: { userId: true } },
      },
    });

    if (!guest || guest.booking.userId !== req.userId) {
      return res.status(404).json({ error: 'Ospite non trovato' });
    }

    const { firstName, lastName, birthDate, birthCity, nationality, documentType, documentNumber, documentExpiry } = req.body;

    const updated = await prisma.guestRegistryEntry.update({
      where: { id: req.params.guestId },
      data: {
        firstName,
        lastName,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        birthCity,
        nationality,
        documentType,
        documentNumber,
        documentExpiry: documentExpiry ? new Date(documentExpiry) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteGuest = async (req, res, next) => {
  try {
    const guest = await prisma.guestRegistryEntry.findFirst({
      where: { id: req.params.guestId },
      include: {
        booking: { select: { userId: true } },
      },
    });

    if (!guest || guest.booking.userId !== req.userId) {
      return res.status(404).json({ error: 'Ospite non trovato' });
    }

    await prisma.guestRegistryEntry.delete({ where: { id: req.params.guestId } });

    res.json({ message: 'Ospite eliminato con successo' });
  } catch (error) {
    next(error);
  }
};

// Booking channels
export const getChannels = async (req, res, next) => {
  try {
    const channels = await prisma.bookingChannel.findMany({
      where: { userId: req.userId },
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(channels);
  } catch (error) {
    next(error);
  }
};

export const createChannel = async (req, res, next) => {
  try {
    const { name, commissionRate, color } = req.body;

    const channel = await prisma.bookingChannel.create({
      data: {
        userId: req.userId,
        name,
        commissionRate: parseFloat(commissionRate),
        color,
      },
    });

    res.status(201).json(channel);
  } catch (error) {
    next(error);
  }
};

export const updateChannel = async (req, res, next) => {
  try {
    const existing = await prisma.bookingChannel.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Canale non trovato' });
    }

    const { name, commissionRate, color } = req.body;

    const channel = await prisma.bookingChannel.update({
      where: { id: req.params.id },
      data: {
        name,
        commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
        color,
      },
    });

    res.json(channel);
  } catch (error) {
    next(error);
  }
};

export const deleteChannel = async (req, res, next) => {
  try {
    const existing = await prisma.bookingChannel.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Canale non trovato' });
    }

    await prisma.bookingChannel.delete({ where: { id: req.params.id } });

    res.json({ message: 'Canale eliminato con successo' });
  } catch (error) {
    next(error);
  }
};

// Import bookings from XLS (Booking.com format)
export const importBookings = async (req, res, next) => {
  try {
    console.log('📥 Starting import...');

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    console.log('📄 File received:', req.file.originalname, req.file.size, 'bytes');

    // Parse XLS file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log('📊 Sheet name:', sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    console.log('📋 Records found:', records.length);
    if (records.length > 0) {
      console.log('📋 First record columns:', Object.keys(records[0]));
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    // Get Booking.com channel (or create if not exists)
    let bookingChannel = await prisma.bookingChannel.findFirst({
      where: { userId: req.userId, name: 'Booking.com' },
    });

    if (!bookingChannel) {
      bookingChannel = await prisma.bookingChannel.create({
        data: {
          userId: req.userId,
          name: 'Booking.com',
          commissionRate: 15,
          color: '#003580',
        },
      });
    }

    // Cache properties by name
    const propertyCache = {};
    const existingProperties = await prisma.property.findMany({
      where: { userId: req.userId },
    });
    existingProperties.forEach(p => {
      propertyCache[p.name.toLowerCase()] = p;
    });

    for (const record of records) {
      try {
        // Map column names (Booking.com format)
        const propertyName = record['Nome struttura'] || record['Property name'];
        const guestName = record['Nome di chi ha effettuato la prenotazione'] || record['Guest name'] || record['Booked by'];
        const checkInStr = record['Data di check-in'] || record['Check-in date'];
        const checkOutStr = record['Data di check-out'] || record['Check-out date'];
        const statusStr = record['Stato'] || record['Status'];
        const grossRevenueStr = record['Pagamento totale'] || record['Total payment'] || record['Total'];
        const commissionStr = record['Commissione'] || record['Commission'];
        const bookingRef = record['Numero di prenotazione'] || record['Reservation number'] || record['Booking number'];
        const address = record['Posizione'] || record['Address'] || '';

        if (!propertyName || !guestName || !checkInStr || !checkOutStr) {
          results.errors.push(`Riga incompleta: ${JSON.stringify(record)}`);
          continue;
        }

        // Parse dates (handle various formats)
        const parseDate = (dateStr) => {
          if (!dateStr) return null;

          // Italian month names
          const italianMonths = {
            'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
            'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
            'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
          };

          // Try Italian format: "5 dicembre 2025"
          const italianMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
          if (italianMatch) {
            const day = parseInt(italianMatch[1]);
            const monthName = italianMatch[2].toLowerCase();
            const year = parseInt(italianMatch[3]);
            if (italianMonths.hasOwnProperty(monthName)) {
              return new Date(year, italianMonths[monthName], day);
            }
          }

          // Handle DD/MM/YYYY or DD-MM-YYYY format
          const parts = dateStr.split(/[\/\-\.]/);
          if (parts.length === 3) {
            // Check if first part is year (YYYY-MM-DD)
            if (parts[0].length === 4) {
              return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
            // DD/MM/YYYY or DD-MM-YYYY
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
          return new Date(dateStr);
        };

        const checkIn = parseDate(checkInStr);
        const checkOut = parseDate(checkOutStr);

        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
          results.errors.push(`Date non valide per ${guestName}: ${checkInStr} - ${checkOutStr}`);
          continue;
        }

        // Parse status
        let status = 'CONFIRMED';
        if (statusStr) {
          const statusLower = statusStr.toLowerCase();
          if (statusLower.includes('cancell') || statusLower.includes('cancel')) {
            status = 'CANCELLED';
          } else if (statusLower.includes('ok') || statusLower.includes('confirm')) {
            status = 'CONFIRMED';
          }
        }

        // Parse amounts
        const parseAmount = (str) => {
          if (!str) return 0;
          // Remove currency symbols and convert comma to dot
          const cleaned = str.toString().replace(/[€$£\s]/g, '').replace(',', '.');
          return parseFloat(cleaned) || 0;
        };

        const grossRevenue = parseAmount(grossRevenueStr);
        const commission = parseAmount(commissionStr);

        // Find or create property
        let property = propertyCache[propertyName.toLowerCase()];
        if (!property) {
          property = await prisma.property.create({
            data: {
              userId: req.userId,
              name: propertyName,
              address: address,
              beds: 2,
              bathrooms: 1,
            },
          });
          propertyCache[propertyName.toLowerCase()] = property;
        }

        // Check if booking already exists (same guest, property, and check-in date)
        const existing = await prisma.booking.findFirst({
          where: {
            userId: req.userId,
            propertyId: property.id,
            guestName: guestName,
            checkIn: checkIn,
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Calculate nights and financials
        const nights = calculateNights(checkIn, checkOut);
        const commissionRate = status === 'CANCELLED' ? 0 : (grossRevenue > 0 ? (commission / grossRevenue) * 100 : 15);
        const commissionAmount = status === 'CANCELLED' ? 0 : commission;
        const netRevenue = grossRevenue - commissionAmount;

        await prisma.booking.create({
          data: {
            userId: req.userId,
            propertyId: property.id,
            channelId: bookingChannel.id,
            guestName,
            checkIn,
            checkOut,
            nights,
            numberOfGuests: 2, // Default, not provided in XLS
            grossRevenue,
            commissionRate,
            commissionAmount,
            netRevenue,
            variableCosts: 0,
            netMargin: netRevenue,
            status,
            notes: bookingRef ? `Booking.com #${bookingRef}` : null,
          },
        });

        results.created++;
      } catch (err) {
        results.errors.push(`Errore per ${record['Nome di chi ha effettuato la prenotazione'] || 'unknown'}: ${err.message}`);
      }
    }

    console.log('✅ Import completed:', results);

    res.json({
      message: `Import completato: ${results.created} create, ${results.skipped} già esistenti`,
      ...results,
    });
  } catch (error) {
    console.error('❌ Import error:', error);
    next(error);
  }
};
