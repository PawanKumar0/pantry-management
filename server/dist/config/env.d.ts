import { StringValue } from 'ms';
export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    API_PREFIX: string;
    APP_URL: string;
    DATABASE_URL: string;
    REDIS_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    S3_BUCKET: string;
    GOOGLE_CLIENT_ID?: string | undefined;
    GOOGLE_CLIENT_SECRET?: string | undefined;
    AZURE_AD_TENANT_ID?: string | undefined;
    AZURE_AD_CLIENT_ID?: string | undefined;
    AZURE_AD_CLIENT_SECRET?: string | undefined;
    S3_ENDPOINT?: string | undefined;
    S3_ACCESS_KEY?: string | undefined;
    S3_SECRET_KEY?: string | undefined;
    RAZORPAY_KEY_ID?: string | undefined;
    RAZORPAY_KEY_SECRET?: string | undefined;
    RAZORPAY_WEBHOOK_SECRET?: string | undefined;
    STRIPE_SECRET_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    UNSPLASH_ACCESS_KEY?: string | undefined;
};
export declare const config: {
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    app: {
        port: number;
        apiPrefix: string;
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: StringValue;
    };
    oauth: {
        google: {
            clientId: string | undefined;
            clientSecret: string | undefined;
        };
        azure: {
            tenantId: string | undefined;
            clientId: string | undefined;
            clientSecret: string | undefined;
        };
    };
    storage: {
        endpoint: string | undefined;
        accessKey: string | undefined;
        secretKey: string | undefined;
        bucket: string;
    };
    payment: {
        razorpay: {
            keyId: string | undefined;
            keySecret: string | undefined;
            webhookSecret: string | undefined;
        };
        stripe: {
            secretKey: string | undefined;
            webhookSecret: string | undefined;
        };
    };
};
//# sourceMappingURL=env.d.ts.map