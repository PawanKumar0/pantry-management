"use strict";
// Google OAuth Provider
// server/src/modules/auth/providers/google.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleAuthUrl = getGoogleAuthUrl;
exports.handleGoogleCallback = handleGoogleCallback;
exports.verifyGoogleToken = verifyGoogleToken;
exports.getGoogleUserInfo = getGoogleUserInfo;
const google_auth_library_1 = require("google-auth-library");
const env_1 = require("@/config/env");
// Create OAuth2 client
const createOAuth2Client = (redirectUri) => new google_auth_library_1.OAuth2Client(env_1.config.oauth.google.clientId, env_1.config.oauth.google.clientSecret, redirectUri);
/**
 * Generate Google OAuth URL
 */
function getGoogleAuthUrl(state, redirectUri) {
    const oauth2Client = createOAuth2Client(redirectUri);
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'openid',
            'email',
            'profile',
        ],
        state,
        prompt: 'select_account', // Always show account picker
    });
}
/**
 * Handle Google OAuth callback
 */
async function handleGoogleCallback(code, redirectUri) {
    const oauth2Client = createOAuth2Client(redirectUri);
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    if (!tokens.id_token) {
        throw new Error('No ID token returned from Google');
    }
    // Verify and decode ID token
    const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env_1.config.oauth.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) {
        throw new Error('Invalid ID token payload');
    }
    return extractProfileFromPayload(payload);
}
/**
 * Verify Google ID token (for API authentication)
 */
async function verifyGoogleToken(idToken) {
    try {
        const oauth2Client = createOAuth2Client('');
        const ticket = await oauth2Client.verifyIdToken({
            idToken,
            audience: env_1.config.oauth.google.clientId,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return null;
        }
        return extractProfileFromPayload(payload);
    }
    catch {
        return null;
    }
}
/**
 * Extract profile from Google token payload
 */
function extractProfileFromPayload(payload) {
    return {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email || '',
        name: payload.name || 'Unknown',
        avatar: payload.picture || null,
    };
}
/**
 * Get user info from access token
 */
async function getGoogleUserInfo(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            return null;
        }
        const userInfo = await response.json();
        return {
            provider: 'google',
            providerId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.picture || null,
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=google.js.map