"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const zod_1 = require("zod");
const errors_js_1 = require("../errors.js");
const index_js_1 = require("../../config/index.js");
const errorHandler = (err, _req, res, _next) => {
    // Handle Zod validation errors
    if (err instanceof zod_1.ZodError) {
        const formatted = err.flatten();
        res.status(422).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: formatted.fieldErrors,
            },
        });
        return;
    }
    // Handle custom app errors
    if (err instanceof errors_js_1.AppError) {
        const response = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
            },
        };
        if (err instanceof errors_js_1.ValidationError && err.errors) {
            response.error = { ...response.error, details: err.errors };
        }
        res.status(err.statusCode).json(response);
        return;
    }
    // Handle unknown errors
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: index_js_1.config.isProduction ? 'Internal server error' : err.message,
            ...(index_js_1.config.isDevelopment && { stack: err.stack }),
        },
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (_req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
        },
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error.middleware.js.map