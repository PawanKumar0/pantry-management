import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
type ValidateTarget = 'body' | 'query' | 'params';
export declare const validate: <T>(schema: ZodSchema<T>, target?: ValidateTarget) => RequestHandler;
export {};
//# sourceMappingURL=validate.middleware.d.ts.map