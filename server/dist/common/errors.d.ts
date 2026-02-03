export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly code?: string;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class BadRequestError extends AppError {
    constructor(message?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    readonly errors?: Record<string, string[]>;
    constructor(message?: string, errors?: Record<string, string[]>);
}
//# sourceMappingURL=errors.d.ts.map