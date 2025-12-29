import prisma from '../config/database.js';
import { paginationMeta } from '../utils/helpers.js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Get all products
export const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search, categoryId, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.userId,
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: [
          { category: { orderIndex: 'asc' } },
          { name: 'asc' },
        ],
        skip,
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      meta: paginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get single product
export const getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: { category: true, priceHistory: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

// Create product
export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, unit, categoryId, stockQuantity, lowStockThreshold, packageCost, packageQuantity } = req.body;

    // Calculate unit price from package if provided, otherwise use direct price
    let finalPrice;
    if (packageQuantity && packageQuantity > 1 && packageCost) {
      finalPrice = parseFloat(packageCost) / parseFloat(packageQuantity);
    } else if (price) {
      finalPrice = parseFloat(price);
    } else if (packageCost) {
      finalPrice = parseFloat(packageCost);
    } else {
      finalPrice = 0;
    }

    const product = await prisma.product.create({
      data: {
        userId: req.userId,
        categoryId,
        name,
        description,
        packageCost: packageCost ? parseFloat(packageCost) : 0,
        packageQuantity: packageQuantity ? parseFloat(packageQuantity) : 1,
        price: finalPrice,
        unit,
        stockQuantity: stockQuantity ? parseFloat(stockQuantity) : null,
        lowStockThreshold: lowStockThreshold ? parseFloat(lowStockThreshold) : null,
      },
      include: { category: true },
    });

    // Record initial price in history
    await prisma.productPriceHistory.create({
      data: {
        productId: product.id,
        newPrice: finalPrice,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// Update product
export const updateProduct = async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const { name, description, price, unit, categoryId, stockQuantity, lowStockThreshold, isActive, packageCost, packageQuantity } = req.body;

    // Calculate unit price based on input type
    let finalPrice;
    if (packageQuantity !== undefined && packageQuantity > 1 && packageCost !== undefined) {
      // Package mode: calculate unit price
      finalPrice = parseFloat(packageCost) / parseFloat(packageQuantity);
    } else if (price !== undefined) {
      // Direct price mode
      finalPrice = parseFloat(price);
    } else {
      finalPrice = undefined;
    }

    // Track price change
    if (finalPrice && finalPrice !== parseFloat(existing.price)) {
      await prisma.productPriceHistory.create({
        data: {
          productId: req.params.id,
          oldPrice: existing.price,
          newPrice: finalPrice,
        },
      });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        packageCost: packageCost !== undefined ? parseFloat(packageCost) : undefined,
        packageQuantity: packageQuantity !== undefined ? parseFloat(packageQuantity) : undefined,
        price: finalPrice,
        unit,
        categoryId,
        stockQuantity: stockQuantity !== undefined ? parseFloat(stockQuantity) : undefined,
        lowStockThreshold: lowStockThreshold !== undefined ? parseFloat(lowStockThreshold) : undefined,
        isActive,
      },
      include: { category: true },
    });

    res.json(product);
  } catch (error) {
    next(error);
  }
};

// Delete product
export const deleteProduct = async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    await prisma.product.delete({ where: { id: req.params.id } });

    res.json({ message: 'Prodotto eliminato con successo' });
  } catch (error) {
    next(error);
  }
};

// Get all categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { orderIndex: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// Create category
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, icon, color } = req.body;

    const category = await prisma.category.create({
      data: {
        userId: req.userId,
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        icon,
        color,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

// Update category
export const updateCategory = async (req, res, next) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }

    const { name, slug, icon, color, orderIndex } = req.body;

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, slug, icon, color, orderIndex },
    });

    res.json(category);
  } catch (error) {
    next(error);
  }
};

// Delete category
export const deleteCategory = async (req, res, next) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }

    await prisma.category.delete({ where: { id: req.params.id } });

    res.json({ message: 'Categoria eliminata con successo' });
  } catch (error) {
    next(error);
  }
};

// Import products from CSV
export const importProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    // Get or create categories
    const categoryCache = {};
    const existingCategories = await prisma.category.findMany({
      where: { userId: req.userId },
    });
    existingCategories.forEach(c => categoryCache[c.slug] = c);

    for (const record of records) {
      try {
        const { name, price, unit, category: categoryName } = record;

        if (!name || !price || !unit) {
          results.errors.push(`Riga mancante di dati: ${JSON.stringify(record)}`);
          continue;
        }

        // Get or create category
        const slug = categoryName?.toLowerCase().replace(/\s+/g, '-') || 'altro';
        let category = categoryCache[slug];

        if (!category) {
          category = await prisma.category.create({
            data: {
              userId: req.userId,
              name: categoryName || 'Altro',
              slug,
            },
          });
          categoryCache[slug] = category;
        }

        // Check if product exists
        const existing = await prisma.product.findFirst({
          where: {
            userId: req.userId,
            name: name,
          },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              price: parseFloat(price),
              unit,
              categoryId: category.id,
            },
          });
          results.updated++;
        } else {
          await prisma.product.create({
            data: {
              userId: req.userId,
              categoryId: category.id,
              name,
              price: parseFloat(price),
              unit,
            },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Errore per ${record.name}: ${err.message}`);
      }
    }

    res.json({
      message: `Import completato: ${results.created} creati, ${results.updated} aggiornati`,
      ...results,
    });
  } catch (error) {
    next(error);
  }
};

// Export products to CSV
export const exportProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { userId: req.userId },
      include: { category: true },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    const csvData = products.map(p => ({
      name: p.name,
      description: p.description || '',
      price: p.price.toString(),
      unit: p.unit,
      category: p.category?.name || '',
      isActive: p.isActive ? 'true' : 'false',
    }));

    const csv = stringify(csvData, {
      header: true,
      columns: ['name', 'description', 'price', 'unit', 'category', 'isActive'],
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
