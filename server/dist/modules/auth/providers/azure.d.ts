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
export declare function getAzureAuthUrl(state: string, redirectUri: string): Promise<string>;
/**
 * Handle Azure AD OAuth callback
 */
export declare function handleAzureCallback(code: string, redirectUri: string): Promise<SSOProfile>;
/**
 * Verify Azure AD token (for API authentication)
 */
export declare function verifyAzureToken(accessToken: string): Promise<SSOProfile | null>;
//# sourceMappingURL=azure.d.ts.map