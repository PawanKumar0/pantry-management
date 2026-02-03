# Pantry App

Flutter mobile application for Pantry Management System.

## Features

- 📷 QR code scanning for meeting room sessions
- 🍕 Menu browsing with categories
- 🛒 Cart management
- 💳 Checkout with payment integration
- 📦 Order tracking
- 👨‍🍳 Pantry staff dashboard (tablet)
- ⚙️ Admin management

## Tech Stack

- **Framework**: Flutter 3.x
- **State Management**: Riverpod
- **Navigation**: GoRouter
- **API Client**: Dio
- **Storage**: Hive / SharedPreferences
- **QR Scanning**: mobile_scanner

## Project Structure

```
pantry_app/
├── lib/
│   ├── core/
│   │   ├── theme/          # App theme, colors
│   │   ├── constants/      # API endpoints, keys
│   │   └── utils/          # Helpers
│   │
│   ├── data/
│   │   ├── models/         # Data models
│   │   ├── repositories/   # Data layer
│   │   └── providers/      # Riverpod providers
│   │
│   ├── features/
│   │   ├── scanner/        # QR scanning
│   │   ├── menu/           # Item browsing
│   │   ├── cart/           # Cart management
│   │   ├── checkout/       # Payment flow
│   │   ├── orders/         # Order tracking
│   │   ├── pantry/         # Staff dashboard
│   │   └── admin/          # Org management
│   │
│   ├── shared/
│   │   └── widgets/        # Reusable widgets
│   │
│   └── main.dart
│
├── assets/
│   ├── images/
│   └── fonts/
│
└── pubspec.yaml
```

## Quick Start

```bash
# Get dependencies
flutter pub get

# Run on device/emulator
flutter run

# Run tests
flutter test

# Build APK
flutter build apk
```

## Screens

| Screen   | Route         | Description          |
| -------- | ------------- | -------------------- |
| Scanner  | `/`           | QR code scanner      |
| Menu     | `/menu`       | Category + item grid |
| Item     | `/item/:id`   | Item details         |
| Cart     | `/cart`       | Cart summary         |
| Checkout | `/checkout`   | Payment              |
| Orders   | `/orders`     | Order history        |
| Tracking | `/orders/:id` | Order status         |
| Pantry   | `/pantry`     | Staff dashboard      |
| Admin    | `/admin`      | Management           |

## Design System

- **Theme**: Dark mode with glassmorphism
- **Colors**: Deep purple (#1a1a2e) + accent (#4cc9f0)
- **Typography**: Inter font family
- **Components**: Rounded cards, gradient buttons
