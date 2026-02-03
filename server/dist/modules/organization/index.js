"use strict";
// Organization module - schemas, service, controller, routes
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationController = exports.OrganizationService = exports.updateOrgSchema = exports.createOrgSchema = void 0;
exports.organizationRoutes = organizationRoutes;
const zod_1 = require("zod");
const express_1 = require("express");
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../../common/errors.js");
const index_js_2 = require("../../common/middleware/index.js");
const index_js_3 = require("../../common/utils/index.js");
// ============================================
// SCHEMAS
// ============================================
exports.createOrgSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
    logo: zod_1.z.string().url().optional(),
    requirePayment: zod_1.z.boolean().default(false),
    paymentProvider: zod_1.z.enum(['razorpay', 'stripe', 'custom']).optional(),
});
exports.updateOrgSchema = exports.createOrgSchema.partial();
// ============================================
// SERVICE
// ============================================
class OrganizationService {
    async create(data) {
        const existing = await index_js_1.prisma.organization.findUnique({
            where: { slug: data.slug },
        });
        if (existing) {
            throw new errors_js_1.ConflictError('Organization slug already exists');
        }
        return index_js_1.prisma.organization.create({ data });
    }
    async findById(id) {
        const org = await index_js_1.prisma.organization.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { spaces: true, users: true, categories: true },
                },
            },
        });
        if (!org) {
            throw new errors_js_1.NotFoundError('Organization not found');
        }
        return org;
    }
    async findBySlug(slug) {
        const org = await index_js_1.prisma.organization.findUnique({
            where: { slug },
        });
        if (!org) {
            throw new errors_js_1.NotFoundError('Organization not found');
        }
        return org;
    }
    async update(id, data) {
        if (data.slug) {
            const existing = await index_js_1.prisma.organization.findFirst({
                where: { slug: data.slug, NOT: { id } },
            });
            if (existing) {
                throw new errors_js_1.ConflictError('Slug already in use');
            }
        }
        return index_js_1.prisma.organization.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        await index_js_1.prisma.organization.delete({ where: { id } });
    }
    async getStats(id) {
        const [spaces, users, orders, revenue] = await Promise.all([
            index_js_1.prisma.space.count({ where: { organizationId: id } }),
            index_js_1.prisma.user.count({ where: { organizationId: id } }),
            index_js_1.prisma.order.count({ where: { organizationId: id } }),
            index_js_1.prisma.order.aggregate({
                where: { organizationId: id, status: 'DELIVERED' },
                _sum: { total: true },
            }),
        ]);
        return {
            spaces,
            users,
            orders,
            revenue: revenue._sum.total ?? 0,
        };
    }
}
exports.OrganizationService = OrganizationService;
// ============================================
// CONTROLLER
// ============================================
class OrganizationController {
    orgService;
    constructor(orgService = new OrganizationService()) {
        this.orgService = orgService;
    }
    create = async (req, res) => {
        const org = await this.orgService.create(req.body);
        (0, index_js_3.sendCreated)(res, org);
    };
    getById = async (req, res) => {
        const org = await this.orgService.findById(req.params.id);
        (0, index_js_3.sendSuccess)(res, org);
    };
    getBySlug = async (req, res) => {
        const org = await this.orgService.findBySlug(req.params.slug);
        (0, index_js_3.sendSuccess)(res, org);
    };
    getCurrent = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const org = await this.orgService.findById(req.user.organizationId);
        (0, index_js_3.sendSuccess)(res, org);
    };
    update = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const org = await this.orgService.update(req.user.organizationId, req.body);
        (0, index_js_3.sendSuccess)(res, org);
    };
    getStats = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const stats = await this.orgService.getStats(req.user.organizationId);
        (0, index_js_3.sendSuccess)(res, stats);
    };
}
exports.OrganizationController = OrganizationController;
// ============================================
// ROUTES
// ============================================
function organizationRoutes() {
    const router = (0, express_1.Router)();
    const controller = new OrganizationController();
    // Public
    router.get('/slug/:slug', controller.getBySlug);
    // Authenticated
    router.get('/current', index_js_2.authenticate, controller.getCurrent);
    router.get('/current/stats', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), controller.getStats);
    router.patch('/current', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), (0, index_js_2.validate)(exports.updateOrgSchema), controller.update);
    // Super admin only
    router.post('/', index_js_2.authenticate, (0, index_js_2.requireRole)('SUPER_ADMIN'), (0, index_js_2.validate)(exports.createOrgSchema), controller.create);
    router.get('/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('SUPER_ADMIN'), controller.getById);
    return router;
}
//# sourceMappingURL=index.js.map