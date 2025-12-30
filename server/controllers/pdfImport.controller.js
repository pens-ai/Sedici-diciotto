import prisma from '../config/database.js';

// Lazy load pdf-parse to handle CommonJS module
let pdfParse = null;
async function getPdfParse() {
  if (!pdfParse) {
    // Dynamic import for CommonJS module
    const module = await import('pdf-parse');
    pdfParse = module.default || module;
  }
  return pdfParse;
}

// Parse Booking.com PDF and extract booking data
function parseBookingComPDF(text) {
  const data = {};

  // Booking number - value on next line
  const bookingMatch = text.match(/Booking number:\s*\n?(\d+)/i);
  if (bookingMatch) data.bookingNumber = bookingMatch[1];

  // Guest name - look for line after "Guest information:"
  const guestMatch = text.match(/Guest information:\s*\n([^\n]+)/i);
  if (guestMatch) data.guestName = guestMatch[1].trim();

  // Country - line after guest name
  const countryMatch = text.match(/Guest information:\s*\n[^\n]+\n([A-Za-z]+)/i);
  if (countryMatch) data.country = countryMatch[1].trim();

  // Total guests - extract number, value might be on next line
  const guestsMatch = text.match(/Total guests:\s*\n?(\d+)\s*adult/i);
  if (guestsMatch) data.numberOfGuests = parseInt(guestsMatch[1]);

  // Check-in date - handles "Check-in:\nWednesday\n1 May 2026" format
  const checkinMatch = text.match(/Check-in:\s*\n(?:[A-Za-z]+\n)?(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (checkinMatch) data.checkIn = parseBookingDate(checkinMatch[1]);

  // Check-out date - handles "Check-out:\nFriday\n3 May 2026" format
  const checkoutMatch = text.match(/Check-out:\s*\n(?:[A-Za-z]+\n)?(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (checkoutMatch) data.checkOut = parseBookingDate(checkoutMatch[1]);

  // Length of stay - value on next line
  const nightsMatch = text.match(/Length of stay:\s*\n?(\d+)\s*night/i);
  if (nightsMatch) data.nights = parseInt(nightsMatch[1]);

  // Total price - handles "Total price:\n€ 340.00" or "€340.00"
  const priceMatch = text.match(/Total price:\s*\n?€?\s*([\d,.]+)/i);
  if (priceMatch) data.grossRevenue = parseFloat(priceMatch[1].replace(',', '.'));

  // Commission - handles "Commission:\n€ 51.00"
  const commissionMatch = text.match(/Commission:\s*\n?€?\s*([\d,.]+)/i);
  if (commissionMatch) data.commissionAmount = parseFloat(commissionMatch[1].replace(',', '.'));

  // Commissionable amount
  const commissionableMatch = text.match(/Commissionable amount:\s*\n?€?\s*([\d,.]+)/i);
  if (commissionableMatch) data.commissionableAmount = parseFloat(commissionableMatch[1].replace(',', '.'));

  // Property name (usually appears before "Breakfast" or rate details)
  const propertyMatch = text.match(/€\s*[\d,.]+\s*\n\n([A-Za-z0-9\s]+)\n(?:Breakfast|Standard|[A-Z])/);
  if (propertyMatch) data.propertyName = propertyMatch[1].trim();

  // Arrival time
  const arrivalMatch = text.match(/Approximate arrival time:\s*\n?([^\n]+)/i);
  if (arrivalMatch) data.arrivalTime = arrivalMatch[1].trim();

  // Calculate commission rate
  if (data.commissionAmount && data.commissionableAmount) {
    data.commissionRate = (data.commissionAmount / data.commissionableAmount) * 100;
  }

  // Calculate net revenue
  if (data.grossRevenue && data.commissionAmount) {
    data.netRevenue = data.grossRevenue - data.commissionAmount;
  }

  // Set source
  data.source = 'Booking.com';

  return data;
}

// Parse date formats like "1 May 2026"
function parseBookingDate(dateStr) {
  const months = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
    // Italian months
    'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3, 'maggio': 4,
    'giugno': 5, 'luglio': 6, 'agosto': 7, 'settembre': 8, 'ottobre': 9,
    'novembre': 10, 'dicembre': 11
  };

  const match = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const monthStr = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = months[monthStr];

    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  return null;
}

// Parse PDF and return extracted data
export const parsePDF = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const pdfBuffer = req.file.buffer;
    const parsePdfFn = await getPdfParse();
    const pdfData = await parsePdfFn(pdfBuffer);
    const text = pdfData.text;

    // Detect PDF source and parse accordingly
    let parsedData;

    if (text.toLowerCase().includes('booking.com') || text.includes('Booking number:')) {
      parsedData = parseBookingComPDF(text);
    } else if (text.toLowerCase().includes('airbnb')) {
      // Future: Add Airbnb PDF parser
      return res.status(400).json({ error: 'PDF Airbnb non ancora supportato. Usa il formato Booking.com.' });
    } else {
      return res.status(400).json({ error: 'Formato PDF non riconosciuto. Supportato: Booking.com' });
    }

    // Return parsed data for preview
    res.json({
      success: true,
      data: parsedData,
      rawText: text.substring(0, 500) + '...' // Debug: first 500 chars
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    next(error);
  }
};

// Import booking from parsed PDF data
export const importBookingFromPDF = async (req, res, next) => {
  try {
    const { propertyId, parsedData } = req.body;

    if (!propertyId || !parsedData) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    // Verify property belongs to user
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: req.userId },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    // Check if booking already exists (by booking number in notes or same dates/guest)
    if (parsedData.bookingNumber) {
      const existing = await prisma.booking.findFirst({
        where: {
          propertyId,
          notes: { contains: parsedData.bookingNumber },
        },
      });

      if (existing) {
        return res.status(400).json({
          error: 'Prenotazione già importata',
          existingId: existing.id
        });
      }
    }

    // Find Booking.com channel
    const channel = await prisma.channel.findFirst({
      where: {
        userId: req.userId,
        name: { contains: 'Booking', mode: 'insensitive' },
      },
    });

    // Calculate nights if not provided
    const checkIn = new Date(parsedData.checkIn);
    const checkOut = new Date(parsedData.checkOut);
    const nights = parsedData.nights || Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: req.userId,
        propertyId,
        channelId: channel?.id || null,
        guestName: parsedData.guestName || 'Ospite',
        checkIn,
        checkOut,
        nights,
        numberOfGuests: parsedData.numberOfGuests || 1,
        grossRevenue: parsedData.grossRevenue || 0,
        commissionRate: parsedData.commissionRate || channel?.commissionRate || 15,
        commissionAmount: parsedData.commissionAmount || 0,
        netRevenue: parsedData.netRevenue || parsedData.grossRevenue || 0,
        netMargin: parsedData.netRevenue || parsedData.grossRevenue || 0,
        status: 'CONFIRMED',
        iCalSource: parsedData.source || 'PDF Import',
        notes: `Booking #${parsedData.bookingNumber || 'N/A'}\nArrivo: ${parsedData.arrivalTime || 'Non specificato'}\nPaese: ${parsedData.country || 'Non specificato'}`,
      },
      include: {
        property: true,
        channel: true,
      },
    });

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Import booking error:', error);
    next(error);
  }
};
