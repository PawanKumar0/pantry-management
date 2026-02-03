"use strict";
// Inventory module - categories, items with auto-icon
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = exports.ItemService = exports.CategoryService = exports.updateItemSchema = exports.createItemSchema = exports.updateCategorySchema = exports.createCategorySchema = void 0;
exports.inventoryRoutes = inventoryRoutes;
const zod_1 = require("zod");
const express_1 = require("express");
const library_1 = require("@prisma/client/runtime/library");
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../../common/errors.js");
const index_js_2 = require("../../common/middleware/index.js");
const index_js_3 = require("../../common/utils/index.js");
// ============================================
// SCHEMAS
// ============================================
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    sortOrder: zod_1.z.number().int().default(0),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateCategorySchema = exports.createCategorySchema.partial();
exports.createItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    categoryId: zod_1.z.string().uuid(),
    price: zod_1.z.number().min(0).default(0),
    isFree: zod_1.z.boolean().default(false),
    image: zod_1.z.string().url().optional(),
    stock: zod_1.z.number().int().min(0).optional(),
    lowStockThreshold: zod_1.z.number().int().min(0).default(5),
    options: zod_1.z.record(zod_1.z.array(zod_1.z.string())).optional(), // { "size": ["S", "M"], "sugar": ["Low", "Medium"] }
    isActive: zod_1.z.boolean().default(true),
});
exports.updateItemSchema = exports.createItemSchema.partial();
// ============================================
// AUTO ICON SERVICE
// ============================================
async function fetchAutoIcon(itemName) {
    // Simple icon mapping for common items
    const iconMap = {
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
class CategoryService {
    async create(orgId, data) {
        return index_js_1.prisma.category.create({
            data: { ...data, organizationId: orgId },
        });
    }
    async findByOrg(orgId, includeInactive = false) {
        return index_js_1.prisma.category.findMany({
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
    async findById(id, orgId) {
        const category = await index_js_1.prisma.category.findUnique({
            where: { id },
            include: { items: { where: { isActive: true } } },
        });
        if (!category || category.organizationId !== orgId) {
            throw new errors_js_1.NotFoundError('Category not found');
        }
        return category;
    }
    async update(id, orgId, data) {
        await this.findById(id, orgId);
        return index_js_1.prisma.category.update({ where: { id }, data });
    }
    async delete(id, orgId) {
        await this.findById(id, orgId);
        await index_js_1.prisma.category.delete({ where: { id } });
    }
}
exports.CategoryService = CategoryService;
// ============================================
// ITEM SERVICE
// ============================================
class ItemService {
    async create(orgId, data) {
        // Verify category belongs to org
        const category = await index_js_1.prisma.category.findUnique({
            where: { id: data.categoryId },
        });
        if (!category || category.organizationId !== orgId) {
            throw new errors_js_1.NotFoundError('Category not found');
        }
        // Auto-fetch icon if no image provided
        let icon = null;
        if (!data.image) {
            icon = await fetchAutoIcon(data.name);
        }
        return index_js_1.prisma.item.create({
            data: {
                ...data,
                price: new library_1.Decimal(data.price),
                icon,
                autoIcon: !data.image,
            },
        });
    }
    async findByCategory(categoryId, includeUnavailable = false) {
        return index_js_1.prisma.item.findMany({
            where: {
                categoryId,
                isActive: true,
                ...(includeUnavailable ? {} : { isAvailable: true }),
            },
            orderBy: { name: 'asc' },
        });
    }
    async findByOrg(orgId, includeInactive = false) {
        return index_js_1.prisma.item.findMany({
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
    async findById(id) {
        const item = await index_js_1.prisma.item.findUnique({
            where: { id },
            include: { category: true },
        });
        if (!item) {
            throw new errors_js_1.NotFoundError('Item not found');
        }
        return item;
    }
    async update(id, orgId, data) {
        const item = await this.findById(id);
        if (item.category.organizationId !== orgId) {
            throw new errors_js_1.ForbiddenError('Cannot update item from different organization');
        }
        // Re-fetch icon if name changed and no custom image
        let icon = item.icon;
        if (data.name && !data.image && item.autoIcon) {
            icon = await fetchAutoIcon(data.name);
        }
        return index_js_1.prisma.item.update({
            where: { id },
            data: {
                ...data,
                ...(data.price !== undefined && { price: new library_1.Decimal(data.price) }),
                icon,
            },
        });
    }
    async delete(id, orgId) {
        const item = await this.findById(id);
        if (item.category.organizationId !== orgId) {
            throw new errors_js_1.ForbiddenError('Cannot delete item from different organization');
        }
        await index_js_1.prisma.item.delete({ where: { id } });
    }
    async updateStock(id, quantity) {
        const item = await this.findById(id);
        if (item.stock === null)
            return item; // Unlimited stock
        const newStock = Math.max(0, item.stock + quantity);
        return index_js_1.prisma.item.update({
            where: { id },
            data: {
                stock: newStock,
                isAvailable: newStock > 0,
            },
        });
    }
}
exports.ItemService = ItemService;
// ============================================
// CONTROLLER
// ============================================
class InventoryController {
    categoryService;
    itemService;
    constructor(categoryService = new CategoryService(), itemService = new ItemService()) {
        this.categoryService = categoryService;
        this.itemService = itemService;
    }
    // Categories
    createCategory = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const category = await this.categoryService.create(req.user.organizationId, req.body);
        (0, index_js_3.sendCreated)(res, category);
    };
    listCategories = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const includeInactive = req.query.includeInactive === 'true';
        const categories = await this.categoryService.findByOrg(req.user.organizationId, includeInactive);
        (0, index_js_3.sendSuccess)(res, categories);
    };
    getCategory = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const category = await this.categoryService.findById(req.params.id, req.user.organizationId);
        (0, index_js_3.sendSuccess)(res, category);
    };
    updateCategory = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const category = await this.categoryService.update(req.params.id, req.user.organizationId, req.body);
        (0, index_js_3.sendSuccess)(res, category);
    };
    deleteCategory = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        await this.categoryService.delete(req.params.id, req.user.organizationId);
        (0, index_js_3.sendNoContent)(res);
    };
    // Items
    createItem = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const item = await this.itemService.create(req.user.organizationId, req.body);
        (0, index_js_3.sendCreated)(res, item);
    };
    listItems = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const includeInactive = req.query.includeInactive === 'true';
        const items = await this.itemService.findByOrg(req.user.organizationId, includeInactive);
        (0, index_js_3.sendSuccess)(res, items);
    };
    getItem = async (req, res) => {
        const item = await this.itemService.findById(req.params.id);
        (0, index_js_3.sendSuccess)(res, item);
    };
    updateItem = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const item = await this.itemService.update(req.params.id, req.user.organizationId, req.body);
        (0, index_js_3.sendSuccess)(res, item);
    };
    deleteItem = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        await this.itemService.delete(req.params.id, req.user.organizationId);
        (0, index_js_3.sendNoContent)(res);
    };
}
exports.InventoryController = InventoryController;
// ============================================
// ROUTES
// ============================================
function inventoryRoutes() {
    const router = (0, express_1.Router)();
    const controller = new InventoryController();
    // Categories
    router.get('/categories', index_js_2.authenticate, controller.listCategories);
    router.get('/categories/:id', index_js_2.authenticate, controller.getCategory);
    router.post('/categories', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN', 'PANTRY'), (0, index_js_2.validate)(exports.createCategorySchema), controller.createCategory);
    router.patch('/categories/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN', 'PANTRY'), (0, index_js_2.validate)(exports.updateCategorySchema), controller.updateCategory);
    router.delete('/categories/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), controller.deleteCategory);
    // Items
    router.get('/items', index_js_2.authenticate, controller.listItems);
    router.get('/items/:id', index_js_2.optionalAuth, controller.getItem);
    router.post('/items', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN', 'PANTRY'), (0, index_js_2.validate)(exports.createItemSchema), controller.createItem);
    router.patch('/items/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN', 'PANTRY'), (0, index_js_2.validate)(exports.updateItemSchema), controller.updateItem);
    router.delete('/items/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), controller.deleteItem);
    return router;
}
//# sourceMappingURL=index.js.map