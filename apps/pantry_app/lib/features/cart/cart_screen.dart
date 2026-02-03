import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../shared/widgets/glass_card.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final _couponController = TextEditingController();
  bool _couponApplied = false;
  double _discount = 0;

  // Mock cart items
  final List<Map<String, dynamic>> _cartItems = [
    {'id': '1', 'name': 'Cappuccino', 'icon': '☕', 'price': 80.0, 'quantity': 1},
    {'id': '2', 'name': 'Cookies', 'icon': '🍪', 'price': 40.0, 'quantity': 2},
  ];

  double get _subtotal {
    return _cartItems.fold(0, (sum, item) => sum + (item['price'] * item['quantity']));
  }

  double get _total => _subtotal - _discount;

  void _applyCoupon() {
    if (_couponController.text.toUpperCase() == 'WELCOME10') {
      setState(() {
        _couponApplied = true;
        _discount = _subtotal * 0.1;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Coupon applied! 10% discount')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid coupon code')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Your Cart'),
      ),
      body: _cartItems.isEmpty
          ? _buildEmptyCart()
          : Column(
              children: [
                // Cart items
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _cartItems.length,
                    itemBuilder: (context, index) {
                      final item = _cartItems[index];
                      return _buildCartItem(item, index);
                    },
                  ),
                ),

                // Coupon & Summary
                GlassCard(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Coupon input
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _couponController,
                              decoration: InputDecoration(
                                hintText: 'Enter coupon code',
                                prefixIcon: const Icon(Icons.local_offer_outlined, color: AppColors.textSecondary),
                                filled: true,
                                fillColor: AppColors.inputBackground,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                              ),
                              textCapitalization: TextCapitalization.characters,
                            ),
                          ),
                          const SizedBox(width: 12),
                          OutlinedButton(
                            onPressed: _couponApplied ? null : _applyCoupon,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                            ),
                            child: Text(_couponApplied ? 'Applied' : 'Apply'),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),
                      const Divider(color: AppColors.chipBackground),
                      const SizedBox(height: 16),

                      // Summary
                      _buildSummaryRow('Subtotal', '₹${_subtotal.toStringAsFixed(0)}'),
                      if (_couponApplied) ...[
                        const SizedBox(height: 8),
                        _buildSummaryRow('Discount', '-₹${_discount.toStringAsFixed(0)}', 
                          valueColor: AppColors.success),
                      ],
                      const SizedBox(height: 12),
                      _buildSummaryRow(
                        'Total',
                        '₹${_total.toStringAsFixed(0)}',
                        isBold: true,
                        labelStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        valueStyle: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),

                      const SizedBox(height: 20),

                      // Checkout button
                      SizedBox(
                        width: double.infinity,
                        child: GradientButton(
                          text: 'Proceed to Checkout',
                          onPressed: () => context.push('/checkout'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildEmptyCart() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('🛒', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 24),
          const Text(
            'Your cart is empty',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add some items to get started',
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          OutlinedButton(
            onPressed: () => context.pop(),
            child: const Text('Browse Menu'),
          ),
        ],
      ),
    );
  }

  Widget _buildCartItem(Map<String, dynamic> item, int index) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Icon
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(item['icon'], style: const TextStyle(fontSize: 30)),
            ),
          ),
          const SizedBox(width: 16),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['name'],
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${item['price'].toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),

          // Quantity
          QuantitySelector(
            quantity: item['quantity'],
            onChanged: (value) {
              setState(() {
                if (value == 0) {
                  _cartItems.removeAt(index);
                } else {
                  _cartItems[index]['quantity'] = value;
                }
              });
            },
            min: 0,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    String value, {
    bool isBold = false,
    Color? valueColor,
    TextStyle? labelStyle,
    TextStyle? valueStyle,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: labelStyle ?? TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: valueStyle ?? TextStyle(
            fontSize: isBold ? 18 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
