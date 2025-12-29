import prisma from '../config/database.js';
import { paginationMeta } from '../utils/helpers.js';

// Get all fixed costs
export const getCosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, propertyId, categoryId, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.userId,
      ...(propertyId && { propertyId }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const [costs, total] = await Promise.all([
      prisma.fixedCost.findMany({
        where,
        include: {
          property: true,
          category: true,
        },
        orderBy: [
          { property: { name: 'asc' } },
          { category: { name: 'asc' } },
        ],
        skip,
        take: parseInt(limit),
      }),
      prisma.fixedCost.count({ where }),
    ]);

    res.json({
      data: costs,
      meta: paginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get single cost
export const getCost = async (req, res, next) => {
  try {
    const cost = await prisma.fixedCost.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        property: true,
        category: true,
      },
    });

    if (!cost) {
      return res.status(404).json({ error: 'Costo fisso non trovato' });
    }

    res.json(cost);
  } catch (error) {
    next(error);
  }
};

// Create cost
export const createCost = async (req, res, next) => {
  try {
    const { propertyId, categoryId, description, amount, frequency, startDate, endDate } = req.body;

    const cost = await prisma.fixedCost.create({
      data: {
        userId: req.userId,
        propertyId: propertyId || null,
        categoryId,
        description,
        amount: parseFloat(amount),
        frequency: frequency || 'MONTHLY',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        property: true,
        category: true,
      },
    });

    res.status(201).json(cost);
  } catch (error) {
    next(error);
  }
};

// Update cost
export const updateCost = async (req, res, next) => {
  try {
    const existing = await prisma.fixedCost.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Costo fisso non trovato' });
    }

    const { propertyId, categoryId, description, amount, frequency, startDate, endDate, isActive } = req.body;

    const cost = await prisma.fixedCost.update({
      where: { id: req.params.id },
      data: {
        propertyId,
        categoryId,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        frequency,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        isActive,
      },
      include: {
        property: true,
        category: true,
      },
    });

    res.json(cost);
  } catch (error) {
    next(error);
  }
};

// Delete cost
export const deleteCost = async (req, res, next) => {
  try {
    const existing = await prisma.fixedCost.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Costo fisso non trovato' });
    }

    await prisma.fixedCost.delete({ where: { id: req.params.id } });

    res.json({ message: 'Costo fisso eliminato con successo' });
  } catch (error) {
    next(error);
  }
};

// Get cost categories
export const getCostCategories = async (req, res, next) => {
  try {
    const categories = await prisma.fixedCostCategory.findMany({
      include: {
        _count: { select: { costs: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// Get monthly summary
export const getMonthlySummary = async (req, res, next) => {
  try {
    const { year, month, propertyId } = req.query;

    const costs = await prisma.fixedCost.findMany({
      where: {
        userId: req.userId,
        isActive: true,
        ...(propertyId && { propertyId }),
        startDate: { lte: new Date(year, month - 1, 28) },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date(year, month - 1, 1) } },
        ],
      },
      include: {
        property: true,
        category: true,
      },
    });

    // Calculate monthly amounts based on frequency
    const summary = costs.map(cost => {
      let monthlyAmount = parseFloat(cost.amount);

      switch (cost.frequency) {
        case 'QUARTERLY':
          monthlyAmount = monthlyAmount / 3;
          break;
        case 'YEARLY':
          monthlyAmount = monthlyAmount / 12;
          break;
        case 'ONE_TIME':
          // Only count in the start month
          const startMonth = cost.startDate.getMonth() + 1;
          const startYear = cost.startDate.getFullYear();
          if (parseInt(month) !== startMonth || parseInt(year) !== startYear) {
            monthlyAmount = 0;
          }
          break;
      }

      return {
        ...cost,
        monthlyAmount: Math.round(monthlyAmount * 100) / 100,
      };
    });

    const total = summary.reduce((sum, c) => sum + c.monthlyAmount, 0);

    // Group by category
    const byCategory = summary.reduce((acc, cost) => {
      const catName = cost.category?.name || 'Altro';
      if (!acc[catName]) {
        acc[catName] = { costs: [], total: 0 };
      }
      acc[catName].costs.push(cost);
      acc[catName].total += cost.monthlyAmount;
      return acc;
    }, {});

    // Group by property
    const byProperty = summary.reduce((acc, cost) => {
      const propName = cost.property?.name || 'Condivisi';
      if (!acc[propName]) {
        acc[propName] = { costs: [], total: 0 };
      }
      acc[propName].costs.push(cost);
      acc[propName].total += cost.monthlyAmount;
      return acc;
    }, {});

    res.json({
      costs: summary,
      total: Math.round(total * 100) / 100,
      byCategory,
      byProperty,
    });
  } catch (error) {
    next(error);
  }
};
