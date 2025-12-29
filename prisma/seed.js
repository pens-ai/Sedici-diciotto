import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create fixed cost categories (global, not user-specific)
  const costCategories = [
    { name: 'Affitto/Mutuo', slug: 'affitto', icon: 'Home' },
    { name: 'Utenze', slug: 'utenze', icon: 'Zap' },
    { name: 'Internet', slug: 'internet', icon: 'Wifi' },
    { name: 'Condominio', slug: 'condominio', icon: 'Building' },
    { name: 'Assicurazione', slug: 'assicurazione', icon: 'Shield' },
    { name: 'Manutenzione', slug: 'manutenzione', icon: 'Wrench' },
    { name: 'Tasse', slug: 'tasse', icon: 'Receipt' },
    { name: 'Benzina/Trasporti', slug: 'trasporti', icon: 'Car' },
    { name: 'Pulizie', slug: 'pulizie', icon: 'Sparkles' },
    { name: 'Altro', slug: 'altro', icon: 'MoreHorizontal' },
  ];

  for (const category of costCategories) {
    await prisma.fixedCostCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log('✅ Fixed cost categories created');

  // Create demo user
  const demoEmail = 'demo@test.com';
  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('Password123', 10);

    const demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
        firstName: 'Demo',
        lastName: 'User',
        isEmailVerified: true,
        settings: {
          create: {
            companyName: 'Case Vacanza Demo',
          },
        },
        // Booking channels
        channels: {
          create: [
            { name: 'Diretto', commissionRate: 0, color: '#10b981' },
            { name: 'Airbnb', commissionRate: 3, color: '#ff5a5f' },
            { name: 'Booking.com', commissionRate: 15, color: '#003580' },
          ],
        },
        // Product categories
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
      include: {
        categories: true,
      },
    });

    // Create sample products with package management
    const bagnoCategory = demoUser.categories.find(c => c.slug === 'bagno');
    const colazioneCategory = demoUser.categories.find(c => c.slug === 'colazione');
    const biancheriaCategory = demoUser.categories.find(c => c.slug === 'biancheria');

    const products = [
      // Bagno - esempio carta igienica con gestione confezione
      {
        name: 'Carta Igienica',
        categoryId: bagnoCategory.id,
        packageCost: 2.00,
        packageQuantity: 6,
        price: 2.00 / 6, // 0.33€ per rotolo
        unit: 'rotolo',
      },
      {
        name: 'Sapone Mani',
        categoryId: bagnoCategory.id,
        packageCost: 1.50,
        packageQuantity: 1,
        price: 1.50,
        unit: 'flacone',
      },
      {
        name: 'Shampoo',
        categoryId: bagnoCategory.id,
        packageCost: 3.00,
        packageQuantity: 1,
        price: 3.00,
        unit: 'flacone',
      },
      // Colazione
      {
        name: 'Caffè Capsule',
        categoryId: colazioneCategory.id,
        packageCost: 5.00,
        packageQuantity: 10,
        price: 0.50,
        unit: 'capsula',
      },
      {
        name: 'Latte',
        categoryId: colazioneCategory.id,
        packageCost: 1.50,
        packageQuantity: 1,
        price: 1.50,
        unit: 'litro',
      },
      // Biancheria
      {
        name: 'Set Lenzuola Matrimoniale',
        categoryId: biancheriaCategory.id,
        packageCost: 0,
        packageQuantity: 1,
        price: 3.00, // costo lavaggio/usura
        unit: 'set',
      },
      {
        name: 'Asciugamano Grande',
        categoryId: biancheriaCategory.id,
        packageCost: 0,
        packageQuantity: 1,
        price: 1.00,
        unit: 'pezzo',
      },
    ];

    for (const product of products) {
      await prisma.product.create({
        data: {
          userId: demoUser.id,
          ...product,
        },
      });
    }

    // Create sample properties
    const property1 = await prisma.property.create({
      data: {
        userId: demoUser.id,
        name: 'Sasso Bianco',
        description: 'Bellissima casa con vista mare',
        address: 'Via Roma 1, Polignano a Mare',
        beds: 4,
        bathrooms: 2,
      },
    });

    const property2 = await prisma.property.create({
      data: {
        userId: demoUser.id,
        name: 'Villa Rosa',
        description: 'Villa immersa nel verde',
        address: 'Contrada San Lorenzo 15',
        beds: 6,
        bathrooms: 3,
      },
    });

    console.log('✅ Demo user created with email: demo@test.com, password: Password123');
  } else {
    // Add missing channels and categories for existing user
    const existingChannels = await prisma.bookingChannel.findMany({
      where: { userId: existingUser.id },
    });

    if (existingChannels.length === 0) {
      await prisma.bookingChannel.createMany({
        data: [
          { userId: existingUser.id, name: 'Diretto', commissionRate: 0, color: '#10b981' },
          { userId: existingUser.id, name: 'Airbnb', commissionRate: 3, color: '#ff5a5f' },
          { userId: existingUser.id, name: 'Booking.com', commissionRate: 15, color: '#003580' },
        ],
      });
      console.log('✅ Added channels for existing demo user');
    }

    const existingCategories = await prisma.category.findMany({
      where: { userId: existingUser.id },
    });

    if (existingCategories.length === 0) {
      await prisma.category.createMany({
        data: [
          { userId: existingUser.id, name: 'Colazione', slug: 'colazione', icon: 'Coffee', orderIndex: 0 },
          { userId: existingUser.id, name: 'Bagno', slug: 'bagno', icon: 'Bath', orderIndex: 1 },
          { userId: existingUser.id, name: 'Biancheria', slug: 'biancheria', icon: 'Bed', orderIndex: 2 },
          { userId: existingUser.id, name: 'Consumabili', slug: 'consumabili', icon: 'Package', orderIndex: 3 },
          { userId: existingUser.id, name: 'Pulizie', slug: 'pulizie', icon: 'Sparkles', orderIndex: 4 },
        ],
      });
      console.log('✅ Added categories for existing demo user');
    }

    console.log('ℹ️  Demo user already exists, ensured channels and categories');
  }

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
