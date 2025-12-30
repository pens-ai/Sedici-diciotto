import prisma from '../config/database.js';

// Get all templates for user
export const getTemplates = async (req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      where: { userId: req.userId },
      include: {
        products: {
          include: { product: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(templates);
  } catch (error) {
    next(error);
  }
};

// Get single template
export const getTemplate = async (req, res, next) => {
  try {
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        products: {
          include: { product: true },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
};

// Create template
export const createTemplate = async (req, res, next) => {
  try {
    const { name, minGuests, maxGuests, description, products } = req.body;

    const template = await prisma.template.create({
      data: {
        userId: req.userId,
        name,
        minGuests: minGuests || 1,
        maxGuests: maxGuests || 10,
        description,
        products: products?.length > 0 ? {
          create: products.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        } : undefined,
      },
      include: {
        products: {
          include: { product: true },
        },
      },
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
};

// Update template
export const updateTemplate = async (req, res, next) => {
  try {
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }

    const { name, minGuests, maxGuests, description, products } = req.body;

    // Delete existing products and recreate
    await prisma.templateProduct.deleteMany({
      where: { templateId: req.params.id },
    });

    const updated = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        name,
        minGuests,
        maxGuests,
        description,
        products: products?.length > 0 ? {
          create: products.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        } : undefined,
      },
      include: {
        products: {
          include: { product: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete template
export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }

    await prisma.template.delete({ where: { id: req.params.id } });

    res.json({ message: 'Template eliminato con successo' });
  } catch (error) {
    next(error);
  }
};

// Duplicate template
export const duplicateTemplate = async (req, res, next) => {
  try {
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        products: true,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }

    const newTemplate = await prisma.template.create({
      data: {
        userId: req.userId,
        name: `${template.name} (copia)`,
        minGuests: template.minGuests,
        maxGuests: template.maxGuests,
        description: template.description,
        products: template.products.length > 0 ? {
          create: template.products.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        } : undefined,
      },
      include: {
        products: {
          include: { product: true },
        },
      },
    });

    res.status(201).json(newTemplate);
  } catch (error) {
    next(error);
  }
};
