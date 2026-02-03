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
export declare function getGoogleAuthUrl(state: string, redirectUri: string): string;
/**
 * Handle Google OAuth callback
 */
export declare function handleGoogleCallback(code: string, redirectUri: string): Promise<SSOProfile>;
/**
 * Verify Google ID token (for API authentication)
 */
export declare function verifyGoogleToken(idToken: string): Promise<SSOProfile | null>;
/**
 * Get user info from access token
 */
export declare function getGoogleUserInfo(accessToken: string): Promise<SSOProfile | null>;
//# sourceMappingURL=google.d.ts.map