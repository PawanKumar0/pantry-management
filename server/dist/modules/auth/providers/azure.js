"use strict";
// Azure AD SSO Provider
// server/src/modules/auth/providers/azure.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAzureAuthUrl = getAzureAuthUrl;
exports.handleAzureCallback = handleAzureCallback;
exports.verifyAzureToken = verifyAzureToken;
const msal_node_1 = require("@azure/msal-node");
const env_1 = require("@/config/env");
// MSAL Configuration
const msalConfig = {
    auth: {
        clientId: env_1.config.oauth.azure.clientId || '',
        authority: `https://login.microsoftonline.com/${env_1.config.oauth.azure.tenantId}`,
        clientSecret: env_1.config.oauth.azure.clientSecret || '',
    },
};
// Create MSAL instance
const msalClient = new msal_node_1.ConfidentialClientApplication(msalConfig);
// Scopes for Microsoft Graph
const SCOPES = ['openid', 'profile', 'email', 'User.Read'];
/**
 * Generate Azure AD OAuth URL
 */
async function getAzureAuthUrl(state, redirectUri) {
    const authUrl = await msalClient.getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri,
        state,
        prompt: 'select_account', // Always show account picker
    });
    return authUrl;
}
/**
 * Handle Azure AD OAuth callback
 */
async function handleAzureCallback(code, redirectUri) {
    // Exchange code for tokens
    const tokenResponse = await msalClient.acquireTokenByCode({
        code,
        scopes: SCOPES,
        redirectUri,
    });
    if (!tokenResponse.account) {
        throw new Error('No account returned from Azure AD');
    }
    // Extract user info from token claims
    const claims = tokenResponse.idTokenClaims;
    // Get profile photo (optional - requires additional Graph API call)
    let avatar = null;
    try {
        const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
            headers: {
                Authorization: `Bearer ${tokenResponse.accessToken}`,
            },
        });
        if (graphResponse.ok) {
            const photoBlob = await graphResponse.blob();
            const photoBase64 = Buffer.from(await photoBlob.arrayBuffer()).toString('base64');
            avatar = `data:image/jpeg;base64,${photoBase64}`;
        }
    }
    catch {
        // Photo not available, continue without it
    }
    return {
        provider: 'azure',
        providerId: claims.oid || tokenResponse.account.homeAccountId,
        email: claims.email || claims.preferred_username || '',
        name: claims.name || tokenResponse.account.name || 'Unknown',
        avatar,
    };
}
/**
 * Verify Azure AD token (for API authentication)
 */
async function verifyAzureToken(accessToken) {
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            return null;
        }
        const profile = await response.json();
        return {
            provider: 'azure',
            providerId: profile.id,
            email: profile.mail || profile.userPrincipalName,
            name: profile.displayName,
            avatar: null,
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=azure.js.map