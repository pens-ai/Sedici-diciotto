import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📅 Adding sample bookings...');

  // Get demo user
  const user = await prisma.user.findUnique({ where: { email: 'demo@test.com' } });
  if (!user) {
    console.error('❌ Demo user not found');
    process.exit(1);
  }

  // Get Booking.com channel
  const bookingChannel = await prisma.bookingChannel.findFirst({
    where: { userId: user.id, name: 'Booking.com' }
  });

  // Create missing properties
  let sassiSedici = await prisma.property.findFirst({
    where: { userId: user.id, name: 'Sassi SediciDiciotto' }
  });
  if (!sassiSedici) {
    sassiSedici = await prisma.property.create({
      data: {
        userId: user.id,
        name: 'Sassi SediciDiciotto',
        address: 'Vico I Duni 16/18, Matera, Italy',
        beds: 4,
        bathrooms: 2,
        description: 'Appartamento nei Sassi di Matera'
      }
    });
    console.log('✅ Created property: Sassi SediciDiciotto');
  }

  let pozzoFiorito = await prisma.property.findFirst({
    where: { userId: user.id, name: 'Pozzo Fiorito' }
  });
  if (!pozzoFiorito) {
    pozzoFiorito = await prisma.property.create({
      data: {
        userId: user.id,
        name: 'Pozzo Fiorito',
        address: '3 Vicolo I Duni, Matera, Italy',
        beds: 4,
        bathrooms: 2,
        description: 'Casa vacanze con vista sui Sassi'
      }
    });
    console.log('✅ Created property: Pozzo Fiorito');
  }

  let sassoBianco = await prisma.property.findFirst({
    where: { userId: user.id, name: 'Sasso Bianco' }
  });
  if (!sassoBianco) {
    sassoBianco = await prisma.property.create({
      data: {
        userId: user.id,
        name: 'Sasso Bianco',
        address: 'Vico 1° Emanuele Duni, 1/B, Matera, Italy',
        beds: 4,
        bathrooms: 2,
        description: 'Bellissima casa con vista mare'
      }
    });
    console.log('✅ Created property: Sasso Bianco');
  }

  // Define bookings from the provided data
  const bookings = [
    {
      property: sassiSedici,
      guestName: 'KITAE LEE',
      checkIn: new Date('2025-12-05'),
      checkOut: new Date('2025-12-07'),
      grossRevenue: 288,
      status: 'CANCELLED',
      commission: 0, // Cancelled = no commission
      channelId: bookingChannel?.id,
      numberOfGuests: 2,
      nights: 2
    },
    {
      property: pozzoFiorito,
      guestName: 'MATTEO COLELLA',
      checkIn: new Date('2025-12-06'),
      checkOut: new Date('2025-12-08'),
      grossRevenue: 360,
      status: 'CONFIRMED',
      commission: 54,
      channelId: bookingChannel?.id,
      numberOfGuests: 2,
      nights: 2
    },
    {
      property: pozzoFiorito,
      guestName: 'Lolli Veronica',
      checkIn: new Date('2025-12-06'),
      checkOut: new Date('2025-12-08'),
      grossRevenue: 324,
      status: 'CANCELLED',
      commission: 0,
      channelId: bookingChannel?.id,
      numberOfGuests: 2,
      nights: 2
    },
    {
      property: sassoBianco,
      guestName: 'Maria Cristina Devecchi',
      checkIn: new Date('2025-12-06'),
      checkOut: new Date('2025-12-08'),
      grossRevenue: 240,
      status: 'CANCELLED',
      commission: 0,
      channelId: bookingChannel?.id,
      numberOfGuests: 2,
      nights: 2
    },
    {
      property: sassoBianco,
      guestName: 'maria assunta cornacchia',
      checkIn: new Date('2025-12-20'),
      checkOut: new Date('2025-12-22'),
      grossRevenue: 220,
      status: 'CANCELLED',
      commission: 0,
      channelId: bookingChannel?.id,
      numberOfGuests: 2,
      nights: 2
    }
  ];

  // Create bookings
  for (const b of bookings) {
    // Check if booking already exists (same guest, same dates, same property)
    const existing = await prisma.booking.findFirst({
      where: {
        userId: user.id,
        propertyId: b.property.id,
        guestName: b.guestName,
        checkIn: b.checkIn
      }
    });

    if (existing) {
      console.log(`ℹ️  Booking already exists: ${b.guestName} at ${b.property.name}`);
      continue;
    }

    const commissionRate = b.status === 'CANCELLED' ? 0 : 15;
    const commissionAmount = b.commission;
    const netRevenue = b.grossRevenue - commissionAmount;
    const netMargin = netRevenue; // No variable costs for now

    await prisma.booking.create({
      data: {
        userId: user.id,
        propertyId: b.property.id,
        channelId: b.channelId,
        guestName: b.guestName,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: b.nights,
        numberOfGuests: b.numberOfGuests,
        grossRevenue: b.grossRevenue,
        commissionRate,
        commissionAmount,
        netRevenue,
        variableCosts: 0,
        netMargin,
        status: b.status
      }
    });
    console.log(`✅ Created booking: ${b.guestName} at ${b.property.name} (${b.status})`);
  }

  console.log('📅 Sample bookings added!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
