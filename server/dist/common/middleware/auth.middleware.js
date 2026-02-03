"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../errors.js");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errors_js_1.UnauthorizedError('No token provided');
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
        const user = await index_js_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organizationId: true,
            },
        });
        if (!user) {
            throw new errors_js_1.UnauthorizedError('User not found');
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_js_1.UnauthorizedError('Invalid token'));
            return;
        }
        next(error);
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
        const user = await index_js_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organizationId: true,
            },
        });
        if (user) {
            req.user = user;
        }
        next();
    }
    catch {
        // Token invalid but optional, continue without user
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            next(new errors_js_1.UnauthorizedError('Authentication required'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new errors_js_1.UnauthorizedError('Insufficient permissions'));
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.middleware.js.map