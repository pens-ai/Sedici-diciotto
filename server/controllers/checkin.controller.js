import prisma from '../config/database.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { format } from 'date-fns';

// ============ CONSTANTS FOR ALLOGGIATI WEB ============

// Document types for Alloggiati Web
export const DOCUMENT_TYPES = {
  IDENT: { code: 'IDENT', label: 'Carta d\'Identità' },
  PASOR: { code: 'PASOR', label: 'Passaporto' },
  PATEN: { code: 'PATEN', label: 'Patente di Guida' },
  PORMA: { code: 'PATEN', label: 'Porto d\'Armi' },
  TESMI: { code: 'TESMI', label: 'Tessera Ministero' },
};

// Common nationalities (ISTAT codes)
export const COUNTRIES = [
  { code: '100', name: 'Italia' },
  { code: '203', name: 'Albania' },
  { code: '206', name: 'Austria' },
  { code: '207', name: 'Belgio' },
  { code: '209', name: 'Bulgaria' },
  { code: '212', name: 'Danimarca' },
  { code: '214', name: 'Finlandia' },
  { code: '215', name: 'Francia' },
  { code: '216', name: 'Germania' },
  { code: '219', name: 'Grecia' },
  { code: '221', name: 'Irlanda' },
  { code: '223', name: 'Lussemburgo' },
  { code: '226', name: 'Norvegia' },
  { code: '227', name: 'Paesi Bassi' },
  { code: '229', name: 'Polonia' },
  { code: '230', name: 'Portogallo' },
  { code: '232', name: 'Regno Unito' },
  { code: '233', name: 'Romania' },
  { code: '236', name: 'Spagna' },
  { code: '238', name: 'Svezia' },
  { code: '239', name: 'Svizzera' },
  { code: '243', name: 'Ucraina' },
  { code: '245', name: 'Ungheria' },
  { code: '301', name: 'Canada' },
  { code: '336', name: 'Stati Uniti' },
  { code: '602', name: 'Argentina' },
  { code: '605', name: 'Brasile' },
  { code: '720', name: 'Cina' },
  { code: '726', name: 'Giappone' },
  { code: '732', name: 'India' },
  { code: '404', name: 'Australia' },
];

// Italian provinces
export const PROVINCES = [
  'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV', 'BA',
  'BG', 'BI', 'BL', 'BN', 'BO', 'BR', 'BS', 'BT', 'BZ', 'CA',
  'CB', 'CE', 'CH', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT', 'CZ',
  'EN', 'FC', 'FE', 'FG', 'FI', 'FM', 'FR', 'GE', 'GO', 'GR',
  'IM', 'IS', 'KR', 'LC', 'LE', 'LI', 'LO', 'LT', 'LU', 'MB',
  'MC', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NA', 'NO', 'NU',
  'OR', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI', 'PN', 'PO', 'PR',
  'PT', 'PU', 'PV', 'PZ', 'RA', 'RC', 'RE', 'RG', 'RI', 'RM',
  'RN', 'RO', 'SA', 'SI', 'SO', 'SP', 'SR', 'SS', 'SU', 'SV',
  'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS', 'TV', 'UD', 'VA',
  'VB', 'VC', 'VE', 'VI', 'VR', 'VS', 'VT', 'VV',
];

// ============ GENERATE CHECK-IN TOKEN ============

export const generateCheckInToken = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    // Verify booking belongs to user
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: req.userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Token valid for 30 days

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkInToken: token,
        checkInTokenExp: expiresAt,
      },
    });

    // Build URL dynamically from request origin
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('x-forwarded-host') || req.get('host');
    const baseUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;
    const checkInUrl = `${baseUrl}/checkin/${token}`;

    res.json({
      token,
      url: checkInUrl,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

// ============ GET BOOKING INFO (PUBLIC) ============

export const getBookingByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { checkInToken: token },
      select: {
        id: true,
        guestName: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        numberOfGuests: true,
        checkInCompleted: true,
        checkInTokenExp: true,
        property: {
          select: {
            name: true,
            address: true,
          },
        },
        guests: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Link non valido' });
    }

    if (booking.checkInTokenExp && new Date() > booking.checkInTokenExp) {
      return res.status(410).json({ error: 'Link scaduto' });
    }

    res.json({
      booking,
      documentTypes: Object.values(DOCUMENT_TYPES),
      countries: COUNTRIES,
      provinces: PROVINCES,
    });
  } catch (error) {
    next(error);
  }
};

// ============ SUBMIT GUEST DATA (PUBLIC) ============

export const submitGuestData = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { guests } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { checkInToken: token },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Link non valido' });
    }

    if (booking.checkInTokenExp && new Date() > booking.checkInTokenExp) {
      return res.status(410).json({ error: 'Link scaduto' });
    }

    // Delete existing guests and create new ones
    await prisma.guestRegistryEntry.deleteMany({
      where: { bookingId: booking.id },
    });

    const createdGuests = await Promise.all(
      guests.map((guest, index) =>
        prisma.guestRegistryEntry.create({
          data: {
            bookingId: booking.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            sex: guest.sex,
            birthDate: guest.birthDate ? new Date(guest.birthDate) : null,
            birthCity: guest.birthCity,
            birthProvince: guest.birthProvince,
            birthCountry: guest.birthCountry,
            citizenship: guest.citizenship,
            documentType: guest.documentType,
            documentNumber: guest.documentNumber,
            documentIssuer: guest.documentIssuer,
            documentExpiry: guest.documentExpiry ? new Date(guest.documentExpiry) : null,
            isMainGuest: index === 0,
            isConfirmed: false,
          },
        })
      )
    );

    // Mark check-in as completed
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkInCompleted: true },
    });

    res.json({ guests: createdGuests, message: 'Dati inviati con successo' });
  } catch (error) {
    next(error);
  }
};

// ============ UPLOAD DOCUMENT PHOTO (PUBLIC) ============

export const uploadDocumentPhoto = async (req, res, next) => {
  try {
    const { token, guestId } = req.params;
    const { side } = req.body; // 'front' or 'back'

    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const booking = await prisma.booking.findUnique({
      where: { checkInToken: token },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Link non valido' });
    }

    const guest = await prisma.guestRegistryEntry.findFirst({
      where: { id: guestId, bookingId: booking.id },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Ospite non trovato' });
    }

    const photoUrl = `/uploads/documents/${req.file.filename}`;

    await prisma.guestRegistryEntry.update({
      where: { id: guestId },
      data: side === 'front' ? { documentFrontUrl: photoUrl } : { documentBackUrl: photoUrl },
    });

    res.json({ url: photoUrl });
  } catch (error) {
    next(error);
  }
};

// ============ GET GUESTS FOR BOOKING (AUTHENTICATED) ============

export const getBookingGuests = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: req.userId },
      include: {
        guests: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    res.json({
      guests: booking.guests,
      checkInCompleted: booking.checkInCompleted,
      checkInToken: booking.checkInToken,
    });
  } catch (error) {
    next(error);
  }
};

// ============ CONFIRM GUEST (AUTHENTICATED) ============

export const confirmGuest = async (req, res, next) => {
  try {
    const { bookingId, guestId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: req.userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const guest = await prisma.guestRegistryEntry.update({
      where: { id: guestId },
      data: { isConfirmed: true },
    });

    res.json(guest);
  } catch (error) {
    next(error);
  }
};

// ============ CONFIRM ALL GUESTS (AUTHENTICATED) ============

export const confirmAllGuests = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: req.userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    await prisma.guestRegistryEntry.updateMany({
      where: { bookingId },
      data: { isConfirmed: true },
    });

    res.json({ message: 'Tutti gli ospiti confermati' });
  } catch (error) {
    next(error);
  }
};

// ============ GENERATE ALLOGGIATI WEB TXT ============

export const generateAlloggiatiTxt = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: req.userId },
      include: {
        property: true,
        guests: {
          where: { isConfirmed: true },
          orderBy: { isMainGuest: 'desc' },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    if (booking.guests.length === 0) {
      return res.status(400).json({ error: 'Nessun ospite confermato' });
    }

    // Generate TXT content in Alloggiati Web format
    const lines = [];
    const arrivalDate = format(new Date(booking.checkIn), 'dd/MM/yyyy');
    const nights = booking.nights.toString().padStart(2, '0');

    booking.guests.forEach((guest, index) => {
      // Record type: 16 = single guest, 17 = family head, 18 = family member, 19 = group head, 20 = group member
      let recordType = '16'; // Default: single guest
      if (booking.guests.length > 1) {
        if (guest.isMainGuest) {
          recordType = booking.numberOfGuests > 5 ? '19' : '17'; // Group or family head
        } else {
          recordType = booking.numberOfGuests > 5 ? '20' : '18'; // Group or family member
        }
      }

      const birthDate = guest.birthDate ? format(new Date(guest.birthDate), 'dd/MM/yyyy') : '          ';
      const isItalian = guest.birthCountry === '100';

      // Build the line according to Alloggiati Web format
      let line = '';
      line += recordType.padEnd(2);                                    // Tipo alloggiato (2)
      line += arrivalDate.padEnd(10);                                  // Data arrivo (10)
      line += nights.padEnd(2);                                        // Permanenza (2)
      line += (guest.lastName || '').toUpperCase().padEnd(50);         // Cognome (50)
      line += (guest.firstName || '').toUpperCase().padEnd(30);        // Nome (30)
      line += (guest.sex === 'M' ? '1' : '2');                         // Sesso (1): 1=M, 2=F
      line += birthDate.padEnd(10);                                    // Data nascita (10)

      // Luogo di nascita
      if (isItalian) {
        line += (guest.birthCity || '').toUpperCase().padEnd(9);       // Comune nascita ISTAT (9)
        line += (guest.birthProvince || '').toUpperCase().padEnd(2);   // Provincia (2)
      } else {
        line += '         ';                                            // Comune vuoto (9)
        line += '  ';                                                   // Provincia vuota (2)
      }

      line += (guest.birthCountry || '100').padEnd(9);                 // Stato nascita ISTAT (9)
      line += (guest.citizenship || '100').padEnd(9);                  // Cittadinanza ISTAT (9)

      // Documento (solo per capofamiglia/capogruppo o singoli)
      if (guest.isMainGuest || recordType === '16') {
        line += (guest.documentType || 'IDENT').padEnd(5);             // Tipo documento (5)
        line += (guest.documentNumber || '').toUpperCase().padEnd(20); // Numero documento (20)
        line += (guest.documentIssuer || '').padEnd(9);                // Luogo rilascio ISTAT (9)
      } else {
        line += '     ';                                                // Tipo doc vuoto (5)
        line += '                    ';                                 // Numero doc vuoto (20)
        line += '         ';                                            // Luogo rilascio vuoto (9)
      }

      lines.push(line);
    });

    const content = lines.join('\r\n');

    // Set headers for file download
    const fileName = `alloggiati_${format(new Date(booking.checkIn), 'yyyyMMdd')}_${booking.guestName.replace(/\s+/g, '_')}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);
  } catch (error) {
    next(error);
  }
};

// ============ RESET GUEST DATA (AUTHENTICATED) ============

export const resetGuestData = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: req.userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Delete all guests for this booking
    await prisma.guestRegistryEntry.deleteMany({
      where: { bookingId },
    });

    // Reset check-in completed flag but keep the token
    await prisma.booking.update({
      where: { id: bookingId },
      data: { checkInCompleted: false },
    });

    res.json({ message: 'Dati ospiti eliminati. Il link è nuovamente attivo.' });
  } catch (error) {
    next(error);
  }
};

// ============ GET REFERENCE DATA ============

export const getReferenceData = async (req, res, next) => {
  try {
    res.json({
      documentTypes: Object.values(DOCUMENT_TYPES),
      countries: COUNTRIES,
      provinces: PROVINCES,
    });
  } catch (error) {
    next(error);
  }
};
