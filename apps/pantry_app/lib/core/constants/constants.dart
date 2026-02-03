class ApiConstants {
  ApiConstants._();

  // Base URL - change for production
  static const baseUrl = 'http://localhost:3000/api/v1';
  
  // WebSocket URL
  static const wsUrl = 'ws://localhost:3000';

  // Endpoints
  static const auth = '/auth';
  static const login = '$auth/login';
  static const guestLogin = '$auth/guest';
  static const profile = '$auth/profile';

  static const organizations = '/organizations';
  static const spaces = '/spaces';
  static const sessions = '/sessions';
  static const inventory = '/inventory';
  static const categories = '$inventory/categories';
  static const items = '$inventory/items';
  static const orders = '/orders';
  static const payments = '/payments';
  static const coupons = '/coupons';
  
  // Menu by session
  static String sessionMenu(String sessionId) => '$sessions/$sessionId/menu';
  
  // Order by session
  static String sessionOrders(String sessionId) => '$orders/session/$sessionId';

  // Order status
  static String orderStatus(String orderId) => '$orders/$orderId/status';

  // Payment
  static const paymentInitiate = '$payments/initiate';
  static const paymentVerify = '$payments/verify';

  // Coupon validate
  static const couponValidate = '$coupons/validate';
}

class AppConstants {
  AppConstants._();

  // Session
  static const sessionDurationMinutes = 60;
  
  // Cart
  static const maxQuantityPerItem = 10;
  
  // Cache keys
  static const tokenKey = 'auth_token';
  static const userKey = 'current_user';
  static const sessionKey = 'active_session';
  static const cartKey = 'cart_items';
}
