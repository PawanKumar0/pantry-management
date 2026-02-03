"use strict";
// Auth module - schemas, service, controller, routes
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = exports.AuthService = exports.ssoCallbackSchema = exports.guestLoginSchema = exports.loginSchema = void 0;
exports.authRoutes = authRoutes;
const zod_1 = require("zod");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../../common/errors.js");
const index_js_2 = require("../../common/middleware/index.js");
const index_js_3 = require("../../common/utils/index.js");
// ============================================
// SCHEMAS
// ============================================
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    organizationSlug: zod_1.z.string().min(1),
});
exports.guestLoginSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    spaceQrCode: zod_1.z.string().uuid(),
});
exports.ssoCallbackSchema = zod_1.z.object({
    provider: zod_1.z.enum(['google', 'azure', 'okta']),
    code: zod_1.z.string(),
    state: zod_1.z.string().optional(),
});
// ============================================
// SERVICE
// ============================================
class AuthService {
    async loginWithEmail(email, orgSlug) {
        const org = await index_js_1.prisma.organization.findUnique({
            where: { slug: orgSlug },
        });
        if (!org) {
            throw new errors_js_1.NotFoundError('Organization not found');
        }
        let user = await index_js_1.prisma.user.findUnique({
            where: { email_organizationId: { email, organizationId: org.id } },
        });
        // Auto-create user if not exists (for demo purposes)
        if (!user) {
            user = await index_js_1.prisma.user.create({
                data: {
                    email,
                    organizationId: org.id,
                    role: 'EMPLOYEE',
                },
            });
        }
        return this.generateToken(user.id, org.id, user.role);
    }
    async guestLogin(name, qrCode) {
        const space = await index_js_1.prisma.space.findUnique({
            where: { qrCode },
            include: { organization: true },
        });
        if (!space || !space.isActive) {
            throw new errors_js_1.NotFoundError('Space not found or inactive');
        }
        // Create guest user
        const guestEmail = `guest-${Date.now()}@${space.organization.slug}.local`;
        const user = await index_js_1.prisma.user.create({
            data: {
                email: guestEmail,
                name,
                organizationId: space.organizationId,
                role: 'GUEST',
            },
        });
        return {
            token: this.generateToken(user.id, space.organizationId, 'GUEST'),
            space: {
                id: space.id,
                name: space.name,
                organization: space.organization.name,
            },
        };
    }
    async getProfile(userId) {
        const user = await index_js_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: {
                    select: { id: true, name: true, slug: true, logo: true },
                },
            },
        });
        if (!user) {
            throw new errors_js_1.NotFoundError('User not found');
        }
        return user;
    }
    generateToken(userId, organizationId, role) {
        return jsonwebtoken_1.default.sign({ userId, organizationId, role }, index_js_1.config.jwt.secret, { expiresIn: index_js_1.config.jwt.expiresIn });
    }
}
exports.AuthService = AuthService;
// ============================================
// CONTROLLER
// ============================================
class AuthController {
    authService;
    constructor(authService = new AuthService()) {
        this.authService = authService;
    }
    login = async (req, res) => {
        const { email, organizationSlug } = req.body;
        const token = await this.authService.loginWithEmail(email, organizationSlug);
        (0, index_js_3.sendSuccess)(res, { token });
    };
    guestLogin = async (req, res) => {
        const { name, spaceQrCode } = req.body;
        const result = await this.authService.guestLogin(name, spaceQrCode);
        (0, index_js_3.sendSuccess)(res, result);
    };
    getProfile = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.UnauthorizedError();
        const profile = await this.authService.getProfile(req.user.id);
        (0, index_js_3.sendSuccess)(res, profile);
    };
}
exports.AuthController = AuthController;
// ============================================
// ROUTES
// ============================================
function authRoutes() {
    const router = (0, express_1.Router)();
    const controller = new AuthController();
    router.post('/login', (0, index_js_2.validate)(exports.loginSchema), controller.login);
    router.post('/guest', (0, index_js_2.validate)(exports.guestLoginSchema), controller.guestLogin);
    router.get('/profile', index_js_2.authenticate, controller.getProfile);
    return router;
}
//# sourceMappingURL=index.js.map