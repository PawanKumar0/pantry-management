# 🍪 Pantry Management System

A QR-based meeting room ordering & pantry management platform for corporate workspaces.

---

## ✨ Features

| Feature                     | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| **🔲 QR Ordering**          | Scan QR code in meeting rooms to instantly access menu    |
| **📦 Inventory Management** | Track stock with auto-icon fetching for items             |
| **🏢 Multi-tenant**         | Organizations manage their own spaces, menus, and users   |
| **💳 Flexible Payments**    | Free or chargeable items with pluggable payment providers |
| **🎟️ Coupons**              | Discount codes for promotions                             |
| **📱 Real-time Tracking**   | Live order status updates for users and staff             |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPS                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Flutter App    │  Flutter App    │  React Web (Phase 2)        │
│  (User/Guest)   │  (Pantry Staff) │  (Admin Dashboard)          │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         └─────────────────┼───────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Traefik   │
                    │   Gateway   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌──────▼──────┐
    │  REST   │      │ WebSocket │    │   Static    │
    │  API    │      │  Server   │    │   Assets    │
    └────┬────┘      └─────┬─────┘    └─────────────┘
         │                 │
    ┌────▼─────────────────▼────┐
    │      Node.js Server       │
    │    (Express + TypeScript) │
    └────┬─────────┬───────┬────┘
         │         │       │
    ┌────▼───┐ ┌───▼───┐ ┌─▼────────┐
    │Postgres│ │ Redis │ │ S3/MinIO │
    └────────┘ └───────┘ └──────────┘
```

---

## 📁 Project Structure

```
pantry-management/
├── apps/                    # Client applications
│   └── pantry_app/          # Flutter app (iOS, Android, Tablet)
│
├── server/                  # Backend API
│   ├── prisma/              # Database schema & migrations
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   ├── common/          # Shared utilities
│   │   └── config/          # Environment configs
│   └── docs/                # API documentation
│
├── devops/                  # Infrastructure
│   ├── docker/              # Docker configs
│   ├── k8s/                 # Kubernetes manifests
│   └── scripts/             # Deployment scripts
│
└── docs/                    # Documentation
    └── designs/             # UI mockups & diagrams
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Flutter 3.x
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)

### Local Development

```bash
# 1. Start infrastructure
cd devops/docker
docker-compose up -d

# 2. Start server
cd server
npm install
npm run dev

# 3. Run Flutter app
cd apps/pantry_app
flutter pub get
flutter run
```

---

## 🎨 UI Design

### Design Inspiration

- [Swyp Meeting Room Ordering](https://getswyp.com/)
- [Dribbble Inventory Management](https://dribbble.com/tags/inventory-management)
- [Balkan Brothers Dashboard Designs](https://dribbble.com/balkanbrothers)

### Key Screens

| Screen               | Description                         |
| -------------------- | ----------------------------------- |
| **QR Scanner**       | Camera viewfinder with overlay      |
| **Menu**             | Category tabs + item grid           |
| **Item Detail**      | Image, description, price, quantity |
| **Cart**             | Items, coupon input, total          |
| **Checkout**         | Payment options                     |
| **Order Tracking**   | Status timeline                     |
| **Pantry Dashboard** | Order queue for staff               |
| **Admin**            | Inventory & org management          |

### Design System

- **Theme**: Dark mode with glassmorphism
- **Colors**: Deep purple/blue gradients + vibrant accents
- **Typography**: Inter / Outfit (Google Fonts)
- **Components**: Rounded corners, subtle shadows, smooth animations

---

## 💳 Payment Integration

The system supports **pluggable payment providers**:

| Provider     | Status       | Notes        |
| ------------ | ------------ | ------------ |
| **Razorpay** | ✅ Primary   | India focus  |
| **Stripe**   | 🔄 Planned   | Global       |
| **Custom**   | ✅ Interface | BYO provider |

Organizations can configure:

- Free items (no payment required)
- Paid items with mandatory payment
- Mixed mode

---

## 📊 Tech Stack

| Layer        | Technology                   |
| ------------ | ---------------------------- |
| **Server**   | Node.js, TypeScript, Express |
| **Database** | PostgreSQL + Prisma ORM      |
| **Cache**    | Redis                        |
| **Mobile**   | Flutter 3.x                  |
| **Web**      | React + Vite (Phase 2)       |
| **Auth**     | OAuth2, SAML, SSO            |
| **Storage**  | S3 / MinIO                   |
| **DevOps**   | Docker, Kubernetes           |

---

## 🔧 DevOps

### Local Docker Cluster

```bash
cd devops/docker
docker-compose up -d
```

Services:

- API Server: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO: `http://localhost:9001`

### Cloud Deployment (Azure/AWS)

Kubernetes manifests provided for:

- Auto-scaling with HPA
- Ingress with TLS
- ConfigMaps for environment
- Secrets management

---

## 📖 Documentation

- [Implementation Plan](./docs/implementation_plan.md)
- [API Reference](./server/docs/openapi.yaml)
- [Flutter App Guide](./apps/pantry_app/README.md)
- [DevOps Guide](./devops/README.md)

---

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details.
