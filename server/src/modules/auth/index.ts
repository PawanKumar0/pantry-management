// Auth module - schemas, service, controller, routes

import { z } from 'zod';
import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, config } from '../../config/index.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../common/errors.js';
import { validate, authenticate } from '../../common/middleware/index.js';
import { sendSuccess } from '../../common/utils/index.js';
import type { StringValue } from "ms";

// ============================================
// SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z.string().email(),
  organizationSlug: z.string().min(1),
});

export const guestLoginSchema = z.object({
  name: z.string().min(1),
  spaceQrCode: z.string().uuid(),
});

export const ssoCallbackSchema = z.object({
  provider: z.enum(['google', 'azure', 'okta']),
  code: z.string(),
  state: z.string().optional(),
});

// ============================================
// SERVICE
// ============================================

export class AuthService {
  async loginWithEmail(email: string, orgSlug: string) {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    let user = await prisma.user.findUnique({
      where: { email_organizationId: { email, organizationId: org.id } },
    });

    // Auto-create user if not exists (for demo purposes)
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          organizationId: org.id,
          role: 'EMPLOYEE',
        },
      });
    }

    return this.generateToken(user.id, org.id, user.role);
  }

  async guestLogin(name: string, qrCode: string) {
    const space = await prisma.space.findUnique({
      where: { qrCode },
      include: { organization: true },
    });

    if (!space || !space.isActive) {
      throw new NotFoundError('Space not found or inactive');
    }

    // Create guest user
    const guestEmail = `guest-${Date.now()}@${space.organization.slug}.local`;
    const user = await prisma.user.create({
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

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  private generateToken(userId: string, organizationId: string, role: string): string {
    return jwt.sign(
      { userId, organizationId, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as StringValue }
    );
  }
}

// ============================================
// CONTROLLER
// ============================================

export class AuthController {
  constructor(private authService = new AuthService()) { }

  login = async (req: Request, res: Response) => {
    const { email, organizationSlug } = req.body;
    const token = await this.authService.loginWithEmail(email, organizationSlug);
    sendSuccess(res, { token });
  };

  guestLogin = async (req: Request, res: Response) => {
    const { name, spaceQrCode } = req.body;
    const result = await this.authService.guestLogin(name, spaceQrCode);
    sendSuccess(res, result);
  };

  getProfile = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const profile = await this.authService.getProfile(req.user.id);
    sendSuccess(res, profile);
  };
}

// ============================================
// ROUTES
// ============================================

export function authRoutes() {
  const router = Router();
  const controller = new AuthController();

  router.post('/login', validate(loginSchema), controller.login);
  router.post('/guest', validate(guestLoginSchema), controller.guestLogin);
  router.get('/profile', authenticate, controller.getProfile);

  return router;
}
