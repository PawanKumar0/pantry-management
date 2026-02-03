import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    userId: string;
    organizationId: string;
    role: string;
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map