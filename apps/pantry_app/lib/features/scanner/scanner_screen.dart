import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../shared/widgets/glass_card.dart';

class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );

  bool _isScanning = true;
  String? _lastScanned;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!_isScanning) return;

    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    final value = barcode!.rawValue!;
    
    // Prevent duplicate scans
    if (value == _lastScanned) return;
    _lastScanned = value;

    setState(() => _isScanning = false);

    // Navigate to menu with session
    _createSession(value);
  }

  Future<void> _createSession(String qrCode) async {
    // TODO: Create session via API
    // For now, navigate directly
    if (mounted) {
      context.push('/menu/$qrCode');
      // Reset after navigation
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _isScanning = true);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Camera view
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // Overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.background.withOpacity(0.7),
                  Colors.transparent,
                  Colors.transparent,
                  AppColors.background.withOpacity(0.7),
                ],
                stops: const [0.0, 0.3, 0.7, 1.0],
              ),
            ),
          ),

          // Content
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  const Text(
                    'Scan QR Code',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Point your camera at the QR code\nin your meeting room',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white.withOpacity(0.7),
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const Spacer(),

                  // Scanner frame
                  Center(
                    child: Container(
                      width: 280,
                      height: 280,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: AppColors.primary,
                          width: 3,
                        ),
                      ),
                      child: Stack(
                        children: [
                          // Corner decorations
                          ..._buildCornerDecorations(),
                          
                          // Scanning indicator
                          if (_isScanning)
                            const Center(
                              child: SizedBox(
                                width: 200,
                                child: LinearProgressIndicator(
                                  backgroundColor: Colors.transparent,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(),

                  // Bottom actions
                  GlassCard(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildActionButton(
                                icon: Icons.flash_on,
                                label: 'Flash',
                                onTap: () => _controller.toggleTorch(),
                              ),
                              _buildActionButton(
                                icon: Icons.flip_camera_ios,
                                label: 'Flip',
                                onTap: () => _controller.switchCamera(),
                              ),
                              _buildActionButton(
                                icon: Icons.history,
                                label: 'Orders',
                                onTap: () => context.push('/orders'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCornerDecorations() {
    return [
      // Top-left
      Positioned(
        top: -1,
        left: -1,
        child: _cornerDecoration(true, true),
      ),
      // Top-right
      Positioned(
        top: -1,
        right: -1,
        child: _cornerDecoration(true, false),
      ),
      // Bottom-left
      Positioned(
        bottom: -1,
        left: -1,
        child: _cornerDecoration(false, true),
      ),
      // Bottom-right
      Positioned(
        bottom: -1,
        right: -1,
        child: _cornerDecoration(false, false),
      ),
    ];
  }

  Widget _cornerDecoration(bool isTop, bool isLeft) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        border: Border(
          top: isTop ? const BorderSide(color: AppColors.secondary, width: 4) : BorderSide.none,
          bottom: !isTop ? const BorderSide(color: AppColors.secondary, width: 4) : BorderSide.none,
          left: isLeft ? const BorderSide(color: AppColors.secondary, width: 4) : BorderSide.none,
          right: !isLeft ? const BorderSide(color: AppColors.secondary, width: 4) : BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColors.primary),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
