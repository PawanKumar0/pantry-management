# Local Development Guide

> Set up your development environment for the Pantry Management System.

---

## Prerequisites

| Tool    | Version | Purpose              |
| ------- | ------- | -------------------- |
| Node.js | 20+     | API server           |
| Docker  | Latest  | Database, Redis      |
| FVM     | Latest  | Flutter version mgmt |
| Flutter | 3.22+   | Mobile app           |
| Git     | Latest  | Version control      |

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/pantry-management.git
cd pantry-management
```

### 2. Start Dependencies

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

### 3. Server Setup

```bash
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# DATABASE_URL=postgresql://pantry:pantry@localhost:5432/pantry
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-dev-secret

# Run database migrations
npx prisma migrate dev

# Seed development data (optional)
npx prisma db seed

# Start development server
npm run dev
```

Server runs at: `http://localhost:3000`

### 4. Flutter App Setup

```bash
cd apps/pantry_app

# Use FVM to select Flutter version
fvm use 3.22.0

# Install dependencies
fvm flutter pub get

# Run app
fvm flutter run
```

---

## Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: pantry
      POSTGRES_PASSWORD: pantry
      POSTGRES_DB: pantry
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://pantry:pantry@postgres:5432/pantry
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## Environment Variables

```bash
# Server .env

# Database
DATABASE_URL=postgresql://pantry:pantry@localhost:5432/pantry

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
APP_URL=http://localhost:3000
PORT=3000
NODE_ENV=development

# SSO (optional for development)
# AZURE_CLIENT_ID=
# AZURE_CLIENT_SECRET=
# AZURE_TENANT_ID=
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

---

## Common Commands

### Server

```bash
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
npx prisma studio    # Database GUI
```

### Flutter

```bash
fvm flutter run              # Run app
fvm flutter test             # Run tests
fvm flutter build apk        # Build Android
fvm flutter build ios        # Build iOS
```

### Database

```bash
npx prisma migrate dev       # Run migrations
npx prisma generate          # Generate client
npx prisma db push           # Push schema (no migration)
npx prisma db seed           # Seed data
```

---

## Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs pantry-postgres
```

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Prisma Client Issues

```bash
# Regenerate client
npx prisma generate

# Reset database
npx prisma migrate reset
```

---

## Next Steps

- [Deployment Guide](./deployment.md)
- [Troubleshooting](./troubleshooting.md)
