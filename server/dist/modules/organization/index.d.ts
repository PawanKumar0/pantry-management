import { z } from 'zod';
import { Response, Request } from 'express';
export declare const createOrgSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    logo: z.ZodOptional<z.ZodString>;
    requirePayment: z.ZodDefault<z.ZodBoolean>;
    paymentProvider: z.ZodOptional<z.ZodEnum<["razorpay", "stripe", "custom"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    requirePayment: boolean;
    logo?: string | undefined;
    paymentProvider?: "custom" | "razorpay" | "stripe" | undefined;
}, {
    name: string;
    slug: string;
    logo?: string | undefined;
    requirePayment?: boolean | undefined;
    paymentProvider?: "custom" | "razorpay" | "stripe" | undefined;
}>;
export declare const updateOrgSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    requirePayment: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    paymentProvider: z.ZodOptional<z.ZodOptional<z.ZodEnum<["razorpay", "stripe", "custom"]>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    slug?: string | undefined;
    logo?: string | undefined;
    requirePayment?: boolean | undefined;
    paymentProvider?: "custom" | "razorpay" | "stripe" | undefined;
}, {
    name?: string | undefined;
    slug?: string | undefined;
    logo?: string | undefined;
    requirePayment?: boolean | undefined;
    paymentProvider?: "custom" | "razorpay" | "stripe" | undefined;
}>;
export declare class OrganizationService {
    create(data: z.infer<typeof createOrgSchema>): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logo: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        requirePayment: boolean;
        paymentProvider: string | null;
        paymentConfig: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findById(id: string): Promise<{
        _count: {
            spaces: number;
            categories: number;
            users: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logo: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        requirePayment: boolean;
        paymentProvider: string | null;
        paymentConfig: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findBySlug(slug: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logo: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        requirePayment: boolean;
        paymentProvider: string | null;
        paymentConfig: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    update(id: string, data: z.infer<typeof updateOrgSchema>): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logo: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        requirePayment: boolean;
        paymentProvider: string | null;
        paymentConfig: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    delete(id: string): Promise<void>;
    getStats(id: string): Promise<{
        spaces: number;
        users: number;
        orders: number;
        revenue: number | import("@prisma/client/runtime/library").Decimal;
    }>;
}
export declare class OrganizationController {
    private orgService;
    constructor(orgService?: OrganizationService);
    create: (req: Request, res: Response) => Promise<void>;
    getById: (req: Request, res: Response) => Promise<void>;
    getBySlug: (req: Request, res: Response) => Promise<void>;
    getCurrent: (req: Request, res: Response) => Promise<void>;
    update: (req: Request, res: Response) => Promise<void>;
    getStats: (req: Request, res: Response) => Promise<void>;
}
export declare function organizationRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map