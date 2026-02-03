import { z } from 'zod';
import { Response, Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
export declare const orderItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    quantity: z.ZodNumber;
    options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    itemId: string;
    quantity: number;
    options?: Record<string, string> | undefined;
    notes?: string | undefined;
}, {
    itemId: string;
    quantity: number;
    options?: Record<string, string> | undefined;
    notes?: string | undefined;
}>;
export declare const createOrderSchema: z.ZodObject<{
    sessionId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        quantity: z.ZodNumber;
        options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        itemId: string;
        quantity: number;
        options?: Record<string, string> | undefined;
        notes?: string | undefined;
    }, {
        itemId: string;
        quantity: number;
        options?: Record<string, string> | undefined;
        notes?: string | undefined;
    }>, "many">;
    couponCode: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    chairNumber: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    items: {
        itemId: string;
        quantity: number;
        options?: Record<string, string> | undefined;
        notes?: string | undefined;
    }[];
    sessionId: string;
    chairNumber?: number | undefined;
    notes?: string | undefined;
    couponCode?: string | undefined;
}, {
    items: {
        itemId: string;
        quantity: number;
        options?: Record<string, string> | undefined;
        notes?: string | undefined;
    }[];
    sessionId: string;
    chairNumber?: number | undefined;
    notes?: string | undefined;
    couponCode?: string | undefined;
}>;
export declare const updateOrderStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]>;
}, "strip", z.ZodTypeAny, {
    status: "ACCEPTED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
}, {
    status: "ACCEPTED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
}>;
export declare class OrderService {
    private itemService;
    create(data: z.infer<typeof createOrderSchema>, userId?: string): Promise<{
        space: {
            id: string;
            name: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            qrCode: string;
            description: string | null;
            location: string | null;
            qrImage: string | null;
            capacity: number | null;
            isActive: boolean;
        };
        coupon: {
            value: Decimal;
            code: string;
            type: import(".prisma/client").$Enums.CouponType;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isActive: boolean;
            minOrderAmount: Decimal | null;
            maxDiscount: Decimal | null;
            usageLimit: number | null;
            usageCount: number;
            perUserLimit: number;
            validFrom: Date;
            validUntil: Date | null;
        } | null;
        items: ({
            item: {
                options: import("@prisma/client/runtime/library").JsonValue | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                isActive: boolean;
                icon: string | null;
                categoryId: string;
                price: Decimal;
                isFree: boolean;
                image: string | null;
                stock: number | null;
                lowStockThreshold: number;
                autoIcon: boolean;
                isAvailable: boolean;
            };
        } & {
            options: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            total: Decimal;
            itemId: string;
            quantity: number;
            notes: string | null;
            unitPrice: Decimal;
            orderId: string;
        })[];
    } & {
        status: import(".prisma/client").$Enums.OrderStatus;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        total: Decimal;
        subtotal: Decimal;
        discount: Decimal;
        chairNumber: number | null;
        spaceId: string;
        notes: string | null;
        sessionId: string;
        orderNumber: string;
        placedAt: Date;
        acceptedAt: Date | null;
        preparingAt: Date | null;
        readyAt: Date | null;
        deliveredAt: Date | null;
        cancelledAt: Date | null;
        couponId: string | null;
    }>;
    findById(id: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
        space: {
            id: string;
            name: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            qrCode: string;
            description: string | null;
            location: string | null;
            qrImage: string | null;
            capacity: number | null;
            isActive: boolean;
        };
        payment: {
            status: import(".prisma/client").$Enums.PaymentStatus;
            id: string;
            provider: string;
            createdAt: Date;
            updatedAt: Date;
            orderId: string;
            amount: Decimal;
            currency: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            externalId: string | null;
            externalOrderId: string | null;
            refundedAmount: Decimal | null;
            refundedAt: Date | null;
        } | null;
        coupon: {
            value: Decimal;
            code: string;
            type: import(".prisma/client").$Enums.CouponType;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isActive: boolean;
            minOrderAmount: Decimal | null;
            maxDiscount: Decimal | null;
            usageLimit: number | null;
            usageCount: number;
            perUserLimit: number;
            validFrom: Date;
            validUntil: Date | null;
        } | null;
        items: ({
            item: {
                options: import("@prisma/client/runtime/library").JsonValue | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                isActive: boolean;
                icon: string | null;
                categoryId: string;
                price: Decimal;
                isFree: boolean;
                image: string | null;
                stock: number | null;
                lowStockThreshold: number;
                autoIcon: boolean;
                isAvailable: boolean;
            };
        } & {
            options: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            total: Decimal;
            itemId: string;
            quantity: number;
            notes: string | null;
            unitPrice: Decimal;
            orderId: string;
        })[];
    } & {
        status: import(".prisma/client").$Enums.OrderStatus;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        total: Decimal;
        subtotal: Decimal;
        discount: Decimal;
        chairNumber: number | null;
        spaceId: string;
        notes: string | null;
        sessionId: string;
        orderNumber: string;
        placedAt: Date;
        acceptedAt: Date | null;
        preparingAt: Date | null;
        readyAt: Date | null;
        deliveredAt: Date | null;
        cancelledAt: Date | null;
        couponId: string | null;
    }>;
    findByOrg(orgId: string, options?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        orders: ({
            user: {
                id: string;
                name: string | null;
            } | null;
            space: {
                id: string;
                name: string;
            };
            items: ({
                item: {
                    id: string;
                    name: string;
                    icon: string | null;
                };
            } & {
                options: import("@prisma/client/runtime/library").JsonValue | null;
                id: string;
                createdAt: Date;
                total: Decimal;
                itemId: string;
                quantity: number;
                notes: string | null;
                unitPrice: Decimal;
                orderId: string;
            })[];
        } & {
            status: import(".prisma/client").$Enums.OrderStatus;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            total: Decimal;
            subtotal: Decimal;
            discount: Decimal;
            chairNumber: number | null;
            spaceId: string;
            notes: string | null;
            sessionId: string;
            orderNumber: string;
            placedAt: Date;
            acceptedAt: Date | null;
            preparingAt: Date | null;
            readyAt: Date | null;
            deliveredAt: Date | null;
            cancelledAt: Date | null;
            couponId: string | null;
        })[];
        total: number;
    }>;
    findBySession(sessionId: string): Promise<({
        payment: {
            status: import(".prisma/client").$Enums.PaymentStatus;
            id: string;
            provider: string;
            createdAt: Date;
            updatedAt: Date;
            orderId: string;
            amount: Decimal;
            currency: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            externalId: string | null;
            externalOrderId: string | null;
            refundedAmount: Decimal | null;
            refundedAt: Date | null;
        } | null;
        items: ({
            item: {
                options: import("@prisma/client/runtime/library").JsonValue | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                isActive: boolean;
                icon: string | null;
                categoryId: string;
                price: Decimal;
                isFree: boolean;
                image: string | null;
                stock: number | null;
                lowStockThreshold: number;
                autoIcon: boolean;
                isAvailable: boolean;
            };
        } & {
            options: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            total: Decimal;
            itemId: string;
            quantity: number;
            notes: string | null;
            unitPrice: Decimal;
            orderId: string;
        })[];
    } & {
        status: import(".prisma/client").$Enums.OrderStatus;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        total: Decimal;
        subtotal: Decimal;
        discount: Decimal;
        chairNumber: number | null;
        spaceId: string;
        notes: string | null;
        sessionId: string;
        orderNumber: string;
        placedAt: Date;
        acceptedAt: Date | null;
        preparingAt: Date | null;
        readyAt: Date | null;
        deliveredAt: Date | null;
        cancelledAt: Date | null;
        couponId: string | null;
    })[]>;
    updateStatus(id: string, status: string, orgId: string): Promise<{
        space: {
            id: string;
            name: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            qrCode: string;
            description: string | null;
            location: string | null;
            qrImage: string | null;
            capacity: number | null;
            isActive: boolean;
        };
        items: ({
            item: {
                options: import("@prisma/client/runtime/library").JsonValue | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                isActive: boolean;
                icon: string | null;
                categoryId: string;
                price: Decimal;
                isFree: boolean;
                image: string | null;
                stock: number | null;
                lowStockThreshold: number;
                autoIcon: boolean;
                isAvailable: boolean;
            };
        } & {
            options: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            total: Decimal;
            itemId: string;
            quantity: number;
            notes: string | null;
            unitPrice: Decimal;
            orderId: string;
        })[];
    } & {
        status: import(".prisma/client").$Enums.OrderStatus;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        total: Decimal;
        subtotal: Decimal;
        discount: Decimal;
        chairNumber: number | null;
        spaceId: string;
        notes: string | null;
        sessionId: string;
        orderNumber: string;
        placedAt: Date;
        acceptedAt: Date | null;
        preparingAt: Date | null;
        readyAt: Date | null;
        deliveredAt: Date | null;
        cancelledAt: Date | null;
        couponId: string | null;
    }>;
}
export declare class OrderController {
    private orderService;
    constructor(orderService?: OrderService);
    create: (req: Request, res: Response) => Promise<void>;
    getById: (req: Request, res: Response) => Promise<void>;
    list: (req: Request, res: Response) => Promise<void>;
    getBySession: (req: Request, res: Response) => Promise<void>;
    updateStatus: (req: Request, res: Response) => Promise<void>;
}
export declare function orderRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map