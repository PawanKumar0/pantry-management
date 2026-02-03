// Coupon module

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/index.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../common/errors.js';
import { validate, authenticate, requireRole } from '../../common/middleware/index.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/index.js';

// ============================================
// SCHEMAS
// ============================================

export const createCouponSchema = z.object({
  code: z.string().min(3).max(20).transform(s => s.toUpperCase()),
  description: z.string().max(200).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minOrderAmount: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(), // Only for percentage
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  validFrom: z.coerce.date().default(() => new Date()),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const updateCouponSchema = createCouponSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string(),
  orderAmount: z.number().positive(),
});

// ============================================
// SERVICE
// ============================================

export class CouponService {
  async create(orgId: string, data: z.infer<typeof createCouponSchema>) {
    // Check uniqueness within org
    const existing = await prisma.coupon.findUnique({
      where: {
        code_organizationId: { code: data.code, organizationId: orgId },
      },
    });

    if (existing) {
      throw new ConflictError('Coupon code already exists');
    }

    return prisma.coupon.create({
      data: {
        ...data,
        value: new Decimal(data.value),
        minOrderAmount: data.minOrderAmount ? new Decimal(data.minOrderAmount) : null,
        maxDiscount: data.maxDiscount ? new Decimal(data.maxDiscount) : null,
        organizationId: orgId,
      },
    });
  }

  async findByOrg(orgId: string, includeInactive = false) {
    return prisma.coupon.findMany({
      where: {
        organizationId: orgId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, orgId: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon || coupon.organizationId !== orgId) {
      throw new NotFoundError('Coupon not found');
    }

    return coupon;
  }

  async validate(orgId: string, code: string, orderAmount: number, userId?: string) {
    const coupon = await prisma.coupon.findUnique({
      where: {
        code_organizationId: { code: code.toUpperCase(), organizationId: orgId },
      },
    });

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    // Check if active
    if (!coupon.isActive) {
      throw new BadRequestError('Coupon is not active');
    }

    // Check validity dates
    const now = new Date();
    if (coupon.validFrom > now) {
      throw new BadRequestError('Coupon is not yet valid');
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      throw new BadRequestError('Coupon has expired');
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached');
    }

    // Check per-user limit
    if (userId && coupon.perUserLimit) {
      const userUsage = await prisma.order.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });
      if (userUsage >= coupon.perUserLimit) {
        throw new BadRequestError('You have already used this coupon');
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount.toNumber()) {
      throw new BadRequestError(`Minimum order amount is ₹${coupon.minOrderAmount}`);
    }

    // Calculate discount
    let discount: number;
    if (coupon.type === 'PERCENTAGE') {
      discount = orderAmount * (coupon.value.toNumber() / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount.toNumber()) {
        discount = coupon.maxDiscount.toNumber();
      }
    } else {
      discount = Math.min(coupon.value.toNumber(), orderAmount);
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
      },
      discount,
      finalAmount: orderAmount - discount,
    };
  }

  async update(id: string, orgId: string, data: z.infer<typeof updateCouponSchema>) {
    await this.findById(id, orgId);

    // Check uniqueness if code is being updated
    if (data.code) {
      const existing = await prisma.coupon.findFirst({
        where: {
          code: data.code,
          organizationId: orgId,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictError('Coupon code already exists');
      }
    }

    return prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        ...(data.value !== undefined && { value: new Decimal(data.value) }),
        ...(data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount ? new Decimal(data.minOrderAmount) : null }),
        ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount ? new Decimal(data.maxDiscount) : null }),
      },
    });
  }

  async delete(id: string, orgId: string) {
    await this.findById(id, orgId);
    await prisma.coupon.delete({ where: { id } });
  }
}

// ============================================
// CONTROLLER
// ============================================

export class CouponController {
  constructor(private couponService = new CouponService()) { }

  create = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const coupon = await this.couponService.create(req.user.organizationId, req.body);
    sendCreated(res, coupon);
  };

  list = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const includeInactive = req.query.includeInactive === 'true';
    const coupons = await this.couponService.findByOrg(req.user.organizationId, includeInactive);
    sendSuccess(res, coupons);
  };

  getById = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const coupon = await this.couponService.findById(req.params.id, req.user.organizationId);
    sendSuccess(res, coupon);
  };

  validate = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const result = await this.couponService.validate(
      req.user.organizationId,
      req.body.code,
      req.body.orderAmount,
      req.user.id
    );
    sendSuccess(res, result);
  };

  update = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const coupon = await this.couponService.update(req.params.id, req.user.organizationId, req.body);
    sendSuccess(res, coupon);
  };

  delete = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    await this.couponService.delete(req.params.id, req.user.organizationId);
    sendNoContent(res);
  };
}

// ============================================
// ROUTES
// ============================================

export function couponRoutes() {
  const router = Router();
  const controller = new CouponController();

  router.get('/', authenticate, controller.list);
  router.get('/:id', authenticate, controller.getById);
  router.post('/', authenticate, requireRole('ADMIN'), validate(createCouponSchema), controller.create);
  router.post('/validate', authenticate, validate(validateCouponSchema), controller.validate);
  router.patch('/:id', authenticate, requireRole('ADMIN'), validate(updateCouponSchema), controller.update);
  router.delete('/:id', authenticate, requireRole('ADMIN'), controller.delete);

  return router;
}
