"use strict";
// Space module - schemas, service, controller, routes
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceController = exports.SpaceService = exports.updateSpaceSchema = exports.createSpaceSchema = void 0;
exports.spaceRoutes = spaceRoutes;
const zod_1 = require("zod");
const express_1 = require("express");
const qrcode_1 = __importDefault(require("qrcode"));
const index_js_1 = require("../../config/index.js");
const errors_js_1 = require("../../common/errors.js");
const index_js_2 = require("../../common/middleware/index.js");
const index_js_3 = require("../../common/utils/index.js");
// ============================================
// SCHEMAS
// ============================================
exports.createSpaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    description: zod_1.z.string().max(500).optional(),
    location: zod_1.z.string().max(200).optional(),
    capacity: zod_1.z.number().int().positive().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateSpaceSchema = exports.createSpaceSchema.partial();
// ============================================
// SERVICE
// ============================================
class SpaceService {
    async create(orgId, data) {
        const space = await index_js_1.prisma.space.create({
            data: {
                ...data,
                organizationId: orgId,
            },
        });
        // Generate QR code image
        const qrDataUrl = await qrcode_1.default.toDataURL(space.qrCode, {
            width: 300,
            margin: 2,
        });
        return index_js_1.prisma.space.update({
            where: { id: space.id },
            data: { qrImage: qrDataUrl },
        });
    }
    async findByOrg(orgId, includeInactive = false) {
        return index_js_1.prisma.space.findMany({
            where: {
                organizationId: orgId,
                ...(includeInactive ? {} : { isActive: true }),
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id, orgId) {
        const space = await index_js_1.prisma.space.findUnique({
            where: { id },
            include: {
                organization: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });
        if (!space || (orgId && space.organizationId !== orgId)) {
            throw new errors_js_1.NotFoundError('Space not found');
        }
        return space;
    }
    async findByQrCode(qrCode) {
        const space = await index_js_1.prisma.space.findUnique({
            where: { qrCode },
            include: {
                organization: {
                    select: { id: true, name: true, slug: true, requirePayment: true },
                },
            },
        });
        if (!space || !space.isActive) {
            throw new errors_js_1.NotFoundError('Space not found or inactive');
        }
        return space;
    }
    async update(id, orgId, data) {
        const space = await this.findById(id, orgId);
        return index_js_1.prisma.space.update({
            where: { id: space.id },
            data,
        });
    }
    async delete(id, orgId) {
        const space = await this.findById(id, orgId);
        await index_js_1.prisma.space.delete({ where: { id: space.id } });
    }
    async regenerateQr(id, orgId) {
        const space = await this.findById(id, orgId);
        const newQrCode = crypto.randomUUID();
        const qrDataUrl = await qrcode_1.default.toDataURL(newQrCode, {
            width: 300,
            margin: 2,
        });
        return index_js_1.prisma.space.update({
            where: { id: space.id },
            data: { qrCode: newQrCode, qrImage: qrDataUrl },
        });
    }
}
exports.SpaceService = SpaceService;
// ============================================
// CONTROLLER
// ============================================
class SpaceController {
    spaceService;
    constructor(spaceService = new SpaceService()) {
        this.spaceService = spaceService;
    }
    create = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const space = await this.spaceService.create(req.user.organizationId, req.body);
        (0, index_js_3.sendCreated)(res, space);
    };
    list = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const includeInactive = req.query.includeInactive === 'true';
        const spaces = await this.spaceService.findByOrg(req.user.organizationId, includeInactive);
        (0, index_js_3.sendSuccess)(res, spaces);
    };
    getById = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const space = await this.spaceService.findById(req.params.id, req.user.organizationId);
        (0, index_js_3.sendSuccess)(res, space);
    };
    getByQrCode = async (req, res) => {
        const space = await this.spaceService.findByQrCode(req.params.qrCode);
        (0, index_js_3.sendSuccess)(res, space);
    };
    update = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const space = await this.spaceService.update(req.params.id, req.user.organizationId, req.body);
        (0, index_js_3.sendSuccess)(res, space);
    };
    delete = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        await this.spaceService.delete(req.params.id, req.user.organizationId);
        (0, index_js_3.sendNoContent)(res);
    };
    regenerateQr = async (req, res) => {
        if (!req.user)
            throw new errors_js_1.ForbiddenError();
        const space = await this.spaceService.regenerateQr(req.params.id, req.user.organizationId);
        (0, index_js_3.sendSuccess)(res, space);
    };
}
exports.SpaceController = SpaceController;
// ============================================
// ROUTES
// ============================================
function spaceRoutes() {
    const router = (0, express_1.Router)();
    const controller = new SpaceController();
    // Public - lookup by QR code
    router.get('/qr/:qrCode', controller.getByQrCode);
    // Authenticated
    router.get('/', index_js_2.authenticate, controller.list);
    router.get('/:id', index_js_2.authenticate, controller.getById);
    // Admin only
    router.post('/', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN', 'PANTRY'), (0, index_js_2.validate)(exports.createSpaceSchema), controller.create);
    router.patch('/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), (0, index_js_2.validate)(exports.updateSpaceSchema), controller.update);
    router.delete('/:id', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), controller.delete);
    router.post('/:id/regenerate-qr', index_js_2.authenticate, (0, index_js_2.requireRole)('ADMIN'), controller.regenerateQr);
    return router;
}
//# sourceMappingURL=index.js.map