import { z } from 'zod';
import { Response, Request } from 'express';
export declare const createSessionSchema: z.ZodObject<{
    qrCode: z.ZodString;
    guestName: z.ZodOptional<z.ZodString>;
    chairNumber: z.ZodOptional<z.ZodNumber>;
    durationMinutes: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    qrCode: string;
    durationMinutes: number;
    chairNumber?: number | undefined;
    guestName?: string | undefined;
}, {
    qrCode: string;
    chairNumber?: number | undefined;
    guestName?: string | undefined;
    durationMinutes?: number | undefined;
}>;
export declare class SessionService {
    private readonly SESSION_PREFIX;
    create(data: z.infer<typeof createSessionSchema>, userId?: string): Promise<{
        space: {
            organization: {
                id: string;
                name: string;
                slug: string;
                requirePayment: boolean;
            };
        } & {
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
    } & {
        status: import(".prisma/client").$Enums.SessionStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        chairNumber: number | null;
        guestName: string | null;
        expiresAt: Date;
        spaceId: string;
    }>;
    findById(id: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
        space: {
            organization: {
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
            };
        } & {
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
    } & {
        status: import(".prisma/client").$Enums.SessionStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        chairNumber: number | null;
        guestName: string | null;
        expiresAt: Date;
        spaceId: string;
    }>;
    close(id: string, userId?: string): Promise<{
        status: import(".prisma/client").$Enums.SessionStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        chairNumber: number | null;
        guestName: string | null;
        expiresAt: Date;
        spaceId: string;
    }>;
    getMenu(sessionId: string): Promise<{
        session: {
            id: string;
            space: string;
            organization: string;
            requirePayment: boolean;
            expiresAt: Date;
        };
        categories: ({
            items: {
                options: import("@prisma/client/runtime/library").JsonValue | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                isActive: boolean;
                icon: string | null;
                categoryId: string;
                price: import("@prisma/client/runtime/library").Decimal;
                isFree: boolean;
                image: string | null;
                stock: number | null;
                lowStockThreshold: number;
                autoIcon: boolean;
                isAvailable: boolean;
            }[];
        } & {
            id: string;
            name: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isActive: boolean;
            icon: string | null;
            sortOrder: number;
        })[];
    }>;
}
export declare class SessionController {
    private sessionService;
    constructor(sessionService?: SessionService);
    create: (req: Request, res: Response) => Promise<void>;
    getById: (req: Request, res: Response) => Promise<void>;
    close: (req: Request, res: Response) => Promise<void>;
    getMenu: (req: Request, res: Response) => Promise<void>;
}
export declare function sessionRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map