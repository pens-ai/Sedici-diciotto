import prisma from '../config/database.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { format } from 'date-fns';
import { fileURLToPath } from 'url';

// Load Italian comuni data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let comuniData = null;

const loadComuni = async () => {
  if (!comuniData) {
    try {
      const filePath = path.join(__dirname, '../data/comuni.json');
      const data = await fs.readFile(filePath, 'utf-8');
      comuniData = JSON.parse(data);
    } catch (err) {
      console.error('Error loading comuni data:', err);
      comuniData = { comuni: [] };
    }
  }
  return comuniData.comuni;
};

// ============ CONSTANTS FOR ALLOGGIATI WEB ============

// Document types for Alloggiati Web / Turiweb APT Basilicata
export const DOCUMENT_TYPES = {
  IDENT: { code: 'IDENT', label: 'Carta d\'Identità' },
  PASOR: { code: 'PASOR', label: 'Passaporto' },
  PATEN: { code: 'PATEN', label: 'Patente di Guida' },
  PANNA: { code: 'PANNA', label: 'Patente Nautica' },
  PARM: { code: 'PARM', label: 'Porto d\'Armi' },
  TESAR: { code: 'TESAR', label: 'Tessera AT/BT' },
  TESTM: { code: 'TESTM', label: 'Tess. Min. Trasporti' },
  CODFI: { code: 'CODFI', label: 'Codice Fiscale' },
  ALTRO: { code: 'ALTRO', label: 'Altro Documento' },
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

// ============ CONSTANTS FOR ROSS1000/SIT BASILICATA (XML) ============

// Tourism types (Tipo Turismo) - Required for ROSS1000
export const TIPI_TURISMO = [
  { code: 'CULTURALE', label: 'Culturale' },
  { code: 'BALNEARE', label: 'Balneare' },
  { code: 'CONGRESSUALE_AFFARI', label: 'Congressuale/Affari' },
  { code: 'FIERISTICO', label: 'Fieristico' },
  { code: 'SPORTIVO_FITNESS', label: 'Sportivo/Fitness' },
  { code: 'SCOLASTICO', label: 'Scolastico' },
  { code: 'RELIGIOSO', label: 'Religioso' },
  { code: 'SOCIALE', label: 'Sociale' },
  { code: 'PARCHI_TEMATICI', label: 'Parchi Tematici' },
  { code: 'TERMALE', label: 'Termale/Trattamenti salute' },
  { code: 'ENOGASTRONOMICO', label: 'Enogastronomico' },
  { code: 'CICLOTURISMO', label: 'Cicloturismo' },
  { code: 'ESCURSIONISTICO', label: 'Escursionistico/Naturalistico' },
  { code: 'ALTRO', label: 'Altro motivo' },
  { code: 'NON_SPECIFICATO', label: 'Non specificato' },
];

// Transport modes (Mezzo di Trasporto) - Required for ROSS1000
export const MEZZI_TRASPORTO = [
  { code: 'AUTO', label: 'Auto' },
  { code: 'AEREO', label: 'Aereo' },
  { code: 'AEREO_PULLMAN', label: 'Aereo+Pullman' },
  { code: 'AEREO_NAVETTA', label: 'Aereo+Navetta/Taxi/Auto' },
  { code: 'AEREO_TRENO', label: 'Aereo+Treno' },
  { code: 'TRENO', label: 'Treno' },
  { code: 'PULLMAN', label: 'Pullman' },
  { code: 'CARAVAN', label: 'Caravan/Autocaravan' },
  { code: 'NAVE', label: 'Barca/Nave/Traghetto' },
  { code: 'MOTO', label: 'Moto' },
  { code: 'BICICLETTA', label: 'Bicicletta' },
  { code: 'A_PIEDI', label: 'A piedi' },
  { code: 'ALTRO', label: 'Altro mezzo' },
  { code: 'NON_SPECIFICATO', label: 'Non Specificato' },
];

// Booking channels (Canale di Prenotazione)
export const CANALI_PRENOTAZIONE = [
  { code: 'DIRETTA_TRADIZIONALE', label: 'Diretta tradizionale' },
  { code: 'DIRETTA_WEB', label: 'Diretta web' },
  { code: 'INDIRETTA_TRADIZIONALE', label: 'Indiretta tradizionale' },
  { code: 'INDIRETTA_WEB', label: 'Indiretta web' },
  { code: 'ALTRO', label: 'Altro canale' },
  { code: 'NON_SPECIFICATO', label: 'Non specificato' },
];

// ISTAT country codes mapping (short -> full format for ROSS1000)
// ROSS1000 uses format 100000XXX where XXX is the short ISTAT code
export const getFullIstatCode = (shortCode) => {
  if (!shortCode) return '';
  // Italia is special: 100 -> 100000100
  if (shortCode === '100') return '100000100';
  // Other countries: pad to 9 digits with 100000 prefix
  return `100000${shortCode.padStart(3, '0')}`;
};

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
      tipiTurismo: TIPI_TURISMO,
      mezziTrasporto: MEZZI_TRASPORTO,
      canaliPrenotazione: CANALI_PRENOTAZIONE,
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
            residenceCity: guest.residenceCity,
            residenceProvince: guest.residenceProvince,
            residenceCountry: guest.residenceCountry,
            documentType: guest.documentType,
            documentNumber: guest.documentNumber,
            documentIssueCountry: guest.documentIssueCountry,
            documentIssueCity: guest.documentIssueCity,
            documentExpiry: guest.documentExpiry ? new Date(guest.documentExpiry) : null,
            tipoTurismo: guest.tipoTurismo,
            mezzoTrasporto: guest.mezzoTrasporto,
            canalePrenotazione: guest.canalePrenotazione,
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

    // Helper to normalize country code to 9-digit ISTAT format
    const normalizeCountryCode = (code) => {
      if (!code) return '100000100'; // Default Italy
      // If already 9 digits, return as-is
      if (code.length === 9) return code;
      // If 3 digits (old format), convert to 9-digit format
      if (code.length <= 3) {
        return code.padStart(3, '0') + '000100';
      }
      return code.padEnd(9);
    };

    // Helper to check if country is Italy
    const isItalyCode = (code) => {
      return code === '100' || code === '100000100';
    };

    booking.guests.forEach((guest, index) => {
      // Record type: 16 = single, 17 = capofamiglia, 18 = capogruppo, 19 = familiare, 20 = membro gruppo
      let recordType = '16'; // Default: single guest
      if (booking.guests.length > 1) {
        if (guest.isMainGuest) {
          recordType = booking.numberOfGuests > 5 ? '18' : '17'; // Capogruppo (18) or Capofamiglia (17)
        } else {
          recordType = booking.numberOfGuests > 5 ? '20' : '19'; // Membro gruppo (20) or Familiare (19)
        }
      }

      const birthDate = guest.birthDate ? format(new Date(guest.birthDate), 'dd/MM/yyyy') : '          ';
      const isItalian = isItalyCode(guest.birthCountry);

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

      line += normalizeCountryCode(guest.birthCountry);                // Stato nascita ISTAT (9)
      line += normalizeCountryCode(guest.citizenship);                 // Cittadinanza ISTAT (9)

      // Documento (solo per capofamiglia/capogruppo o singoli)
      if (guest.isMainGuest || recordType === '16') {
        line += (guest.documentType || 'IDENT').padEnd(5);             // Tipo documento (5)
        line += (guest.documentNumber || '').toUpperCase().padEnd(20); // Numero documento (20)
        // Luogo rilascio: usa documentIssueCity per doc italiani, altrimenti documentIssueCountry
        const isItalianDoc = isItalyCode(guest.documentIssueCountry);
        const issueLocation = isItalianDoc
          ? (guest.documentIssueCity || '').padEnd(9)
          : normalizeCountryCode(guest.documentIssueCountry);
        line += issueLocation;                                         // Luogo rilascio ISTAT (9)
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
      tipiTurismo: TIPI_TURISMO,
      mezziTrasporto: MEZZI_TRASPORTO,
      canaliPrenotazione: CANALI_PRENOTAZIONE,
    });
  } catch (error) {
    next(error);
  }
};

// ============ SEARCH ITALIAN COMUNI ============

export const searchComuni = async (req, res, next) => {
  try {
    const { q, provincia } = req.query;
    const comuni = await loadComuni();

    let results = comuni;

    // Filter by search query
    if (q && q.length >= 2) {
      const searchTerm = q.toUpperCase();
      results = results.filter(c =>
        c.nome.includes(searchTerm) ||
        c.provincia.includes(searchTerm)
      );
    }

    // Filter by provincia
    if (provincia) {
      results = results.filter(c => c.provincia === provincia.toUpperCase());
    }

    // Limit results
    results = results.slice(0, 50);

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// Get comune by ISTAT code
export const getComuneByCode = async (req, res, next) => {
  try {
    const { codice } = req.params;
    const comuni = await loadComuni();

    const comune = comuni.find(c => c.codice === codice);

    if (!comune) {
      return res.status(404).json({ error: 'Comune non trovato' });
    }

    res.json(comune);
  } catch (error) {
    next(error);
  }
};

// ============ GENERATE ROSS1000 XML (SIT BASILICATA) ============

export const generateRoss1000Xml = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const {
      codiceStruttura,
      prodotto,
      tipoTurismo = 'BALNEARE', // Default per case vacanza
      mezzoTrasporto = 'AUTO',  // La maggior parte degli ospiti arriva in auto
      canalePrenotazione = 'INDIRETTA_WEB' // Default per OTA (Booking, Airbnb)
    } = req.query;

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

    // Generate XML content in ROSS1000 format
    const arrivalDate = format(new Date(booking.checkIn), 'yyyyMMdd');
    const mainGuest = booking.guests.find(g => g.isMainGuest) || booking.guests[0];

    // Determine guest type (tipoalloggiato)
    // 16 = single, 17 = family head, 18 = family member, 19 = group head (>5), 20 = group member (>5)
    const getGuestType = (guest, totalGuests) => {
      if (totalGuests === 1) return '16'; // Single guest
      if (totalGuests > 5) {
        return guest.isMainGuest ? '19' : '20'; // Group
      }
      return guest.isMainGuest ? '17' : '18'; // Family
    };

    // Build XML structure
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<movimenti>
  <codice>${codiceStruttura || 'INSERIRE_CODICE'}</codice>
  <prodotto>${prodotto || 'GestionaleCaseVacanza'}</prodotto>
  <movimento>
    <data>${arrivalDate}</data>
    <struttura>
      <apertura>SI</apertura>
      <camereoccupate>1</camereoccupate>
      <cameredisponibili>${booking.property?.beds || 1}</cameredisponibili>
      <lettidisponibili>${booking.property?.beds || booking.numberOfGuests}</lettidisponibili>
    </struttura>
    <arrivi>`;

    // Add each guest as an arrivo
    booking.guests.forEach((guest, index) => {
      const guestType = getGuestType(guest, booking.guests.length);
      const birthDate = guest.birthDate ? format(new Date(guest.birthDate), 'yyyyMMdd') : '';
      const isItalianBirth = guest.birthCountry === '100';
      const isItalianResidence = guest.residenceCountry === '100';

      // Convert short ISTAT codes to full format
      const cittadinanza = getFullIstatCode(guest.citizenship);
      const statoResidenza = getFullIstatCode(guest.residenceCountry);
      const statoNascita = getFullIstatCode(guest.birthCountry);

      // For residence location: use comune code for Italians, NUTS code or city name for foreigners
      let luogoResidenza = '';
      if (isItalianResidence && guest.residenceCity) {
        // Italian: should be ISTAT comune code (403XXXXXX format)
        // For now, just use the city name - user should input proper code
        luogoResidenza = guest.residenceCity;
      } else if (guest.residenceCity) {
        luogoResidenza = guest.residenceCity;
      }

      // For birth location
      let comuneNascita = '';
      if (isItalianBirth && guest.birthCity) {
        comuneNascita = guest.birthCity;
      }

      xml += `
      <arrivo>
        <idswh>${booking.id.substring(0, 20)}_${index}</idswh>
        <tipoalloggiato>${guestType}</tipoalloggiato>
        <idcapo>${guest.isMainGuest ? '' : booking.id.substring(0, 20) + '_0'}</idcapo>
        <cognome>${(guest.lastName || '').toUpperCase()}</cognome>
        <nome>${(guest.firstName || '').toUpperCase()}</nome>
        <sesso>${guest.sex || 'M'}</sesso>
        <cittadinanza>${cittadinanza}</cittadinanza>
        <statoresidenza>${statoResidenza}</statoresidenza>
        <luogoresidenza>${luogoResidenza}</luogoresidenza>
        <datanascita>${birthDate}</datanascita>
        <statonascita>${statoNascita}</statonascita>
        <comunenascita>${comuneNascita}</comunenascita>
        <tipoturismo>${tipoTurismo}</tipoturismo>
        <mezzotrasporto>${mezzoTrasporto}</mezzotrasporto>
        <canaleprenotazione>${canalePrenotazione}</canaleprenotazione>
      </arrivo>`;
    });

    xml += `
    </arrivi>
  </movimento>
</movimenti>`;

    // Set headers for XML file download
    const fileName = `ross1000_${format(new Date(booking.checkIn), 'yyyyMMdd')}_${booking.guestName.replace(/\s+/g, '_')}.xml`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(xml);
  } catch (error) {
    next(error);
  }
};
