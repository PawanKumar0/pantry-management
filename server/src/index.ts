// Main server entry point

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { config, prisma, redis } from './config/index.js';
import { errorHandler, notFoundHandler } from './common/middleware/index.js';

// Routes
import { authRoutes } from './modules/auth/index.js';
import { organizationRoutes } from './modules/organization/index.js';
import { spaceRoutes } from './modules/space/index.js';
import { inventoryRoutes } from './modules/inventory/index.js';
import { sessionRoutes } from './modules/session/index.js';
import { orderRoutes } from './modules/order/index.js';
import { paymentRoutes } from './modules/payment/index.js';
import { couponRoutes } from './modules/coupon/index.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*', // Configure for production
    methods: ['GET', 'POST'],
  },
});

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API ROUTES
// ============================================

const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes());
apiRouter.use('/organizations', organizationRoutes());
apiRouter.use('/spaces', spaceRoutes());
apiRouter.use('/inventory', inventoryRoutes());
apiRouter.use('/sessions', sessionRoutes());
apiRouter.use('/orders', orderRoutes());
apiRouter.use('/payments', paymentRoutes());
apiRouter.use('/coupons', couponRoutes());

app.use(config.app.apiPrefix, apiRouter);

// ============================================
// WEBSOCKET
// ============================================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join organization room for order updates
  socket.on('join:org', (orgId: string) => {
    socket.join(`org:${orgId}`);
    console.log(`Socket ${socket.id} joined org:${orgId}`);
  });

  // Leave organization room
  socket.on('leave:org', (orgId: string) => {
    socket.leave(`org:${orgId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Subscribe to Redis for order updates
const subscriber = redis.duplicate();
subscriber.subscribe('orders:*');
subscriber.on('message', (channel, message) => {
  const orgId = channel.split(':')[1];
  const data = JSON.parse(message);
  io.to(`org:${orgId}`).emit('order:update', data);
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start HTTP server
    httpServer.listen(config.app.port, () => {
      console.log(`🚀 Server running on port ${config.app.port}`);
      console.log(`📡 API available at http://localhost:${config.app.port}${config.app.apiPrefix}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();
