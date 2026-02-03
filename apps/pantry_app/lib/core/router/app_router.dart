import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/scanner/scanner_screen.dart';
import '../../features/menu/menu_screen.dart';
import '../../features/cart/cart_screen.dart';
import '../../features/checkout/checkout_screen.dart';
import '../../features/orders/orders_screen.dart';
import '../../features/orders/order_detail_screen.dart';
import '../../features/pantry/pantry_dashboard_screen.dart';
import '../../features/admin/admin_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      // Scanner (Home)
      GoRoute(
        path: '/',
        name: 'scanner',
        builder: (context, state) => const ScannerScreen(),
      ),
      
      // Menu (after scanning QR)
      GoRoute(
        path: '/menu/:sessionId',
        name: 'menu',
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId']!;
          return MenuScreen(sessionId: sessionId);
        },
      ),
      
      // Cart
      GoRoute(
        path: '/cart',
        name: 'cart',
        builder: (context, state) => const CartScreen(),
      ),
      
      // Checkout
      GoRoute(
        path: '/checkout',
        name: 'checkout',
        builder: (context, state) => const CheckoutScreen(),
      ),
      
      // Orders list
      GoRoute(
        path: '/orders',
        name: 'orders',
        builder: (context, state) => const OrdersScreen(),
      ),
      
      // Order detail
      GoRoute(
        path: '/orders/:orderId',
        name: 'order-detail',
        builder: (context, state) {
          final orderId = state.pathParameters['orderId']!;
          return OrderDetailScreen(orderId: orderId);
        },
      ),
      
      // Pantry staff dashboard
      GoRoute(
        path: '/pantry',
        name: 'pantry',
        builder: (context, state) => const PantryDashboardScreen(),
      ),
      
      // Admin
      GoRoute(
        path: '/admin',
        name: 'admin',
        builder: (context, state) => const AdminScreen(),
      ),
    ],
  );
});
