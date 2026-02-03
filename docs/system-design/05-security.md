# Security Architecture

> Authentication, authorization, and protection against common vulnerabilities.

---

## Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [SSO Implementation](#sso-implementation)
3. [Role-Based Access Control](#role-based-access-control)
4. [OWASP Top 10 Protection](#owasp-top-10-protection)
5. [Secrets Management](#secrets-management)
6. [Audit Logging](#audit-logging)

---

## Authentication Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. User Login                                                             │
│      ├── Email/Password → JWT tokens                                        │
│      └── SSO (Azure AD / Google) → OAuth 2.0 → JWT tokens                  │
│                                                                              │
│   2. Token Structure                                                        │
│      ├── Access Token: 15 min, in memory                                   │
│      └── Refresh Token: 7 days, HttpOnly cookie                            │
│                                                                              │
│   3. Request Flow                                                           │
│      Request → Auth Middleware → Role Check → Handler                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### JWT Token Payload

```typescript
interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  organizationId: string;
  iat: number; // Issued at
  exp: number; // Expiration
}
```

---

## SSO Implementation

### Supported Providers

| Provider | Protocol  | Use Case         |
| -------- | --------- | ---------------- |
| Azure AD | OAuth 2.0 | Enterprise SSO   |
| Google   | OAuth 2.0 | Google Workspace |

### Azure AD Flow

```typescript
// server/src/modules/auth/providers/azure.ts
import { ConfidentialClientApplication } from "@azure/msal-node";

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: config.oauth.azure.clientId,
    authority: `https://login.microsoftonline.com/${config.oauth.azure.tenantId}`,
    clientSecret: config.oauth.azure.clientSecret,
  },
});

export async function getAzureAuthUrl(state: string): Promise<string> {
  return msalClient.getAuthCodeUrl({
    scopes: ["openid", "profile", "email", "User.Read"],
    redirectUri: config.oauth.azure.redirectUri,
    state,
  });
}

export async function handleAzureCallback(code: string) {
  const result = await msalClient.acquireTokenByCode({
    code,
    scopes: ["User.Read"],
    redirectUri: config.oauth.azure.redirectUri,
  });

  return {
    email: result.account?.username,
    name: result.account?.name,
    providerId: result.account?.localAccountId,
  };
}
```

### Google OAuth Flow

```typescript
// server/src/modules/auth/providers/google.ts
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(
  config.oauth.google.clientId,
  config.oauth.google.clientSecret,
  config.oauth.google.redirectUri,
);

export function getGoogleAuthUrl(state: string): string {
  return client.generateAuthUrl({
    scope: ["openid", "profile", "email"],
    state,
    access_type: "offline",
  });
}

export async function handleGoogleCallback(code: string) {
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: config.oauth.google.clientId,
  });

  const payload = ticket.getPayload()!;
  return {
    email: payload.email,
    name: payload.name,
    providerId: payload.sub,
  };
}
```

---

## Role-Based Access Control

### Role Hierarchy

```
SUPER_ADMIN
    └── ADMIN
        └── EMPLOYEE
            └── USER (customer)
```

### Permission Matrix

| Resource     | USER | EMPLOYEE | ADMIN | SUPER_ADMIN |
| ------------ | ---- | -------- | ----- | ----------- |
| View Menu    | ✓    | ✓        | ✓     | ✓           |
| Place Order  | ✓    | ✓        | ✓     | ✓           |
| View Orders  | Own  | All      | All   | All         |
| Manage Items | ✗    | ✓        | ✓     | ✓           |
| Manage Staff | ✗    | ✗        | ✓     | ✓           |
| Manage Orgs  | ✗    | ✗        | ✗     | ✓           |

### Middleware Implementation

```typescript
// server/src/common/middleware/auth.middleware.ts
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
};

// Usage
router.post(
  "/items",
  authenticate,
  requireRole("ADMIN", "EMPLOYEE"),
  createItem,
);
```

---

## OWASP Top 10 Protection

### 1. Injection Prevention

```typescript
// Always use parameterized queries (Prisma does this automatically)
const user = await prisma.user.findUnique({
  where: { email: userInput }, // Safe: parameterized
});

// Input validation with Zod
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
```

### 2. XSS Prevention

```typescript
// Helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);

// Sanitize user content before rendering
import DOMPurify from "isomorphic-dompurify";
const safeHtml = DOMPurify.sanitize(userInput);
```

### 3. CSRF Protection

```typescript
import csrf from "csurf";

// For cookie-based sessions
app.use(csrf({ cookie: true }));

// SPA approach: include token in response
app.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### 4. Rate Limiting

```typescript
import { RateLimiterRedis } from "rate-limiter-flexible";

const loginLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "login",
  points: 5, // 5 attempts
  duration: 300, // per 5 minutes
  blockDuration: 900, // 15 min block
});

app.post("/login", async (req, res) => {
  try {
    await loginLimiter.consume(req.ip);
    // Process login
  } catch {
    res.status(429).json({ error: "Too many login attempts" });
  }
});
```

---

## Secrets Management

### Environment Variables

```bash
# .env (never commit!)
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-256-bit-secret
AZURE_CLIENT_SECRET=azure-secret
GOOGLE_CLIENT_SECRET=google-secret
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pantry-secrets
type: Opaque
stringData:
  JWT_SECRET: ${JWT_SECRET}
  DATABASE_URL: ${DATABASE_URL}
```

### Secret Rotation

```typescript
// Support multiple JWT secrets during rotation
const JWT_SECRETS = [
  process.env.JWT_SECRET_CURRENT,
  process.env.JWT_SECRET_PREVIOUS,
].filter(Boolean);

function verifyToken(token: string) {
  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (e) {
      continue;
    }
  }
  throw new Error("Invalid token");
}
```

---

## Audit Logging

### What to Log

| Event             | Level | Data                      |
| ----------------- | ----- | ------------------------- |
| Login Success     | INFO  | userId, ip, userAgent     |
| Login Failure     | WARN  | email, ip, reason         |
| Permission Denied | WARN  | userId, resource, action  |
| Data Modification | INFO  | userId, table, changeType |
| Admin Action      | INFO  | adminId, action, target   |

### Implementation

```typescript
// server/src/common/utils/auditLog.ts
interface AuditEntry {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip: string;
}

export async function audit(entry: AuditEntry) {
  await prisma.auditLog.create({ data: entry });

  // Critical actions also go to external SIEM
  if (["LOGIN_FAILED", "PERMISSION_DENIED"].includes(entry.action)) {
    await sendToSIEM(entry);
  }
}
```

---

## Security Checklist

```
□ All endpoints require authentication
□ Role-based access enforced
□ Input validation on all user data
□ Parameterized queries only
□ Security headers configured (Helmet)
□ HTTPS enforced
□ Secrets in environment/vault
□ Rate limiting on auth endpoints
□ Audit logging for sensitive actions
□ Dependencies regularly updated
```

---

## Next Steps

- [Reliability Patterns](./06-reliability.md)
- [Monitoring & Observability](../monitoring/01-observability.md)
