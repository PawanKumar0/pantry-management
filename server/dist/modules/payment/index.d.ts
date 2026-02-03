import { z } from 'zod';
import { Response, Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
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
    refund(paymentId: string, amount?: number): Promise<{
        id: string;
        status: string;
    }>;
}
export declare class RazorpayProvider implements PaymentProvider {
    name: string;
    private client;
    constructor();
    createOrder(amount: number, currency: string, orderId: string): Promise<PaymentOrder>;
    verifyPayment(paymentId: string, orderId: string, signature: string): Promise<boolean>;
    refund(paymentId: string, amount?: number): Promise<{
        id: string;
        status: string;
    }>;
}
export declare class FreeProvider implements PaymentProvider {
    name: string;
    createOrder(amount: number, currency: string, orderId: string): Promise<PaymentOrder>;
    verifyPayment(): Promise<boolean>;
    refund(): Promise<{
        id: string;
        status: string;
    }>;
}
export declare function getPaymentProvider(providerName?: string): PaymentProvider;
export declare const initiatePaymentSchema: z.ZodObject<{
    orderId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderId: string;
}, {
    orderId: string;
}>;
export declare const verifyPaymentSchema: z.ZodObject<{
    orderId: z.ZodString;
    paymentId: z.ZodString;
    providerOrderId: z.ZodString;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    paymentId: string;
    providerOrderId: string;
    signature: string;
}, {
    orderId: string;
    paymentId: string;
    providerOrderId: string;
    signature: string;
}>;
export declare class PaymentService {
    initiatePayment(orderId: string): Promise<{
        paymentId: string;
        providerOrderId: string | null;
        amount: Decimal;
        currency: string;
        provider: string;
        completed?: undefined;
        keyId?: undefined;
    } | {
        paymentId: string;
        providerOrderId: null;
        amount: number;
        currency: string;
        provider: string;
        completed: boolean;
        keyId?: undefined;
    } | {
        paymentId: string;
        providerOrderId: string;
        amount: Decimal;
        currency: string;
        provider: string;
        keyId: string | undefined;
        completed?: undefined;
    }>;
    verifyPayment(data: z.infer<typeof verifyPaymentSchema>): Promise<{
        success: boolean;
    }>;
    refund(orderId: string, amount?: number): Promise<{
        success: boolean;
        refundId: string;
    }>;
}
export declare class PaymentController {
    private paymentService;
    constructor(paymentService?: PaymentService);
    initiate: (req: Request, res: Response) => Promise<void>;
    verify: (req: Request, res: Response) => Promise<void>;
    refund: (req: Request, res: Response) => Promise<void>;
}
export declare function paymentRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map