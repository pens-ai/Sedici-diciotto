import prisma from '../config/database.js';
import { paginationMeta } from '../utils/helpers.js';
import path from 'path';
import fs from 'fs/promises';

// Get all properties
export const getProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.userId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { address: { contains: search } },
        ],
      }),
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          images: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.property.count({ where }),
    ]);

    res.json({
      data: properties,
      meta: paginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get single property
export const getProperty = async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        images: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
};

// Create property
export const createProperty = async (req, res, next) => {
  try {
    const { name, description, address, beds, bathrooms, squareMeters, status } = req.body;

    const property = await prisma.property.create({
      data: {
        userId: req.userId,
        name,
        description,
        address,
        beds: parseInt(beds),
        bathrooms: parseInt(bathrooms),
        squareMeters: squareMeters ? parseInt(squareMeters) : null,
        status: status || 'ACTIVE',
      },
      include: {
        images: true,
      },
    });

    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

// Update property
export const updateProperty = async (req, res, next) => {
  try {
    const { name, description, address, beds, bathrooms, squareMeters, status } = req.body;

    // Check ownership
    const existing = await prisma.property.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        address,
        beds: beds !== undefined ? parseInt(beds) : undefined,
        bathrooms: bathrooms !== undefined ? parseInt(bathrooms) : undefined,
        squareMeters: squareMeters !== undefined ? parseInt(squareMeters) : undefined,
        status,
      },
      include: {
        images: { orderBy: { orderIndex: 'asc' } },
      },
    });

    res.json(property);
  } catch (error) {
    next(error);
  }
};

// Delete property
export const deleteProperty = async (req, res, next) => {
  try {
    const existing = await prisma.property.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { images: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    // Delete image files
    for (const image of existing.images) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', 'properties', path.basename(image.url));
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Error deleting image file:', err);
      }
    }

    await prisma.property.delete({ where: { id: req.params.id } });

    res.json({ message: 'Proprietà eliminata con successo' });
  } catch (error) {
    next(error);
  }
};

// Upload images
export const uploadImages = async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!property) {
      return res.status(404).json({ error: 'Proprietà non trovata' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const existingImages = await prisma.propertyImage.count({
      where: { propertyId: req.params.id },
    });

    const images = await Promise.all(
      req.files.map((file, index) =>
        prisma.propertyImage.create({
          data: {
            propertyId: req.params.id,
            url: `/uploads/properties/${file.filename}`,
            isPrimary: existingImages === 0 && index === 0,
            orderIndex: existingImages + index,
          },
        })
      )
    );

    res.status(201).json(images);
  } catch (error) {
    next(error);
  }
};

// Delete image
export const deleteImage = async (req, res, next) => {
  try {
    const image = await prisma.propertyImage.findFirst({
      where: { id: req.params.imageId },
      include: {
        property: { select: { userId: true } },
      },
    });

    if (!image || image.property.userId !== req.userId) {
      return res.status(404).json({ error: 'Immagine non trovata' });
    }

    // Delete file
    try {
      const filePath = path.join(process.cwd(), 'uploads', 'properties', path.basename(image.url));
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting image file:', err);
    }

    await prisma.propertyImage.delete({ where: { id: req.params.imageId } });

    res.json({ message: 'Immagine eliminata con successo' });
  } catch (error) {
    next(error);
  }
};

