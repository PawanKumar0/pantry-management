// SSO Routes
// server/src/modules/auth/sso.routes.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { validate } from '@/common/middleware';
import { getAzureAuthUrl, handleAzureCallback, SSOProfile } from './providers/azure';
import { getGoogleAuthUrl, handleGoogleCallback } from './providers/google';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

const router = Router();

// Session state schema
const stateSchema = z.object({
  organizationSlug: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  nonce: z.string(),
});

type StatePayload = z.infer<typeof stateSchema>;

/**
 * Encode state for OAuth flow
 */
function encodeState(payload: StatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decode state from OAuth callback
 */
function decodeState(state: string): StatePayload {
  const decoded = Buffer.from(state, 'base64url').toString('utf-8');
  return stateSchema.parse(JSON.parse(decoded));
}

/**
 * Generate auth tokens
 */
function generateTokens(userId: string, organizationId: string, role: string) {
  const accessToken = jwt.sign(
    { userId, organizationId, role, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, organizationId, role, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { accessToken, refreshToken };
}

/**
 * @route GET /api/v1/auth/sso/:provider
 * @desc Initiate SSO flow
 */
router.get('/sso/:provider', async (req: Request, res: Response) => {
  const { provider } = req.params;
  const { organizationSlug, redirect } = req.query as Record<string, string>;

  if (!['azure', 'google'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid SSO provider' });
  }

  // Create state with organization context
  const state = encodeState({
    organizationSlug,
    redirectUrl: redirect || `${config.app.url}/auth/success`,
    nonce: crypto.randomUUID(),
  });

  const redirectUri = `${config.app.url}/api/v1/auth/callback/${provider}`;

  let authUrl: string;

  try {
    if (provider === 'azure') {
      authUrl = await getAzureAuthUrl(state, redirectUri);
    } else {
      authUrl = getGoogleAuthUrl(state, redirectUri);
    }

    res.redirect(authUrl);
  } catch (error) {
    console.error('SSO initiation error:', error);
    res.redirect(`${config.app.url}/auth/error?message=sso_init_failed`);
  }
});

/**
 * @route GET /api/v1/auth/callback/:provider
 * @desc Handle SSO callback
 */
router.get('/callback/:provider', async (req: Request, res: Response) => {
  const { provider } = req.params;
  const { code, state, error, error_description } = req.query as Record<string, string>;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(`${config.app.url}/auth/error?message=${error}`);
  }

  if (!code || !state) {
    return res.redirect(`${config.app.url}/auth/error?message=missing_params`);
  }

  try {
    // Decode state
    const { organizationSlug, redirectUrl } = decodeState(state);
    const redirectUri = `${config.app.url}/api/v1/auth/callback/${provider}`;

    // Get profile from provider
    let profile: SSOProfile;

    if (provider === 'azure') {
      profile = await handleAzureCallback(code, redirectUri);
    } else if (provider === 'google') {
      profile = await handleGoogleCallback(code, redirectUri);
    } else {
      throw new Error('Invalid provider');
    }

    // Find organization (if specified)
    let organization = null;
    if (organizationSlug) {
      organization = await prisma.organization.findUnique({
        where: { slug: organizationSlug },
      });

      if (!organization) {
        return res.redirect(`${config.app.url}/auth/error?message=org_not_found`);
      }
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: profile.email },
          { provider: profile.provider, providerId: profile.providerId },
        ],
        ...(organization && { organizationId: organization.id }),
      },
    });

    if (user) {
      // Update SSO info if needed
      await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: profile.provider,
          providerId: profile.providerId,
          avatar: profile.avatar || user.avatar,
          name: profile.name || user.name,
        },
      });
    } else if (organization) {
      // Create new user for this organization
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
          provider: profile.provider,
          providerId: profile.providerId,
          organizationId: organization.id,
          role: 'EMPLOYEE',
        },
      });
    } else {
      // No organization and no existing user
      return res.redirect(`${config.app.url}/auth/error?message=no_org`);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.organizationId,
      user.role
    );

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Redirect with access token
    const successUrl = new URL(redirectUrl || `${config.app.url}/auth/success`);
    successUrl.searchParams.set('token', accessToken);

    res.redirect(successUrl.toString());
  } catch (error) {
    console.error('SSO callback error:', error);
    res.redirect(`${config.app.url}/auth/error?message=callback_failed`);
  }
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token using refresh token cookie
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
      userId: string;
      organizationId: string;
      role: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        type: 'access'
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ accessToken });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout and clear refresh token
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });

  res.json({ message: 'Logged out successfully' });
});

export default router;
