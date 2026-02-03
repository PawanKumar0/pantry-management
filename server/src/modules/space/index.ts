// Space module - schemas, service, controller, routes

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../../config/index.js';
import { NotFoundError, ForbiddenError } from '../../common/errors.js';
import { validate, authenticate, requireRole } from '../../common/middleware/index.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/index.js';

// ============================================
// SCHEMAS
// ============================================

export const createSpaceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const updateSpaceSchema = createSpaceSchema.partial();

// ============================================
// SERVICE
// ============================================

export class SpaceService {
  async create(orgId: string, data: z.infer<typeof createSpaceSchema>) {
    const space = await prisma.space.create({
      data: {
        ...data,
        organizationId: orgId,
      },
    });

    // Generate QR code image
    const qrDataUrl = await QRCode.toDataURL(space.qrCode, {
      width: 300,
      margin: 2,
    });

    return prisma.space.update({
      where: { id: space.id },
      data: { qrImage: qrDataUrl },
    });
  }

  async findByOrg(orgId: string, includeInactive = false) {
    return prisma.space.findMany({
      where: {
        organizationId: orgId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, orgId?: string) {
    const space = await prisma.space.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!space || (orgId && space.organizationId !== orgId)) {
      throw new NotFoundError('Space not found');
    }

    return space;
  }

  async findByQrCode(qrCode: string) {
    const space = await prisma.space.findUnique({
      where: { qrCode },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, requirePayment: true },
        },
      },
    });

    if (!space || !space.isActive) {
      throw new NotFoundError('Space not found or inactive');
    }

    return space;
  }

  async update(id: string, orgId: string, data: z.infer<typeof updateSpaceSchema>) {
    const space = await this.findById(id, orgId);
    return prisma.space.update({
      where: { id: space.id },
      data,
    });
  }

  async delete(id: string, orgId: string) {
    const space = await this.findById(id, orgId);
    await prisma.space.delete({ where: { id: space.id } });
  }

  async regenerateQr(id: string, orgId: string) {
    const space = await this.findById(id, orgId);
    const newQrCode = crypto.randomUUID();
    const qrDataUrl = await QRCode.toDataURL(newQrCode, {
      width: 300,
      margin: 2,
    });

    return prisma.space.update({
      where: { id: space.id },
      data: { qrCode: newQrCode, qrImage: qrDataUrl },
    });
  }
}

// ============================================
// CONTROLLER
// ============================================

export class SpaceController {
  constructor(private spaceService = new SpaceService()) { }

  create = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const space = await this.spaceService.create(req.user.organizationId, req.body);
    sendCreated(res, space);
  };

  list = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const includeInactive = req.query.includeInactive === 'true';
    const spaces = await this.spaceService.findByOrg(req.user.organizationId, includeInactive);
    sendSuccess(res, spaces);
  };

  getById = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const space = await this.spaceService.findById(req.params.id, req.user.organizationId);
    sendSuccess(res, space);
  };

  getByQrCode = async (req: Request, res: Response) => {
    const space = await this.spaceService.findByQrCode(req.params.qrCode);
    sendSuccess(res, space);
  };

  update = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const space = await this.spaceService.update(req.params.id, req.user.organizationId, req.body);
    sendSuccess(res, space);
  };

  delete = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    await this.spaceService.delete(req.params.id, req.user.organizationId);
    sendNoContent(res);
  };

  regenerateQr = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const space = await this.spaceService.regenerateQr(req.params.id, req.user.organizationId);
    sendSuccess(res, space);
  };
}

// ============================================
// ROUTES
// ============================================

export function spaceRoutes() {
  const router = Router();
  const controller = new SpaceController();

  // Public - lookup by QR code
  router.get('/qr/:qrCode', controller.getByQrCode);

  // Authenticated
  router.get('/', authenticate, controller.list);
  router.get('/:id', authenticate, controller.getById);

  // Admin only
  router.post('/', authenticate, requireRole('ADMIN', 'PANTRY'), validate(createSpaceSchema), controller.create);
  router.patch('/:id', authenticate, requireRole('ADMIN'), validate(updateSpaceSchema), controller.update);
  router.delete('/:id', authenticate, requireRole('ADMIN'), controller.delete);
  router.post('/:id/regenerate-qr', authenticate, requireRole('ADMIN'), controller.regenerateQr);

  return router;
}
