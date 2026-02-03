// Session module for QR-based ordering sessions

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import { prisma, redis } from '../../config/index.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors.js';
import { validate, authenticate, optionalAuth } from '../../common/middleware/index.js';
import { sendSuccess, sendCreated } from '../../common/utils/index.js';

// ============================================
// SCHEMAS
// ============================================

export const createSessionSchema = z.object({
  qrCode: z.string().uuid(),
  guestName: z.string().optional(),
  chairNumber: z.number().int().positive().optional(),
  durationMinutes: z.number().int().min(15).max(480).default(60), // 15 min to 8 hours
});

// ============================================
// SERVICE
// ============================================

export class SessionService {
  private readonly SESSION_PREFIX = 'session:';

  async create(data: z.infer<typeof createSessionSchema>, userId?: string) {
    const space = await prisma.space.findUnique({
      where: { qrCode: data.qrCode },
      include: { organization: true },
    });

    if (!space || !space.isActive) {
      throw new NotFoundError('Space not found or inactive');
    }

    const expiresAt = new Date(Date.now() + data.durationMinutes * 60 * 1000);

    const session = await prisma.session.create({
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
    await redis.setex(
      `${this.SESSION_PREFIX}${session.id}`,
      data.durationMinutes * 60,
      JSON.stringify({
        id: session.id,
        spaceId: space.id,
        organizationId: space.organizationId,
        userId,
      })
    );

    return session;
  }

  async findById(id: string) {
    // Try cache first
    const cached = await redis.get(`${this.SESSION_PREFIX}${id}`);
    if (cached) {
      const data = JSON.parse(cached);
      // Still verify in DB for full data
      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          space: {
            include: { organization: true },
          },
          user: { select: { id: true, email: true, name: true } },
        },
      });
      if (session) return session;
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        space: {
          include: { organization: true },
        },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // Check if expired
    if (session.expiresAt < new Date() || session.status !== 'ACTIVE') {
      throw new BadRequestError('Session has expired');
    }

    return session;
  }

  async close(id: string, userId?: string) {
    const session = await prisma.session.findUnique({ where: { id } });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (userId && session.userId !== userId) {
      throw new ForbiddenError('Cannot close session owned by another user');
    }

    await redis.del(`${this.SESSION_PREFIX}${id}`);

    return prisma.session.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  async getMenu(sessionId: string) {
    const session = await this.findById(sessionId);

    const categories = await prisma.category.findMany({
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

// ============================================
// CONTROLLER
// ============================================

export class SessionController {
  constructor(private sessionService = new SessionService()) { }

  create = async (req: Request, res: Response) => {
    const session = await this.sessionService.create(req.body, req.user?.id);
    sendCreated(res, session);
  };

  getById = async (req: Request, res: Response) => {
    const session = await this.sessionService.findById(req.params.id);
    sendSuccess(res, session);
  };

  close = async (req: Request, res: Response) => {
    const session = await this.sessionService.close(req.params.id, req.user?.id);
    sendSuccess(res, session);
  };

  getMenu = async (req: Request, res: Response) => {
    const menu = await this.sessionService.getMenu(req.params.id);
    sendSuccess(res, menu);
  };
}

// ============================================
// ROUTES
// ============================================

export function sessionRoutes() {
  const router = Router();
  const controller = new SessionController();

  router.post('/', optionalAuth, validate(createSessionSchema), controller.create);
  router.get('/:id', optionalAuth, controller.getById);
  router.get('/:id/menu', controller.getMenu);
  router.post('/:id/close', optionalAuth, controller.close);

  return router;
}
