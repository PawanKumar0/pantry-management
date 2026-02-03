import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary colors
  static const primary = Color(0xFF6366F1);       // Indigo
  static const primaryLight = Color(0xFF818CF8);
  static const primaryDark = Color(0xFF4F46E5);

  // Secondary colors  
  static const secondary = Color(0xFF22D3EE);     // Cyan
  static const secondaryLight = Color(0xFF67E8F9);
  static const secondaryDark = Color(0xFF06B6D4);

  // Accent colors
  static const accent = Color(0xFFF472B6);        // Pink
  static const success = Color(0xFF22C55E);       // Green
  static const warning = Color(0xFFFBBF24);       // Amber
  static const error = Color(0xFFEF4444);         // Red

  // Background colors
  static const background = Color(0xFF0F0F23);    // Deep navy
  static const surface = Color(0xFF1A1A2E);       // Dark navy
  static const cardBackground = Color(0xFF16213E);
  static const inputBackground = Color(0xFF1E2746);
  static const chipBackground = Color(0xFF2D3A5C);

  // Text colors
  static const textPrimary = Color(0xFFF8FAFC);
  static const textSecondary = Color(0xFF94A3B8);
  static const textTertiary = Color(0xFF64748B);

  // Gradient presets
  static const primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const accentGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const cardGradient = LinearGradient(
    colors: [
      Color(0xFF1A1A2E),
      Color(0xFF16213E),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Status colors
  static Color statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return warning;
      case 'accepted':
        return primaryLight;
      case 'preparing':
        return secondary;
      case 'ready':
        return success;
      case 'delivered':
        return success;
      case 'cancelled':
        return error;
      default:
        return textSecondary;
    }
  }
}
