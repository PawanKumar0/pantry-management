// Azure AD SSO Provider
// server/src/modules/auth/providers/azure.ts

import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { config } from '@/config/env';

// MSAL Configuration
const msalConfig: Configuration = {
  auth: {
    clientId: config.oauth.azure.clientId || '',
    authority: `https://login.microsoftonline.com/${config.oauth.azure.tenantId}`,
    clientSecret: config.oauth.azure.clientSecret || '',
  },
};

// Create MSAL instance
const msalClient = new ConfidentialClientApplication(msalConfig);

// Scopes for Microsoft Graph
const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

export interface SSOProfile {
  provider: 'azure' | 'google';
  providerId: string;
  email: string;
  name: string;
  avatar: string | null;
}

/**
 * Generate Azure AD OAuth URL
 */
export async function getAzureAuthUrl(state: string, redirectUri: string): Promise<string> {
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
export async function handleAzureCallback(
  code: string,
  redirectUri: string
): Promise<SSOProfile> {
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
  const claims = tokenResponse.idTokenClaims as {
    oid?: string;
    preferred_username?: string;
    email?: string;
    name?: string;
  };

  // Get profile photo (optional - requires additional Graph API call)
  let avatar: string | null = null;
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
  } catch {
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
export async function verifyAzureToken(accessToken: string): Promise<SSOProfile | null> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const profile = await response.json() as {
      id: string;
      mail: string;
      userPrincipalName: string;
      displayName: string;
      [key: string]: any;
    };

    return {
      provider: 'azure',
      providerId: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      avatar: null,
    };
  } catch {
    return null;
  }
}
