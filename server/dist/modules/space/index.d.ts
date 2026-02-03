import { z } from 'zod';
import { Response, Request } from 'express';
export declare const createSpaceSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    capacity: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    description?: string | undefined;
    location?: string | undefined;
    capacity?: number | undefined;
}, {
    name: string;
    description?: string | undefined;
    location?: string | undefined;
    capacity?: number | undefined;
    isActive?: boolean | undefined;
}>;
export declare const updateSpaceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    location: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    capacity: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    capacity?: number | undefined;
    isActive?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    capacity?: number | undefined;
    isActive?: boolean | undefined;
}>;
export declare class SpaceService {
    create(orgId: string, data: z.infer<typeof createSpaceSchema>): Promise<{
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
    }>;
    findByOrg(orgId: string, includeInactive?: boolean): Promise<{
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
    }[]>;
    findById(id: string, orgId?: string): Promise<{
        organization: {
            id: string;
            name: string;
            slug: string;
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
    }>;
    findByQrCode(qrCode: string): Promise<{
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
    }>;
    update(id: string, orgId: string, data: z.infer<typeof updateSpaceSchema>): Promise<{
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
    }>;
    delete(id: string, orgId: string): Promise<void>;
    regenerateQr(id: string, orgId: string): Promise<{
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
    }>;
}
export declare class SpaceController {
    private spaceService;
    constructor(spaceService?: SpaceService);
    create: (req: Request, res: Response) => Promise<void>;
    list: (req: Request, res: Response) => Promise<void>;
    getById: (req: Request, res: Response) => Promise<void>;
    getByQrCode: (req: Request, res: Response) => Promise<void>;
    update: (req: Request, res: Response) => Promise<void>;
    delete: (req: Request, res: Response) => Promise<void>;
    regenerateQr: (req: Request, res: Response) => Promise<void>;
}
export declare function spaceRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map