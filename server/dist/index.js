"use strict";
// Main server entry point
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const index_js_1 = require("./config/index.js");
const index_js_2 = require("./common/middleware/index.js");
// Routes
const index_js_3 = require("./modules/auth/index.js");
const index_js_4 = require("./modules/organization/index.js");
const index_js_5 = require("./modules/space/index.js");
const index_js_6 = require("./modules/inventory/index.js");
const index_js_7 = require("./modules/session/index.js");
const index_js_8 = require("./modules/order/index.js");
const index_js_9 = require("./modules/payment/index.js");
const index_js_10 = require("./modules/coupon/index.js");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*', // Configure for production
        methods: ['GET', 'POST'],
    },
});
// ============================================
// MIDDLEWARE
// ============================================
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ============================================
// API ROUTES
// ============================================
const apiRouter = express_1.default.Router();
apiRouter.use('/auth', (0, index_js_3.authRoutes)());
apiRouter.use('/organizations', (0, index_js_4.organizationRoutes)());
apiRouter.use('/spaces', (0, index_js_5.spaceRoutes)());
apiRouter.use('/inventory', (0, index_js_6.inventoryRoutes)());
apiRouter.use('/sessions', (0, index_js_7.sessionRoutes)());
apiRouter.use('/orders', (0, index_js_8.orderRoutes)());
apiRouter.use('/payments', (0, index_js_9.paymentRoutes)());
apiRouter.use('/coupons', (0, index_js_10.couponRoutes)());
app.use(index_js_1.config.app.apiPrefix, apiRouter);
// ============================================
// WEBSOCKET
// ============================================
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    // Join organization room for order updates
    socket.on('join:org', (orgId) => {
        socket.join(`org:${orgId}`);
        console.log(`Socket ${socket.id} joined org:${orgId}`);
    });
    // Leave organization room
    socket.on('leave:org', (orgId) => {
        socket.leave(`org:${orgId}`);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
// Subscribe to Redis for order updates
const subscriber = index_js_1.redis.duplicate();
subscriber.subscribe('orders:*');
subscriber.on('message', (channel, message) => {
    const orgId = channel.split(':')[1];
    const data = JSON.parse(message);
    io.to(`org:${orgId}`).emit('order:update', data);
});
// ============================================
// ERROR HANDLING
// ============================================
app.use(index_js_2.notFoundHandler);
app.use(index_js_2.errorHandler);
// ============================================
// START SERVER
// ============================================
async function start() {
    try {
        // Test database connection
        await index_js_1.prisma.$connect();
        console.log('✅ Database connected');
        // Start HTTP server
        httpServer.listen(index_js_1.config.app.port, () => {
            console.log(`🚀 Server running on port ${index_js_1.config.app.port}`);
            console.log(`📡 API available at http://localhost:${index_js_1.config.app.port}${index_js_1.config.app.apiPrefix}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Handle shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await index_js_1.prisma.$disconnect();
    await index_js_1.redis.quit();
    process.exit(0);
});
start();
//# sourceMappingURL=index.js.map