import { Response } from 'express';
interface SuccessResponse<T> {
    success: true;
    data: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        hasMore?: boolean;
    };
}
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number, meta?: SuccessResponse<T>['meta']): void;
export declare function sendCreated<T>(res: Response, data: T): void;
export declare function sendNoContent(res: Response): void;
export {};
//# sourceMappingURL=response.d.ts.map