import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../shared/widgets/glass_card.dart';

class MenuScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const MenuScreen({super.key, required this.sessionId});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends ConsumerState<MenuScreen> {
  int _selectedCategoryIndex = 0;

  // Mock data - will be replaced with API
  final List<Map<String, dynamic>> _categories = [
    {'id': '1', 'name': 'Hot Beverages', 'icon': '☕'},
    {'id': '2', 'name': 'Cold Drinks', 'icon': '🧊'},
    {'id': '3', 'name': 'Snacks', 'icon': '🍪'},
    {'id': '4', 'name': 'Meals', 'icon': '🍱'},
  ];

  final List<Map<String, dynamic>> _items = [
    {'id': '1', 'name': 'Cappuccino', 'icon': '☕', 'price': 80.0, 'categoryId': '1'},
    {'id': '2', 'name': 'Latte', 'icon': '☕', 'price': 90.0, 'categoryId': '1'},
    {'id': '3', 'name': 'Espresso', 'icon': '☕', 'price': 60.0, 'categoryId': '1'},
    {'id': '4', 'name': 'Green Tea', 'icon': '🍵', 'price': 50.0, 'categoryId': '1'},
    {'id': '5', 'name': 'Iced Coffee', 'icon': '🧊', 'price': 100.0, 'categoryId': '2'},
    {'id': '6', 'name': 'Lemonade', 'icon': '🍋', 'price': 70.0, 'categoryId': '2'},
    {'id': '7', 'name': 'Cookies', 'icon': '🍪', 'price': 40.0, 'categoryId': '3'},
    {'id': '8', 'name': 'Sandwich', 'icon': '🥪', 'price': 120.0, 'categoryId': '4'},
  ];

  List<Map<String, dynamic>> get _filteredItems {
    final categoryId = _categories[_selectedCategoryIndex]['id'];
    return _items.where((item) => item['categoryId'] == categoryId).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                    ),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Board Room A',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Acme Corp',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Stack(
                    children: [
                      GestureDetector(
                        onTap: () => context.push('/cart'),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.shopping_cart_outlined, color: AppColors.textPrimary),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: const Text(
                            '2',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Category tabs
            SizedBox(
              height: 50,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final category = _categories[index];
                  final isSelected = index == _selectedCategoryIndex;
                  
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategoryIndex = index),
                    child: Container(
                      margin: const EdgeInsets.only(right: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        gradient: isSelected ? AppColors.primaryGradient : null,
                        color: isSelected ? null : AppColors.surface,
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: Row(
                        children: [
                          Text(category['icon'], style: const TextStyle(fontSize: 18)),
                          const SizedBox(width: 8),
                          Text(
                            category['name'],
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                              color: isSelected ? Colors.white : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 16),

            // Items grid
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.75,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                ),
                itemCount: _filteredItems.length,
                itemBuilder: (context, index) {
                  final item = _filteredItems[index];
                  return ItemCard(
                    name: item['name'],
                    icon: item['icon'],
                    price: item['price'],
                    onAdd: () {
                      // TODO: Add to cart
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Added ${item['name']} to cart'),
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    },
                    onTap: () {
                      // TODO: Show item details
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
      // Floating cart summary
      bottomNavigationBar: GlassCard(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '2 items',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    '₹170',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            GradientButton(
              text: 'View Cart',
              onPressed: () => context.push('/cart'),
              width: 140,
            ),
          ],
        ),
      ),
    );
  }
}
