"use strict";
// Payment module - pluggable payment provider interface
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = exports.PaymentService = exports.verifyPaymentSchema = exports.initiatePaymentSchema = exports.FreeProvider = exports.RazorpayProvider = void 0;
exports.getPaymentProvider = getPaymentProvider;
exports.paymentRoutes = paymentRoutes;
const zod_1 = require("zod");
const express_1 = require("express");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const library_1 = require("@prisma/client/runtime/library");
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../../common/errors.js");
const index_js_2 = require("../../common/middleware/index.js");
const index_js_3 = require("../../common/utils/index.js");
// ============================================
// RAZORPAY PROVIDER
// ============================================
class RazorpayProvider {
    name = 'razorpay';
    client;
    constructor() {
        if (!index_js_1.config.payment.razorpay.keyId || !index_js_1.config.payment.razorpay.keySecret) {
            throw new Error('Razorpay credentials not configured');
        }
        this.client = new razorpay_1.default({
            key_id: index_js_1.config.payment.razorpay.keyId,
            key_secret: index_js_1.config.payment.razorpay.keySecret,
        });
    }
    async createOrder(amount, currency, orderId) {
        const order = await this.client.orders.create({
            amount: amount * 100, // Razorpay expects paise
            currency,
            receipt: orderId,
        });
        return {
            id: order.id,
            amount: order.amount / 100,
            currency: order.currency,
            receipt: orderId,
        };
    }
    async verifyPayment(paymentId, orderId, signature) {
        const body = orderId + '|' + paymentId;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', index_js_1.config.payment.razorpay.keySecret)
            .update(body)
            .digest('hex');
        return expectedSignature === signature;
    }
    async refund(paymentId, amount) {
        const refund = await this.client.payments.refund(paymentId, {
            ...(amount && { amount: amount * 100 }),
        });
        return { id: refund.id, status: refund.status };
    }
}
exports.RazorpayProvider = RazorpayProvider;
// ============================================
// FREE PROVIDER (for orgs without payment)
// ============================================
class FreeProvider {
    name = 'free';
    async createOrder(amount, currency, orderId) {
        return {
            id: `free-${orderId}`,
            amount: 0,
            currency,
            receipt: orderId,
        };
    }
    async verifyPayment() {
        return true;
    }
    async refund() {
        return { id: 'free-refund', status: 'processed' };
    }
}
exports.FreeProvider = FreeProvider;
// ============================================
// PROVIDER FACTORY
// ============================================
function getPaymentProvider(providerName) {
    switch (providerName) {
        case 'razorpay':
            return new RazorpayProvider();
        case 'stripe':
            throw new Error('Stripe provider not implemented yet');
        case 'free':
        default:
            return new FreeProvider();
    }
}
// ============================================
// SCHEMAS
// ============================================
exports.initiatePaymentSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid(),
});
exports.verifyPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid(),
    paymentId: zod_1.z.string(),
    providerOrderId: zod_1.z.string(),
    signature: zod_1.z.string(),
});
// ============================================
// SERVICE
// ============================================
class PaymentService {
    async initiatePayment(orderId) {
        const order = await index_js_1.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                organization: true,
                payment: true,
            },
        });
        if (!order) {
            throw new errors_js_1.NotFoundError('Order not found');
        }
        if (order.payment) {
            if (order.payment.status === 'COMPLETED') {
                throw new errors_js_1.BadRequestError('Order already paid');
            }
            // Return existing payment order
            return {
                paymentId: order.payment.id,
                providerOrderId: order.payment.externalOrderId,
                amount: order.total,
                currency: 'INR',
                provider: order.payment.provider,
            };
        }
        // If free order (no payment required or zero total)
        if (!order.organization.requirePayment || order.total.equals(0)) {
            const payment = await index_js_1.prisma.payment.create({
                data: {
                    orderId: order.id,
                    provider: 'free',
                    amount: order.total,
                    status: 'COMPLETED',
                },
            });
            await index_js_1.prisma.order.update({
                where: { id: orderId },
                data: { status: 'ACCEPTED' },
            });
            return {
                paymentId: payment.id,
                providerOrderId: null,
                amount: 0,
                currency: 'INR',
                provider: 'free',
                completed: true,
            };
        }
        // Create payment order with provider
        const provider = getPaymentProvider(order.organization.paymentProvider ?? undefined);
        const paymentOrder = await provider.createOrder(order.total.toNumber(), 'INR', order.orderNumber);
        const payment = await index_js_1.prisma.payment.create({
            data: {
                orderId: order.id,
                provider: provider.name,
                amount: order.total,
                externalOrderId: paymentOrder.id,
                status: 'PENDING',
            },
        });
        return {
            paymentId: payment.id,
            providerOrderId: paymentOrder.id,
            amount: order.total,
            currency: 'INR',
            provider: provider.name,
            keyId: index_js_1.config.payment.razorpay.keyId, // For Razorpay client
        };
    }
    async verifyPayment(data) {
        const order = await index_js_1.prisma.order.findUnique({
            where: { id: data.orderId },
            include: {
                organization: true,
                payment: true,
            },
        });
        if (!order || !order.payment) {
            throw new errors_js_1.NotFoundError('Order or payment not found');
        }
        const provider = getPaymentProvider(order.organization.paymentProvider ?? undefined);
        const isValid = await provider.verifyPayment(data.paymentId, data.providerOrderId, data.signature);
        if (!isValid) {
            await index_js_1.prisma.payment.update({
                where: { id: order.payment.id },
                data: { status: 'FAILED' },
            });
            throw new errors_js_1.BadRequestError('Payment verification failed');
        }
        await index_js_1.prisma.payment.update({
            where: { id: order.payment.id },
            data: {
                status: 'COMPLETED',
                externalId: data.paymentId,
                metadata: { signature: data.signature },
            },
        });
        await index_js_1.prisma.order.update({
            where: { id: data.orderId },
            data: { status: 'ACCEPTED' },
        });
        return { success: true };
    }
    async refund(orderId, amount) {
        const order = await index_js_1.prisma.order.findUnique({
            where: { id: orderId },
            include: { payment: true, organization: true },
        });
        if (!order || !order.payment || order.payment.status !== 'COMPLETED') {
            throw new errors_js_1.BadRequestError('No completed payment found for this order');
        }
        const provider = getPaymentProvider(order.organization.paymentProvider ?? undefined);
        const refundResult = await provider.refund(order.payment.externalId, amount);
        const refundAmount = amount ?? order.payment.amount.toNumber();
        const newRefundedAmount = (order.payment.refundedAmount?.toNumber() ?? 0) + refundAmount;
        await index_js_1.prisma.payment.update({
            where: { id: order.payment.id },
            data: {
                status: newRefundedAmount >= order.payment.amount.toNumber() ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                refundedAmount: new library_1.Decimal(newRefundedAmount),
                refundedAt: new Date(),
            },
        });
        return { success: true, refundId: refundResult.id };
    }
}
exports.PaymentService = PaymentService;
// ============================================
// CONTROLLER
// ============================================
class PaymentController {
    paymentService;
    constructor(paymentService = new PaymentService()) {
        this.paymentService = paymentService;
    }
    initiate = async (req, res) => {
        const result = await this.paymentService.initiatePayment(req.body.orderId);
        (0, index_js_3.sendSuccess)(res, result);
    };
    verify = async (req, res) => {
        const result = await this.paymentService.verifyPayment(req.body);
        (0, index_js_3.sendSuccess)(res, result);
    };
    refund = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const { orderId } = req.params;
        const { amount } = req.body;
        const result = await this.paymentService.refund(orderId, amount);
        (0, index_js_3.sendSuccess)(res, result);
    };
}
exports.PaymentController = PaymentController;
// ============================================
// ROUTES
// ============================================
function paymentRoutes() {
    const router = (0, express_1.Router)();
    const controller = new PaymentController();
    router.post('/initiate', index_js_2.optionalAuth, (0, index_js_2.validate)(exports.initiatePaymentSchema), controller.initiate);
    router.post('/verify', (0, index_js_2.validate)(exports.verifyPaymentSchema), controller.verify);
    router.post('/refund/:orderId', index_js_2.authenticate, controller.refund);
    return router;
}
//# sourceMappingURL=index.js.map