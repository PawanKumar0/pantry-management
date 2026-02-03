// Organization module - schemas, service, controller, routes

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import { prisma } from '../../config/index.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../common/errors.js';
import { validate, authenticate, requireRole } from '../../common/middleware/index.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/index.js';

// ============================================
// SCHEMAS
// ============================================

export const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional(),
  requirePayment: z.boolean().default(false),
  paymentProvider: z.enum(['razorpay', 'stripe', 'custom']).optional(),
});

export const updateOrgSchema = createOrgSchema.partial();

// ============================================
// SERVICE
// ============================================

export class OrganizationService {
  async create(data: z.infer<typeof createOrgSchema>) {
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictError('Organization slug already exists');
    }

    return prisma.organization.create({ data });
  }

  async findById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { spaces: true, users: true, categories: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return org;
  }

  async findBySlug(slug: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return org;
  }

  async update(id: string, data: z.infer<typeof updateOrgSchema>) {
    if (data.slug) {
      const existing = await prisma.organization.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictError('Slug already in use');
      }
    }

    return prisma.organization.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await prisma.organization.delete({ where: { id } });
  }

  async getStats(id: string) {
    const [spaces, users, orders, revenue] = await Promise.all([
      prisma.space.count({ where: { organizationId: id } }),
      prisma.user.count({ where: { organizationId: id } }),
      prisma.order.count({ where: { organizationId: id } }),
      prisma.order.aggregate({
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

// ============================================
// CONTROLLER
// ============================================

export class OrganizationController {
  constructor(private orgService = new OrganizationService()) { }

  create = async (req: Request, res: Response) => {
    const org = await this.orgService.create(req.body);
    sendCreated(res, org);
  };

  getById = async (req: Request, res: Response) => {
    const org = await this.orgService.findById(req.params.id);
    sendSuccess(res, org);
  };

  getBySlug = async (req: Request, res: Response) => {
    const org = await this.orgService.findBySlug(req.params.slug);
    sendSuccess(res, org);
  };

  getCurrent = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const org = await this.orgService.findById(req.user.organizationId);
    sendSuccess(res, org);
  };

  update = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const org = await this.orgService.update(req.user.organizationId, req.body);
    sendSuccess(res, org);
  };

  getStats = async (req: Request, res: Response) => {
    if (!req.user) throw new ForbiddenError();
    const stats = await this.orgService.getStats(req.user.organizationId);
    sendSuccess(res, stats);
  };
}

// ============================================
// ROUTES
// ============================================

export function organizationRoutes() {
  const router = Router();
  const controller = new OrganizationController();

  // Public
  router.get('/slug/:slug', controller.getBySlug);

  // Authenticated
  router.get('/current', authenticate, controller.getCurrent);
  router.get('/current/stats', authenticate, requireRole('ADMIN'), controller.getStats);
  router.patch('/current', authenticate, requireRole('ADMIN'), validate(updateOrgSchema), controller.update);

  // Super admin only
  router.post('/', authenticate, requireRole('SUPER_ADMIN'), validate(createOrgSchema), controller.create);
  router.get('/:id', authenticate, requireRole('SUPER_ADMIN'), controller.getById);

  return router;
}
