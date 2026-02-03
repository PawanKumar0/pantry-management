import { z } from 'zod';
import { Response, Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
export declare const createCouponSchema: z.ZodObject<{
    code: z.ZodEffects<z.ZodString, string, string>;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["PERCENTAGE", "FIXED"]>;
    value: z.ZodNumber;
    minOrderAmount: z.ZodOptional<z.ZodNumber>;
    maxDiscount: z.ZodOptional<z.ZodNumber>;
    usageLimit: z.ZodOptional<z.ZodNumber>;
    perUserLimit: z.ZodDefault<z.ZodNumber>;
    validFrom: z.ZodDefault<z.ZodDate>;
    validUntil: z.ZodOptional<z.ZodDate>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: number;
    code: string;
    type: "PERCENTAGE" | "FIXED";
    isActive: boolean;
    perUserLimit: number;
    validFrom: Date;
    description?: string | undefined;
    minOrderAmount?: number | undefined;
    maxDiscount?: number | undefined;
    usageLimit?: number | undefined;
    validUntil?: Date | undefined;
}, {
    value: number;
    code: string;
    type: "PERCENTAGE" | "FIXED";
    description?: string | undefined;
    isActive?: boolean | undefined;
    minOrderAmount?: number | undefined;
    maxDiscount?: number | undefined;
    usageLimit?: number | undefined;
    perUserLimit?: number | undefined;
    validFrom?: Date | undefined;
    validUntil?: Date | undefined;
}>;
export declare const updateCouponSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodEnum<["PERCENTAGE", "FIXED"]>>;
    value: z.ZodOptional<z.ZodNumber>;
    minOrderAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    maxDiscount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    usageLimit: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    perUserLimit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    validFrom: z.ZodOptional<z.ZodDefault<z.ZodDate>>;
    validUntil: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    value?: number | undefined;
    code?: string | undefined;
    type?: "PERCENTAGE" | "FIXED" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    minOrderAmount?: number | undefined;
    maxDiscount?: number | undefined;
    usageLimit?: number | undefined;
    perUserLimit?: number | undefined;
    validFrom?: Date | undefined;
    validUntil?: Date | undefined;
}, {
    value?: number | undefined;
    code?: string | undefined;
    type?: "PERCENTAGE" | "FIXED" | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    minOrderAmount?: number | undefined;
    maxDiscount?: number | undefined;
    usageLimit?: number | undefined;
    perUserLimit?: number | undefined;
    validFrom?: Date | undefined;
    validUntil?: Date | undefined;
}>;
export declare const validateCouponSchema: z.ZodObject<{
    code: z.ZodString;
    orderAmount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    code: string;
    orderAmount: number;
}, {
    code: string;
    orderAmount: number;
}>;
export declare class CouponService {
    create(orgId: string, data: z.infer<typeof createCouponSchema>): Promise<{
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
    }>;
    findByOrg(orgId: string, includeInactive?: boolean): Promise<{
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
    }[]>;
    findById(id: string, orgId: string): Promise<{
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
    }>;
    validate(orgId: string, code: string, orderAmount: number, userId?: string): Promise<{
        valid: boolean;
        coupon: {
            id: string;
            code: string;
            type: import(".prisma/client").$Enums.CouponType;
            value: Decimal;
            description: string | null;
        };
        discount: number;
        finalAmount: number;
    }>;
    update(id: string, orgId: string, data: z.infer<typeof updateCouponSchema>): Promise<{
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
    }>;
    delete(id: string, orgId: string): Promise<void>;
}
export declare class CouponController {
    private couponService;
    constructor(couponService?: CouponService);
    create: (req: Request, res: Response) => Promise<void>;
    list: (req: Request, res: Response) => Promise<void>;
    getById: (req: Request, res: Response) => Promise<void>;
    validate: (req: Request, res: Response) => Promise<void>;
    update: (req: Request, res: Response) => Promise<void>;
    delete: (req: Request, res: Response) => Promise<void>;
}
export declare function couponRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map