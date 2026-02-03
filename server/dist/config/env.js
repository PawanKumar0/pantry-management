"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    // App
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(3000),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    APP_URL: zod_1.z.string().default('http://localhost:3000'),
    // Database
    DATABASE_URL: zod_1.z.string(),
    // Redis
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    // OAuth (optional)
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    AZURE_AD_TENANT_ID: zod_1.z.string().optional(),
    AZURE_AD_CLIENT_ID: zod_1.z.string().optional(),
    AZURE_AD_CLIENT_SECRET: zod_1.z.string().optional(),
    // Storage
    S3_ENDPOINT: zod_1.z.string().optional(),
    S3_ACCESS_KEY: zod_1.z.string().optional(),
    S3_SECRET_KEY: zod_1.z.string().optional(),
    S3_BUCKET: zod_1.z.string().default('pantry'),
    // Razorpay
    RAZORPAY_KEY_ID: zod_1.z.string().optional(),
    RAZORPAY_KEY_SECRET: zod_1.z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Stripe
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Auto-icon
    UNSPLASH_ACCESS_KEY: zod_1.z.string().optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
exports.config = {
    isProduction: exports.env.NODE_ENV === 'production',
    isDevelopment: exports.env.NODE_ENV === 'development',
    isTest: exports.env.NODE_ENV === 'test',
    app: {
        port: exports.env.PORT,
        apiPrefix: exports.env.API_PREFIX,
        url: exports.env.APP_URL,
    },
    jwt: {
        secret: exports.env.JWT_SECRET,
        expiresIn: exports.env.JWT_EXPIRES_IN,
    },
    oauth: {
        google: {
            clientId: exports.env.GOOGLE_CLIENT_ID,
            clientSecret: exports.env.GOOGLE_CLIENT_SECRET,
        },
        azure: {
            tenantId: exports.env.AZURE_AD_TENANT_ID,
            clientId: exports.env.AZURE_AD_CLIENT_ID,
            clientSecret: exports.env.AZURE_AD_CLIENT_SECRET,
        },
    },
    storage: {
        endpoint: exports.env.S3_ENDPOINT,
        accessKey: exports.env.S3_ACCESS_KEY,
        secretKey: exports.env.S3_SECRET_KEY,
        bucket: exports.env.S3_BUCKET,
    },
    payment: {
        razorpay: {
            keyId: exports.env.RAZORPAY_KEY_ID,
            keySecret: exports.env.RAZORPAY_KEY_SECRET,
            webhookSecret: exports.env.RAZORPAY_WEBHOOK_SECRET,
        },
        stripe: {
            secretKey: exports.env.STRIPE_SECRET_KEY,
            webhookSecret: exports.env.STRIPE_WEBHOOK_SECRET,
        },
    },
};
//# sourceMappingURL=env.js.map