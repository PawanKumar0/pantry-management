"use strict";
// Session module for QR-based ordering sessions
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionController = exports.SessionService = exports.createSessionSchema = void 0;
exports.sessionRoutes = sessionRoutes;
const zod_1 = require("zod");
const express_1 = require("express");
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../../common/errors.js");
const index_js_2 = require("../../common/middleware/index.js");
const index_js_3 = require("../../common/utils/index.js");
// ============================================
// SCHEMAS
// ============================================
exports.createSessionSchema = zod_1.z.object({
    qrCode: zod_1.z.string().uuid(),
    guestName: zod_1.z.string().optional(),
    chairNumber: zod_1.z.number().int().positive().optional(),
    durationMinutes: zod_1.z.number().int().min(15).max(480).default(60), // 15 min to 8 hours
});
// ============================================
// SERVICE
// ============================================
class SessionService {
    SESSION_PREFIX = 'session:';
    async create(data, userId) {
        const space = await index_js_1.prisma.space.findUnique({
            where: { qrCode: data.qrCode },
            include: { organization: true },
        });
        if (!space || !space.isActive) {
            throw new errors_js_1.NotFoundError('Space not found or inactive');
        }
        const expiresAt = new Date(Date.now() + data.durationMinutes * 60 * 1000);
        const session = await index_js_1.prisma.session.create({
            data: {
                spaceId: space.id,
                userId,
                guestName: data.guestName,
                chairNumber: data.chairNumber,
                expiresAt,
            },
            include: {
                space: {
                    include: {
                        organization: {
                            select: { id: true, name: true, slug: true, requirePayment: true },
                        },
                    },
                },
            },
        });
        // Cache session for fast lookup
        await index_js_1.redis.setex(`${this.SESSION_PREFIX}${session.id}`, data.durationMinutes * 60, JSON.stringify({
            id: session.id,
            spaceId: space.id,
            organizationId: space.organizationId,
            userId,
        }));
        return session;
    }
    async findById(id) {
        // Try cache first
        const cached = await index_js_1.redis.get(`${this.SESSION_PREFIX}${id}`);
        if (cached) {
            const data = JSON.parse(cached);
            // Still verify in DB for full data
            const session = await index_js_1.prisma.session.findUnique({
                where: { id },
                include: {
                    space: {
                        include: { organization: true },
                    },
                    user: { select: { id: true, email: true, name: true } },
                },
            });
            if (session)
                return session;
        }
        const session = await index_js_1.prisma.session.findUnique({
            where: { id },
            include: {
                space: {
                    include: { organization: true },
                },
                user: { select: { id: true, email: true, name: true } },
            },
        });
        if (!session) {
            throw new errors_js_1.NotFoundError('Session not found');
        }
        // Check if expired
        if (session.expiresAt < new Date() || session.status !== 'ACTIVE') {
            throw new errors_js_1.BadRequestError('Session has expired');
        }
        return session;
    }
    async close(id, userId) {
        const session = await index_js_1.prisma.session.findUnique({ where: { id } });
        if (!session) {
            throw new errors_js_1.NotFoundError('Session not found');
        }
        if (userId && session.userId !== userId) {
            throw new errors_js_1.ForbiddenError('Cannot close session owned by another user');
        }
        await index_js_1.redis.del(`${this.SESSION_PREFIX}${id}`);
        return index_js_1.prisma.session.update({
            where: { id },
            data: { status: 'CLOSED' },
        });
    }
    async getMenu(sessionId) {
        const session = await this.findById(sessionId);
        const categories = await index_js_1.prisma.category.findMany({
            where: {
                organizationId: session.space.organizationId,
                isActive: true,
            },
            include: {
                items: {
                    where: { isActive: true, isAvailable: true },
                    orderBy: { name: 'asc' },
                },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        return {
            session: {
                id: session.id,
                space: session.space.name,
                organization: session.space.organization.name,
                requirePayment: session.space.organization.requirePayment,
                expiresAt: session.expiresAt,
            },
            categories,
        };
    }
}
exports.SessionService = SessionService;
// ============================================
// CONTROLLER
// ============================================
class SessionController {
    sessionService;
    constructor(sessionService = new SessionService()) {
        this.sessionService = sessionService;
    }
    create = async (req, res) => {
        const session = await this.sessionService.create(req.body, req.user?.id);
        (0, index_js_3.sendCreated)(res, session);
    };
    getById = async (req, res) => {
        const session = await this.sessionService.findById(req.params.id);
        (0, index_js_3.sendSuccess)(res, session);
    };
    close = async (req, res) => {
        const session = await this.sessionService.close(req.params.id, req.user?.id);
        (0, index_js_3.sendSuccess)(res, session);
    };
    getMenu = async (req, res) => {
        const menu = await this.sessionService.getMenu(req.params.id);
        (0, index_js_3.sendSuccess)(res, menu);
    };
}
exports.SessionController = SessionController;
// ============================================
// ROUTES
// ============================================
function sessionRoutes() {
    const router = (0, express_1.Router)();
    const controller = new SessionController();
    router.post('/', index_js_2.optionalAuth, (0, index_js_2.validate)(exports.createSessionSchema), controller.create);
    router.get('/:id', index_js_2.optionalAuth, controller.getById);
    router.get('/:id/menu', controller.getMenu);
    router.post('/:id/close', index_js_2.optionalAuth, controller.close);
    return router;
}
//# sourceMappingURL=index.js.map