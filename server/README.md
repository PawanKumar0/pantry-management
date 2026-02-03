# Server

Node.js backend API for Pantry Management System.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Auth**: Passport.js (OAuth2, SAML)
- **Validation**: Zod
- **Documentation**: OpenAPI/Swagger

## Project Structure

```
server/
├── prisma/
│   └── schema.prisma       # Database schema
│
├── src/
│   ├── config/             # Environment configs
│   ├── common/             # Shared utilities
│   │   ├── middleware/     # Auth, error handling
│   │   ├── utils/          # Helpers
│   │   └── types/          # TypeScript types
│   │
│   ├── modules/            # Feature modules
│   │   ├── auth/           # Authentication
│   │   ├── organization/   # Org management
│   │   ├── space/          # Spaces & QR codes
│   │   ├── inventory/      # Items & categories
│   │   ├── order/          # Order management
│   │   ├── payment/        # Payment providers
│   │   ├── coupon/         # Discount codes
│   │   └── notification/   # Push & WebSocket
│   │
│   ├── jobs/               # Background jobs
│   └── index.ts            # App entry
│
├── docs/
│   ├── openapi.yaml        # API documentation
│   └── postman.json        # Postman collection
│
└── tests/                  # Test suites
```

## Quick Start

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Run development server
npm run dev

# Run tests
npm test
```

## API Endpoints

| Method | Endpoint           | Description         |
| ------ | ------------------ | ------------------- |
| POST   | `/auth/login`      | User authentication |
| GET    | `/organizations`   | List organizations  |
| POST   | `/sessions`        | Create QR session   |
| GET    | `/items`           | List menu items     |
| POST   | `/orders`          | Place order         |
| POST   | `/payments/verify` | Verify payment      |
| POST   | `/coupons/apply`   | Apply coupon        |

## Environment Variables

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_SECRET=...
```
