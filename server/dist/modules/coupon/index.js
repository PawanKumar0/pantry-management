"use strict";
// Coupon module
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponController = exports.CouponService = exports.validateCouponSchema = exports.updateCouponSchema = exports.createCouponSchema = void 0;
exports.couponRoutes = couponRoutes;
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
exports.createCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(20).transform(s => s.toUpperCase()),
    description: zod_1.z.string().max(200).optional(),
    type: zod_1.z.enum(['PERCENTAGE', 'FIXED']),
    value: zod_1.z.number().positive(),
    minOrderAmount: zod_1.z.number().positive().optional(),
    maxDiscount: zod_1.z.number().positive().optional(), // Only for percentage
    usageLimit: zod_1.z.number().int().positive().optional(),
    perUserLimit: zod_1.z.number().int().positive().default(1),
    validFrom: zod_1.z.coerce.date().default(() => new Date()),
    validUntil: zod_1.z.coerce.date().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateCouponSchema = exports.createCouponSchema.partial();
exports.validateCouponSchema = zod_1.z.object({
    code: zod_1.z.string(),
    orderAmount: zod_1.z.number().positive(),
});
// ============================================
// SERVICE
// ============================================
class CouponService {
    async create(orgId, data) {
        // Check uniqueness within org
        const existing = await index_js_1.prisma.coupon.findUnique({
            where: {
                code_organizationId: { code: data.code, organizationId: orgId },
            },
        });
        if (existing) {
            throw new errors_js_1.ConflictError('Coupon code already exists');
        }
        return index_js_1.prisma.coupon.create({
            data: {
                ...data,
                value: new library_1.Decimal(data.value),
                minOrderAmount: data.minOrderAmount ? new library_1.Decimal(data.minOrderAmount) : null,
                maxDiscount: data.maxDiscount ? new library_1.Decimal(data.maxDiscount) : null,
                organizationId: orgId,
            },
        });
    }
    async findByOrg(orgId, includeInactive = false) {
        return index_js_1.prisma.coupon.findMany({
            where: {
                organizationId: orgId,
                ...(includeInactive ? {} : { isActive: true }),
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id, orgId) {
        const coupon = await index_js_1.prisma.coupon.findUnique({
            where: { id },
        });
        if (!coupon || coupon.organizationId !== orgId) {
            throw new errors_js_1.NotFoundError('Coupon not found');
        }
        return coupon;
    }
    async validate(orgId, code, orderAmount, userId) {
        const coupon = await index_js_1.prisma.coupon.findUnique({
            where: {
                code_organizationId: { code: code.toUpperCase(), organizationId: orgId },
            },
        });
        if (!coupon) {
            throw new errors_js_1.NotFoundError('Coupon not found');
        }
        // Check if active
        if (!coupon.isActive) {
            throw new errors_js_1.BadRequestError('Coupon is not active');
        }
        // Check validity dates
        const now = new Date();
        if (coupon.validFrom > now) {
            throw new errors_js_1.BadRequestError('Coupon is not yet valid');
        }
        if (coupon.validUntil && coupon.validUntil < now) {
            throw new errors_js_1.BadRequestError('Coupon has expired');
        }
        // Check usage limit
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new errors_js_1.BadRequestError('Coupon usage limit reached');
        }
        // Check per-user limit
        if (userId && coupon.perUserLimit) {
            const userUsage = await index_js_1.prisma.order.count({
                where: {
                    couponId: coupon.id,
                    userId,
                },
            });
            if (userUsage >= coupon.perUserLimit) {
                throw new errors_js_1.BadRequestError('You have already used this coupon');
            }
        }
        // Check minimum order amount
        if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount.toNumber()) {
            throw new errors_js_1.BadRequestError(`Minimum order amount is ₹${coupon.minOrderAmount}`);
        }
        // Calculate discount
        let discount;
        if (coupon.type === 'PERCENTAGE') {
            discount = orderAmount * (coupon.value.toNumber() / 100);
            if (coupon.maxDiscount && discount > coupon.maxDiscount.toNumber()) {
                discount = coupon.maxDiscount.toNumber();
            }
        }
        else {
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
    async update(id, orgId, data) {
        await this.findById(id, orgId);
        // Check uniqueness if code is being updated
        if (data.code) {
            const existing = await index_js_1.prisma.coupon.findFirst({
                where: {
                    code: data.code,
                    organizationId: orgId,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new errors_js_1.ConflictError('Coupon code already exists');
            }
        }
        return index_js_1.prisma.coupon.update({
            where: { id },
            data: {
                ...data,
                ...(data.value !== undefined && { value: new library_1.Decimal(data.value) }),
                ...(data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount ? new library_1.Decimal(data.minOrderAmount) : null }),
                ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount ? new library_1.Decimal(data.maxDiscount) : null }),
            },
        });
    }
    async delete(id, orgId) {
        await this.findById(id, orgId);
        await index_js_1.prisma.coupon.delete({ where: { id } });
    }
}
exports.CouponService = CouponService;
// ============================================
// CONTROLLER
// ============================================
class CouponController {
    couponService;
    constructor(couponService = new CouponService()) {
        this.couponService = couponService;
    }
    create = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const coupon = await this.couponService.create(req.user.organizationId, req.body);
        (0, index_js_3.sendCreated)(res, coupon);
    };
    list = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const includeInactive = req.query.includeInactive === 'true';
        const coupons = await this.couponService.findByOrg(req.user.organizationId, includeInactive);
        (0, index_js_3.sendSuccess)(res, coupons);
    };
    getById = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const coupon = await this.couponService.findById(req.params.id, req.user.organizationId);
        (0, index_js_3.sendSuccess)(res, coupon);
    };
    validate = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const result = await this.couponService.validate(req.user.organizationId, req.body.code, req.body.orderAmount, req.user.id);
        (0, index_js_3.sendSuccess)(res, result);
    };
    update = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const coupon = await this.couponService.update(req.params.id, req.user.organizationId, req.body);
        (0, index_js_3.sendSuccess)(res, coupon);
    };
    delete = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        await this.couponService.delete(req.params.id, req.user.organizationId);
        (0, index_js_3.sendNoContent)(res);
    };
}
exports.CouponController = CouponController;
// ============================================
// ROUTES
// ============================================
function couponRoutes() {
    const router = (0, express_1.Router)();
    const controller = new CouponController();
    router.get('/', index_js_2.authenticate, controller.list);
    router.get('/:id', index_js_2.authenticate, controller.getById);
    router.post('/', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), (0, index_js_2.validate)(exports.createCouponSchema), controller.create);
    router.post('/validate', index_js_2.authenticate, (0, index_js_2.validate)(exports.validateCouponSchema), controller.validate);
    router.patch('/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), (0, index_js_2.validate)(exports.updateCouponSchema), controller.update);
    router.delete('/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), controller.delete);
    return router;
}
//# sourceMappingURL=index.js.map