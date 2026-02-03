"use strict";
// SSO Routes
// server/src/modules/auth/sso.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("@/config/database");
const azure_1 = require("./providers/azure");
const google_1 = require("./providers/google");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("@/config/env");
const router = (0, express_1.Router)();
// Session state schema
const stateSchema = zod_1.z.object({
    organizationSlug: zod_1.z.string().optional(),
    redirectUrl: zod_1.z.string().url().optional(),
    nonce: zod_1.z.string(),
});
/**
 * Encode state for OAuth flow
 */
function encodeState(payload) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
/**
 * Decode state from OAuth callback
 */
function decodeState(state) {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    return stateSchema.parse(JSON.parse(decoded));
}
/**
 * Generate auth tokens
 */
function generateTokens(userId, organizationId, role) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, organizationId, role, type: 'access' }, env_1.config.jwt.secret, { expiresIn: env_1.config.jwt.expiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, organizationId, role, type: 'refresh' }, env_1.config.jwt.secret, { expiresIn: env_1.config.jwt.expiresIn });
    return { accessToken, refreshToken };
}
/**
 * @route GET /api/v1/auth/sso/:provider
 * @desc Initiate SSO flow
 */
router.get('/sso/:provider', async (req, res) => {
    const { provider } = req.params;
    const { organizationSlug, redirect } = req.query;
    if (!['azure', 'google'].includes(provider)) {
        return res.status(400).json({ error: 'Invalid SSO provider' });
    }
    // Create state with organization context
    const state = encodeState({
        organizationSlug,
        redirectUrl: redirect || `${env_1.config.app.url}/auth/success`,
        nonce: crypto.randomUUID(),
    });
    const redirectUri = `${env_1.config.app.url}/api/v1/auth/callback/${provider}`;
    let authUrl;
    try {
        if (provider === 'azure') {
            authUrl = await (0, azure_1.getAzureAuthUrl)(state, redirectUri);
        }
        else {
            authUrl = (0, google_1.getGoogleAuthUrl)(state, redirectUri);
        }
        res.redirect(authUrl);
    }
    catch (error) {
        console.error('SSO initiation error:', error);
        res.redirect(`${env_1.config.app.url}/auth/error?message=sso_init_failed`);
    }
});
/**
 * @route GET /api/v1/auth/callback/:provider
 * @desc Handle SSO callback
 */
router.get('/callback/:provider', async (req, res) => {
    const { provider } = req.params;
    const { code, state, error, error_description } = req.query;
    // Handle OAuth errors
    if (error) {
        console.error('OAuth error:', error, error_description);
        return res.redirect(`${env_1.config.app.url}/auth/error?message=${error}`);
    }
    if (!code || !state) {
        return res.redirect(`${env_1.config.app.url}/auth/error?message=missing_params`);
    }
    try {
        // Decode state
        const { organizationSlug, redirectUrl } = decodeState(state);
        const redirectUri = `${env_1.config.app.url}/api/v1/auth/callback/${provider}`;
        // Get profile from provider
        let profile;
        if (provider === 'azure') {
            profile = await (0, azure_1.handleAzureCallback)(code, redirectUri);
        }
        else if (provider === 'google') {
            profile = await (0, google_1.handleGoogleCallback)(code, redirectUri);
        }
        else {
            throw new Error('Invalid provider');
        }
        // Find organization (if specified)
        let organization = null;
        if (organizationSlug) {
            organization = await database_1.prisma.organization.findUnique({
                where: { slug: organizationSlug },
            });
            if (!organization) {
                return res.redirect(`${env_1.config.app.url}/auth/error?message=org_not_found`);
            }
        }
        // Find or create user
        let user = await database_1.prisma.user.findFirst({
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
            await database_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    provider: profile.provider,
                    providerId: profile.providerId,
                    avatar: profile.avatar || user.avatar,
                    name: profile.name || user.name,
                },
            });
        }
        else if (organization) {
            // Create new user for this organization
            user = await database_1.prisma.user.create({
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
        }
        else {
            // No organization and no existing user
            return res.redirect(`${env_1.config.app.url}/auth/error?message=no_org`);
        }
        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id, user.organizationId, user.role);
        // Set refresh token as HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: env_1.config.isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });
        // Redirect with access token
        const successUrl = new URL(redirectUrl || `${env_1.config.app.url}/auth/success`);
        successUrl.searchParams.set('token', accessToken);
        res.redirect(successUrl.toString());
    }
    catch (error) {
        console.error('SSO callback error:', error);
        res.redirect(`${env_1.config.app.url}/auth/error?message=callback_failed`);
    }
});
/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token using refresh token cookie
 */
router.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.config.jwt.secret);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        // Verify user still exists
        const user = await database_1.prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Generate new access token
        const accessToken = jsonwebtoken_1.default.sign({
            userId: user.id,
            organizationId: user.organizationId,
            role: user.role,
            type: 'access'
        }, env_1.config.jwt.secret, { expiresIn: env_1.config.jwt.expiresIn });
        res.json({ accessToken });
    }
    catch (error) {
        res.clearCookie('refreshToken');
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});
/**
 * @route POST /api/v1/auth/logout
 * @desc Logout and clear refresh token
 */
router.post('/logout', (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env_1.config.isProduction,
        sameSite: 'lax',
        path: '/',
    });
    res.json({ message: 'Logged out successfully' });
});
exports.default = router;
//# sourceMappingURL=sso.routes.js.map