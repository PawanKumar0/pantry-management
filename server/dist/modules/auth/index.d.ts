import { z } from 'zod';
import { Response, Request } from 'express';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    organizationSlug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    organizationSlug: string;
}, {
    email: string;
    organizationSlug: string;
}>;
export declare const guestLoginSchema: z.ZodObject<{
    name: z.ZodString;
    spaceQrCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    spaceQrCode: string;
}, {
    name: string;
    spaceQrCode: string;
}>;
export declare const ssoCallbackSchema: z.ZodObject<{
    provider: z.ZodEnum<["google", "azure", "okta"]>;
    code: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    provider: "google" | "azure" | "okta";
    state?: string | undefined;
}, {
    code: string;
    provider: "google" | "azure" | "okta";
    state?: string | undefined;
}>;
export declare class AuthService {
    loginWithEmail(email: string, orgSlug: string): Promise<string>;
    guestLogin(name: string, qrCode: string): Promise<{
        token: string;
        space: {
            id: string;
            name: string;
            organization: string;
        };
    }>;
    getProfile(userId: string): Promise<{
        organization: {
            id: string;
            name: string;
            slug: string;
            logo: string | null;
        };
    } & {
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        provider: string | null;
        providerId: string | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private generateToken;
}
export declare class AuthController {
    private authService;
    constructor(authService?: AuthService);
    login: (req: Request, res: Response) => Promise<void>;
    guestLogin: (req: Request, res: Response) => Promise<void>;
    getProfile: (req: Request, res: Response) => Promise<void>;
}
export declare function authRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map