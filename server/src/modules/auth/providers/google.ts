// Google OAuth Provider
// server/src/modules/auth/providers/google.ts

import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { config } from '@/config/env';

// Create OAuth2 client
const createOAuth2Client = (redirectUri: string) => new OAuth2Client(
  config.oauth.google.clientId,
  config.oauth.google.clientSecret,
  redirectUri
);

export interface SSOProfile {
  provider: 'azure' | 'google';
  providerId: string;
  email: string;
  name: string;
  avatar: string | null;
}

/**
 * Generate Google OAuth URL
 */
export function getGoogleAuthUrl(state: string, redirectUri: string): string {
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
export async function handleGoogleCallback(
  code: string,
  redirectUri: string
): Promise<SSOProfile> {
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
    audience: config.oauth.google.clientId,
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
export async function verifyGoogleToken(idToken: string): Promise<SSOProfile | null> {
  try {
    const oauth2Client = createOAuth2Client('');

    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: config.oauth.google.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return null;
    }

    return extractProfileFromPayload(payload);
  } catch {
    return null;
  }
}

/**
 * Extract profile from Google token payload
 */
function extractProfileFromPayload(payload: TokenPayload): SSOProfile {
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
export async function getGoogleUserInfo(accessToken: string): Promise<SSOProfile | null> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const userInfo = await response.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
      [key: string]: any;
    };

    return {
      provider: 'google',
      providerId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture || null,
    };
  } catch {
    return null;
  }
}
