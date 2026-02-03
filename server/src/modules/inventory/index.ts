// Inventory module - categories, items with auto-icon

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/index.js';
import { NotFoundError, ForbiddenError } from '../../common/errors.js';
import { validate, authenticate, requireRole, optionalAuth } from '../../common/middleware/index.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/index.js';

// ============================================
// SCHEMAS
// ============================================

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  categoryId: z.string().uuid(),
  price: z.number().min(0).default(0),
  isFree: z.boolean().default(false),
  image: z.string().url().optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).default(5),
  options: z.record(z.array(z.string())).optional(), // { "size": ["S", "M"], "sugar": ["Low", "Medium"] }
  isActive: z.boolean().default(true),
});

export const updateItemSchema = createItemSchema.partial();

// ============================================
// AUTO ICON SERVICE
// ============================================

async function fetchAutoIcon(itemName: string): Promise<string | null> {
  // Simple icon mapping for common items
  const iconMap: Record<string, string> = {
    coffee: '☕',
    tea: '🍵',
    water: '💧',
    juice: '🧃',
    soda: '🥤',
    cookie: '🍪',
    cake: '🍰',
    sandwich: '🥪',
    pizza: '🍕',
    burger: '🍔',
    salad: '🥗',
    fruit: '🍎',
    snack: '🍿',
    chips: '🍟',
    candy: '🍬',
    chocolate: '🍫',
  };

  const lowerName = itemName.toLowerCase();
  for (const [key, emoji] of Object.entries(iconMap)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }

  // Default food icon
  return '🍽️';
}

// ============================================
// CATEGORY SERVICE
// ============================================

export class CategoryService {
  async create(orgId: string, data: z.infer<typeof createCategorySchema>) {
    return prisma.category.create({
      data: { ...data, organizationId: orgId },
    });
  }

  async findByOrg(orgId: string, includeInactive = false) {
    return prisma.category.findMany({
      where: {
        organizationId: orgId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string, orgId: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { items: { where: { isActive: true } } },
    });

    if (!category || category.organizationId !== orgId) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  async update(id: string, orgId: string, data: z.infer<typeof updateCategorySchema>) {
    await this.findById(id, orgId);
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string, orgId: string) {
    await this.findById(id, orgId);
    await prisma.category.delete({ where: { id } });
  }
}

// ============================================
// ITEM SERVICE
// ============================================

export class ItemService {
  async create(orgId: string, data: z.infer<typeof createItemSchema>) {
    // Verify category belongs to org
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || category.organizationId !== orgId) {
      throw new NotFoundError('Category not found');
    }

    // Auto-fetch icon if no image provided
    let icon: string | null = null;
    if (!data.image) {
      icon = await fetchAutoIcon(data.name);
    }

    return prisma.item.create({
      data: {
        ...data,
        price: new Decimal(data.price),
        icon,
        autoIcon: !data.image,
      },
    });
  }

  async findByCategory(categoryId: string, includeUnavailable = false) {
    return prisma.item.findMany({
      where: {
        categoryId,
        isActive: true,
        ...(includeUnavailable ? {} : { isAvailable: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findByOrg(orgId: string, includeInactive = false) {
    return prisma.item.findMany({
      where: {
        category: { organizationId: orgId },
        ...(includeInactive ? {} : { isActive: true, isAvailable: true }),
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  async findById(id: string) {
    const item = await prisma.item.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) {
      throw new NotFoundError('Item not found');
    }

    return item;
  }

  async update(id: string, orgId: string, data: z.infer<typeof updateItemSchema>) {
    const item = await this.findById(id);

    if (item.category.organizationId !== orgId) {
      throw new ForbiddenError('Cannot update item from different organization');
    }

    // Re-fetch icon if name changed and no custom image
    let icon = item.icon;
    if (data.name && !data.image && item.autoIcon) {
      icon = await fetchAutoIcon(data.name);
    }

    return prisma.item.update({
      where: { id },
      data: {
        ...data,
        ...(data.price !== undefined && { price: new Decimal(data.price) }),
        icon,
      },
    });
  }

  async delete(id: string, orgId: string) {
    const item = await this.findById(id);

    if (item.category.organizationId !== orgId) {
      throw new ForbiddenError('Cannot delete item from different organization');
    }

    await prisma.item.delete({ where: { id } });
  }

  async updateStock(id: string, quantity: number) {
    const item = await this.findById(id);

    if (item.stock === null) return item; // Unlimited stock

    const newStock = Math.max(0, item.stock + quantity);
    return prisma.item.update({
      where: { id },
      data: {
        stock: newStock,
        isAvailable: newStock > 0,
      },
    });
  }
}

// ============================================
// CONTROLLER
// ============================================

export class InventoryController {
  constructor(
    private categoryService = new CategoryService(),
    private itemService = new ItemService()
  ) { }

  // Categories
  createCategory = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const category = await this.categoryService.create(req.user.organizationId, req.body);
    sendCreated(res, category);
  };

  listCategories = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await this.categoryService.findByOrg(req.user.organizationId, includeInactive);
    sendSuccess(res, categories);
  };

  getCategory = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const category = await this.categoryService.findById(req.params.id, req.user.organizationId);
    sendSuccess(res, category);
  };

  updateCategory = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const category = await this.categoryService.update(req.params.id, req.user.organizationId, req.body);
    sendSuccess(res, category);
  };

  deleteCategory = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    await this.categoryService.delete(req.params.id, req.user.organizationId);
    sendNoContent(res);
  };

  // Items
  createItem = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const item = await this.itemService.create(req.user.organizationId, req.body);
    sendCreated(res, item);
  };

  listItems = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const includeInactive = req.query.includeInactive === 'true';
    const items = await this.itemService.findByOrg(req.user.organizationId, includeInactive);
    sendSuccess(res, items);
  };

  getItem = async (req: Request, res: Response) => {
    const item = await this.itemService.findById(req.params.id);
    sendSuccess(res, item);
  };

  updateItem = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const item = await this.itemService.update(req.params.id, req.user.organizationId, req.body);
    sendSuccess(res, item);
  };

  deleteItem = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    await this.itemService.delete(req.params.id, req.user.organizationId);
    sendNoContent(res);
  };
}

// ============================================
// ROUTES
// ============================================

export function inventoryRoutes() {
  const router = Router();
  const controller = new InventoryController();

  // Categories
  router.get('/categories', authenticate, controller.listCategories);
  router.get('/categories/:id', authenticate, controller.getCategory);
  router.post('/categories', authenticate, requireRole('ADMIN', 'PANTRY'), validate(createCategorySchema), controller.createCategory);
  router.patch('/categories/:id', authenticate, requireRole('ADMIN', 'PANTRY'), validate(updateCategorySchema), controller.updateCategory);
  router.delete('/categories/:id', authenticate, requireRole('ADMIN'), controller.deleteCategory);

  // Items
  router.get('/items', authenticate, controller.listItems);
  router.get('/items/:id', optionalAuth, controller.getItem);
  router.post('/items', authenticate, requireRole('ADMIN', 'PANTRY'), validate(createItemSchema), controller.createItem);
  router.patch('/items/:id', authenticate, requireRole('ADMIN', 'PANTRY'), validate(updateItemSchema), controller.updateItem);
  router.delete('/items/:id', authenticate, requireRole('ADMIN'), controller.deleteItem);

  return router;
}
