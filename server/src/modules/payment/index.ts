// Payment module - pluggable payment provider interface

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma, config } from '../../config/index.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors.js';
import { validate, authenticate, optionalAuth } from '../../common/middleware/index.js';
import { sendSuccess } from '../../common/utils/index.js';

// ============================================
// PAYMENT PROVIDER INTERFACE
// ============================================

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerification {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(amount: number, currency: string, orderId: string): Promise<PaymentOrder>;
  verifyPayment(paymentId: string, orderId: string, signature: string): Promise<boolean>;
  refund(paymentId: string, amount?: number): Promise<{ id: string; status: string; }>;
}

// ============================================
// RAZORPAY PROVIDER
// ============================================

export class RazorpayProvider implements PaymentProvider {
  name = 'razorpay';
  private client: Razorpay;

  constructor() {
    if (!config.payment.razorpay.keyId || !config.payment.razorpay.keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    this.client = new Razorpay({
      key_id: config.payment.razorpay.keyId,
      key_secret: config.payment.razorpay.keySecret,
    });
  }

  async createOrder(amount: number, currency: string, orderId: string): Promise<PaymentOrder> {
    const order = await this.client.orders.create({
      amount: amount * 100, // Razorpay expects paise
      currency,
      receipt: orderId,
    });

    return {
      id: order.id,
      amount: order.amount as number / 100,
      currency: order.currency as string,
      receipt: orderId,
    };
  }

  async verifyPayment(paymentId: string, orderId: string, signature: string): Promise<boolean> {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.payment.razorpay.keySecret!)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async refund(paymentId: string, amount?: number) {
    const refund = await this.client.payments.refund(paymentId, {
      ...(amount && { amount: amount * 100 }),
    });

    return { id: refund.id, status: refund.status as string };
  }
}

// ============================================
// FREE PROVIDER (for orgs without payment)
// ============================================

export class FreeProvider implements PaymentProvider {
  name = 'free';

  async createOrder(amount: number, currency: string, orderId: string): Promise<PaymentOrder> {
    return {
      id: `free-${orderId}`,
      amount: 0,
      currency,
      receipt: orderId,
    };
  }

  async verifyPayment(): Promise<boolean> {
    return true;
  }

  async refund() {
    return { id: 'free-refund', status: 'processed' };
  }
}

// ============================================
// PROVIDER FACTORY
// ============================================

export function getPaymentProvider(providerName?: string): PaymentProvider {
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

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string(),
  providerOrderId: z.string(),
  signature: z.string(),
});

// ============================================
// SERVICE
// ============================================

export class PaymentService {
  async initiatePayment(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        organization: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.payment) {
      if (order.payment.status === 'COMPLETED') {
        throw new BadRequestError('Order already paid');
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
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'free',
          amount: order.total,
          status: 'COMPLETED',
        },
      });

      await prisma.order.update({
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
    const paymentOrder = await provider.createOrder(
      order.total.toNumber(),
      'INR',
      order.orderNumber
    );

    const payment = await prisma.payment.create({
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
      keyId: config.payment.razorpay.keyId, // For Razorpay client
    };
  }

  async verifyPayment(data: z.infer<typeof verifyPaymentSchema>) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        organization: true,
        payment: true,
      },
    });

    if (!order || !order.payment) {
      throw new NotFoundError('Order or payment not found');
    }

    const provider = getPaymentProvider(order.organization.paymentProvider ?? undefined);
    const isValid = await provider.verifyPayment(
      data.paymentId,
      data.providerOrderId,
      data.signature
    );

    if (!isValid) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestError('Payment verification failed');
    }

    await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: 'COMPLETED',
        externalId: data.paymentId,
        metadata: { signature: data.signature },
      },
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: 'ACCEPTED' },
    });

    return { success: true };
  }

  async refund(orderId: string, amount?: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, organization: true },
    });

    if (!order || !order.payment || order.payment.status !== 'COMPLETED') {
      throw new BadRequestError('No completed payment found for this order');
    }

    const provider = getPaymentProvider(order.organization.paymentProvider ?? undefined);
    const refundResult = await provider.refund(order.payment.externalId!, amount);

    const refundAmount = amount ?? order.payment.amount.toNumber();
    const newRefundedAmount = (order.payment.refundedAmount?.toNumber() ?? 0) + refundAmount;

    await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: newRefundedAmount >= order.payment.amount.toNumber() ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAmount: new Decimal(newRefundedAmount),
        refundedAt: new Date(),
      },
    });

    return { success: true, refundId: refundResult.id };
  }
}

// ============================================
// CONTROLLER
// ============================================

export class PaymentController {
  constructor(private paymentService = new PaymentService()) { }

  initiate = async (req: Request, res: Response) => {
    const result = await this.paymentService.initiatePayment(req.body.orderId);
    sendSuccess(res, result);
  };

  verify = async (req: Request, res: Response) => {
    const result = await this.paymentService.verifyPayment(req.body);
    sendSuccess(res, result);
  };

  refund = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const { orderId } = req.params;
    const { amount } = req.body;
    const result = await this.paymentService.refund(orderId, amount);
    sendSuccess(res, result);
  };
}

// ============================================
// ROUTES
// ============================================

export function paymentRoutes() {
  const router = Router();
  const controller = new PaymentController();

  router.post('/initiate', optionalAuth, validate(initiatePaymentSchema), controller.initiate);
  router.post('/verify', validate(verifyPaymentSchema), controller.verify);
  router.post('/refund/:orderId', authenticate, controller.refund);

  return router;
}
