// Order module - order management with real-time updates

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma, redis } from '../../config/index.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors.js';
import { validate, authenticate, requireRole, optionalAuth } from '../../common/middleware/index.js';
import { sendSuccess, sendCreated } from '../../common/utils/index.js';
import { ItemService } from '../inventory/index.js';

// ============================================
// SCHEMAS
// ============================================

export const orderItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  options: z.record(z.string()).optional(),
  notes: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1).max(50),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
  chairNumber: z.number().int().positive().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
});

// ============================================
// SERVICE
// ============================================

export class OrderService {
  private itemService = new ItemService();

  async create(data: z.infer<typeof createOrderSchema>, userId?: string) {
    // Verify session
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
      include: {
        space: {
          include: { organization: true },
        },
      },
    });

    if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired session');
    }

    // Calculate order totals
    let subtotal = new Decimal(0);
    const orderItems: Array<{
      itemId: string;
      quantity: number;
      unitPrice: Decimal;
      total: Decimal;
      options?: Record<string, string>;
      notes?: string;
    }> = [];

    for (const orderItem of data.items) {
      const item = await this.itemService.findById(orderItem.itemId);

      if (!item.isAvailable || !item.isActive) {
        throw new BadRequestError(`Item "${item.name}" is not available`);
      }

      // Check stock
      if (item.stock !== null && item.stock < orderItem.quantity) {
        throw new BadRequestError(`Insufficient stock for "${item.name}"`);
      }

      const unitPrice = item.isFree ? new Decimal(0) : item.price;
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
    let discount = new Decimal(0);
    let couponId: string | undefined;

    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: {
          code_organizationId: {
            code: data.couponCode.toUpperCase(),
            organizationId: session.space.organizationId,
          },
        },
      });

      if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > new Date())) {
        if (coupon.minOrderAmount && subtotal.lessThan(coupon.minOrderAmount)) {
          throw new BadRequestError(`Minimum order amount is ₹${coupon.minOrderAmount}`);
        }

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          throw new BadRequestError('Coupon usage limit reached');
        }

        if (coupon.type === 'PERCENTAGE') {
          discount = subtotal.mul(coupon.value).div(100);
          if (coupon.maxDiscount && discount.greaterThan(coupon.maxDiscount)) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.value;
        }

        couponId = coupon.id;
      }
    }

    const total = subtotal.sub(discount);

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { organizationId: session.space.organizationId },
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, '0')}`;

    // Create order
    const order = await prisma.order.create({
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
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Publish order event for real-time updates
    await redis.publish(
      `orders:${session.space.organizationId}`,
      JSON.stringify({ type: 'NEW_ORDER', order })
    );

    return order;
  }

  async findById(id: string) {
    const order = await prisma.order.findUnique({
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
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  async findByOrg(orgId: string, options: { status?: string; limit?: number; offset?: number; } = {}) {
    const where = {
      organizationId: orgId,
      ...(options.status && { status: options.status as any }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async findBySession(sessionId: string) {
    return prisma.order.findMany({
      where: { sessionId },
      include: {
        items: { include: { item: true } },
        payment: true,
      },
      orderBy: { placedAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, orgId: string) {
    const order = await this.findById(id);

    if (order.organizationId !== orgId) {
      throw new ForbiddenError('Cannot update order from different organization');
    }

    const now = new Date();
    const statusTimestamps: Record<string, object> = {
      ACCEPTED: { acceptedAt: now },
      PREPARING: { preparingAt: now },
      READY: { readyAt: now },
      DELIVERED: { deliveredAt: now },
      CANCELLED: { cancelledAt: now },
    };

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: status as any,
        ...statusTimestamps[status],
      },
      include: {
        items: { include: { item: true } },
        space: true,
      },
    });

    // Publish status update
    await redis.publish(
      `orders:${orgId}`,
      JSON.stringify({ type: 'STATUS_UPDATE', order: updated })
    );

    return updated;
  }
}

// ============================================
// CONTROLLER
// ============================================

export class OrderController {
  constructor(private orderService = new OrderService()) { }

  create = async (req: Request, res: Response) => {
    const order = await this.orderService.create(req.body, req.user?.id);
    sendCreated(res, order);
  };

  getById = async (req: Request, res: Response) => {
    const order = await this.orderService.findById(req.params.id);
    sendSuccess(res, order);
  };

  list = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const { status, limit, offset } = req.query;
    const result = await this.orderService.findByOrg(req.user.organizationId, {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    sendSuccess(res, result.orders, 200, { total: result.total });
  };

  getBySession = async (req: Request, res: Response) => {
    const orders = await this.orderService.findBySession(req.params.sessionId);
    sendSuccess(res, orders);
  };

  updateStatus = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const order = await this.orderService.updateStatus(
      req.params.id,
      req.body.status,
      req.user.organizationId
    );
    sendSuccess(res, order);
  };
}

// ============================================
// ROUTES
// ============================================

export function orderRoutes() {
  const router = Router();
  const controller = new OrderController();

  router.post('/', optionalAuth, validate(createOrderSchema), controller.create);
  router.get('/', authenticate, requireRole('ADMIN', 'PANTRY'), controller.list);
  router.get('/session/:sessionId', optionalAuth, controller.getBySession);
  router.get('/:id', optionalAuth, controller.getById);
  router.patch('/:id/status', authenticate, requireRole('ADMIN', 'PANTRY'), validate(updateOrderStatusSchema), controller.updateStatus);

  return router;
}
