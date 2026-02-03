"use strict";
// Order module - order management with real-time updates
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = exports.OrderService = exports.updateOrderStatusSchema = exports.createOrderSchema = exports.orderItemSchema = void 0;
exports.orderRoutes = orderRoutes;
const zod_1 = require("zod");
const express_1 = require("express");
const library_1 = require("@prisma/client/runtime/library");
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../../common/errors.js");
const index_js_2 = require("../../common/middleware/index.js");
const index_js_3 = require("../../common/utils/index.js");
const index_js_4 = require("../inventory/index.js");
// ============================================
// SCHEMAS
// ============================================
exports.orderItemSchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().int().min(1).max(20),
    options: zod_1.z.record(zod_1.z.string()).optional(),
    notes: zod_1.z.string().max(200).optional(),
});
exports.createOrderSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    items: zod_1.z.array(exports.orderItemSchema).min(1).max(50),
    couponCode: zod_1.z.string().optional(),
    notes: zod_1.z.string().max(500).optional(),
    chairNumber: zod_1.z.number().int().positive().optional(),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
});
// ============================================
// SERVICE
// ============================================
class OrderService {
    itemService = new index_js_4.ItemService();
    async create(data, userId) {
        // Verify session
        const session = await index_js_1.prisma.session.findUnique({
            where: { id: data.sessionId },
            include: {
                space: {
                    include: { organization: true },
                },
            },
        });
        if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
            throw new errors_js_1.BadRequestError('Invalid or expired session');
        }
        // Calculate order totals
        let subtotal = new library_1.Decimal(0);
        const orderItems = [];
        for (const orderItem of data.items) {
            const item = await this.itemService.findById(orderItem.itemId);
            if (!item.isAvailable || !item.isActive) {
                throw new errors_js_1.BadRequestError(`Item "${item.name}" is not available`);
            }
            // Check stock
            if (item.stock !== null && item.stock < orderItem.quantity) {
                throw new errors_js_1.BadRequestError(`Insufficient stock for "${item.name}"`);
            }
            const unitPrice = item.isFree ? new library_1.Decimal(0) : item.price;
            const total = unitPrice.mul(orderItem.quantity);
            subtotal = subtotal.add(total);
            orderItems.push({
                itemId: item.id,
                quantity: orderItem.quantity,
                unitPrice,
                total,
                options: orderItem.options,
                notes: orderItem.notes,
            });
        }
        // Apply coupon if provided
        let discount = new library_1.Decimal(0);
        let couponId;
        if (data.couponCode) {
            const coupon = await index_js_1.prisma.coupon.findUnique({
                where: {
                    code_organizationId: {
                        code: data.couponCode.toUpperCase(),
                        organizationId: session.space.organizationId,
                    },
                },
            });
            if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > new Date())) {
                if (coupon.minOrderAmount && subtotal.lessThan(coupon.minOrderAmount)) {
                    throw new errors_js_1.BadRequestError(`Minimum order amount is ₹${coupon.minOrderAmount}`);
                }
                if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                    throw new errors_js_1.BadRequestError('Coupon usage limit reached');
                }
                if (coupon.type === 'PERCENTAGE') {
                    discount = subtotal.mul(coupon.value).div(100);
                    if (coupon.maxDiscount && discount.greaterThan(coupon.maxDiscount)) {
                        discount = coupon.maxDiscount;
                    }
                }
                else {
                    discount = coupon.value;
                }
                couponId = coupon.id;
            }
        }
        const total = subtotal.sub(discount);
        // Generate order number
        const orderCount = await index_js_1.prisma.order.count({
            where: { organizationId: session.space.organizationId },
        });
        const orderNumber = `ORD-${String(orderCount + 1).padStart(5, '0')}`;
        // Create order
        const order = await index_js_1.prisma.order.create({
            data: {
                orderNumber,
                organizationId: session.space.organizationId,
                sessionId: session.id,
                spaceId: session.spaceId,
                userId,
                couponId,
                subtotal,
                discount,
                total,
                chairNumber: data.chairNumber,
                notes: data.notes,
                items: {
                    create: orderItems,
                },
            },
            include: {
                items: {
                    include: { item: true },
                },
                space: true,
                coupon: true,
            },
        });
        // Update stock for each item
        for (const orderItem of orderItems) {
            await this.itemService.updateStock(orderItem.itemId, -orderItem.quantity);
        }
        // Update coupon usage
        if (couponId) {
            await index_js_1.prisma.coupon.update({
                where: { id: couponId },
                data: { usageCount: { increment: 1 } },
            });
        }
        // Publish order event for real-time updates
        await index_js_1.redis.publish(`orders:${session.space.organizationId}`, JSON.stringify({ type: 'NEW_ORDER', order }));
        return order;
    }
    async findById(id) {
        const order = await index_js_1.prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { item: true } },
                space: true,
                user: { select: { id: true, name: true, email: true } },
                coupon: true,
                payment: true,
            },
        });
        if (!order) {
            throw new errors_js_1.NotFoundError('Order not found');
        }
        return order;
    }
    async findByOrg(orgId, options = {}) {
        const where = {
            organizationId: orgId,
            ...(options.status && { status: options.status }),
        };
        const [orders, total] = await Promise.all([
            index_js_1.prisma.order.findMany({
                where,
                include: {
                    items: { include: { item: { select: { id: true, name: true, icon: true } } } },
                    space: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true } },
                },
                orderBy: { placedAt: 'desc' },
                take: options.limit ?? 50,
                skip: options.offset ?? 0,
            }),
            index_js_1.prisma.order.count({ where }),
        ]);
        return { orders, total };
    }
    async findBySession(sessionId) {
        return index_js_1.prisma.order.findMany({
            where: { sessionId },
            include: {
                items: { include: { item: true } },
                payment: true,
            },
            orderBy: { placedAt: 'desc' },
        });
    }
    async updateStatus(id, status, orgId) {
        const order = await this.findById(id);
        if (order.organizationId !== orgId) {
            throw new errors_js_1.ForbiddenError('Cannot update order from different organization');
        }
        const now = new Date();
        const statusTimestamps = {
            ACCEPTED: { acceptedAt: now },
            PREPARING: { preparingAt: now },
            READY: { readyAt: now },
            DELIVERED: { deliveredAt: now },
            CANCELLED: { cancelledAt: now },
        };
        const updated = await index_js_1.prisma.order.update({
            where: { id },
            data: {
                status: status,
                ...statusTimestamps[status],
            },
            include: {
                items: { include: { item: true } },
                space: true,
            },
        });
        // Publish status update
        await index_js_1.redis.publish(`orders:${orgId}`, JSON.stringify({ type: 'STATUS_UPDATE', order: updated }));
        return updated;
    }
}
exports.OrderService = OrderService;
// ============================================
// CONTROLLER
// ============================================
class OrderController {
    orderService;
    constructor(orderService = new OrderService()) {
        this.orderService = orderService;
    }
    create = async (req, res) => {
        const order = await this.orderService.create(req.body, req.user?.id);
        (0, index_js_3.sendCreated)(res, order);
    };
    getById = async (req, res) => {
        const order = await this.orderService.findById(req.params.id);
        (0, index_js_3.sendSuccess)(res, order);
    };
    list = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const { status, limit, offset } = req.query;
        const result = await this.orderService.findByOrg(req.user.organizationId, {
            status: status,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        (0, index_js_3.sendSuccess)(res, result.orders, 200, { total: result.total });
    };
    getBySession = async (req, res) => {
        const orders = await this.orderService.findBySession(req.params.sessionId);
        (0, index_js_3.sendSuccess)(res, orders);
    };
    updateStatus = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const order = await this.orderService.updateStatus(req.params.id, req.body.status, req.user.organizationId);
        (0, index_js_3.sendSuccess)(res, order);
    };
}
exports.OrderController = OrderController;
// ============================================
// ROUTES
// ============================================
function orderRoutes() {
    const router = (0, express_1.Router)();
    const controller = new OrderController();
    router.post('/', index_js_2.optionalAuth, (0, index_js_2.validate)(exports.createOrderSchema), controller.create);
    router.get('/', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN', 'PANTRY'), controller.list);
    router.get('/session/:sessionId', index_js_2.optionalAuth, controller.getBySession);
    router.get('/:id', index_js_2.optionalAuth, controller.getById);
    router.patch('/:id/status', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN', 'PANTRY'), (0, index_js_2.validate)(exports.updateOrderStatusSchema), controller.updateStatus);
    return router;
}
//# sourceMappingURL=index.js.map