const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./database');
const Order = require('./src/models/Order');
const Product = require('./src/models/Product');
const User = require('./src/models/User');
const Inquiry = require('./src/models/Inquiry');

// Load environment variables
dotenv.config();

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Simple rate limiting middleware
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100; // requests per window

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = requestCounts.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
  
  record.count++;
  next();
};

// Apply rate limiting to API routes
app.use('/api', rateLimiter);

// Clean up rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Test database connection on startup
const initializeDatabase = async () => {
  await db.testConnection();
};

// Health check with caching
let healthCheckCache = { status: null, timestamp: 0 };
const HEALTH_CACHE_TTL = 30000; // 30 seconds

app.get('/api/health', async (req, res) => {
  try {
    // Use cached result if fresh
    if (Date.now() - healthCheckCache.timestamp < HEALTH_CACHE_TTL && healthCheckCache.status) {
      return res.json(healthCheckCache.status);
    }

    await db.query('SELECT 1');
    const response = {
      success: true,
      message: 'Server is running',
      database: 'Connected',
      timestamp: new Date().toISOString()
    };
    
    healthCheckCache = { status: response, timestamp: Date.now() };
    res.json(response);
  } catch (error) {
    const response = {
      success: true,
      message: 'Server is running',
      database: 'Disconnected',
      timestamp: new Date().toISOString()
    };
    res.json(response);
  }
});

// Auth routes with validation
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format'
      });
    }
    
    // Try database first
    try {
      const user = await User.findByEmail(email);
      if (user && await User.comparePassword(password, user.password)) {
        const token = User.generateToken(user);
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          }
        });
        return;
      }
    } catch (dbError) {
      // Silent fallback to default credentials
    }
    
    // Fallback authentication
    if (email === 'admin@nirvaan.lk' && password === 'admin123') {
      res.json({
        success: true,
        token: 'test-jwt-token',
        user: {
          id: 1,
          fullName: 'Admin User',
          email: 'admin@nirvaan.lk',
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Dashboard routes with optimized response
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await Order.getDashboardStats();
    
    // Format and ensure all values are numbers
    const formattedStats = {
      success: true,
      total: parseInt(stats.total) || 0,
      pending: parseInt(stats.pending) || 0,
      received: parseInt(stats.received) || 0,
      issued: parseInt(stats.issued) || 0,
      courier: parseInt(stats.courier) || 0,
      today: parseInt(stats.today) || 0,
      monthly: parseInt(stats.monthly) || 0,
      database_status: 'connected'
    };
    
    res.json(formattedStats);
  } catch (error) {
    res.json({
      success: true,
      total: 0,
      pending: 0,
      received: 0,
      issued: 0,
      courier: 0,
      today: 0,
      monthly: 0,
      database_status: 'disconnected'
    });
  }
});

// Orders routes with validation and optimization
app.get('/api/orders', async (req, res) => {
  try {
    const { status, search, startDate, endDate, limit } = req.query;
    const filters = {};
    
    if (status && status !== 'all') filters.status = status;
    if (search) filters.search = search.trim();
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = Math.min(parseInt(limit) || 100, 1000); // Max 1000
    
    const orders = await Order.getAll(filters);
    
    // Format orders efficiently
    const formattedOrders = orders.map(order => ({
      ...order,
      product: order.product_name || 'Herbal Cream',
      quantity: String(order.quantity)
    }));
    
    res.json({
      success: true,
      data: formattedOrders,
      count: formattedOrders.length,
      database_status: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      database_status: 'disconnected'
    });
  }
});

// Get single order by ID with validation
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Format response
    const formattedOrder = {
      ...order,
      product: order.product_name || 'Herbal Cream',
      quantity: String(order.quantity)
    };
    
    res.json({
      success: true,
      data: formattedOrder,
      database_status: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// Create new order with validation
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Basic validation
    if (!orderData.fullName || !orderData.address || !orderData.mobile) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const newOrder = await Order.create(orderData);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder,
      database_status: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
});

// Update order status with validation
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'received', 'issued', 'sended', 'in-transit', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }
    
    const updatedOrder = await Order.updateStatus(orderId, status);
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
      database_status: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Update entire order
app.put('/api/orders/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.update(req.params.id, req.body);
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order'
    });
  }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    await Order.delete(req.params.id);
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete order'
    });
  }
});

// Products routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.getAll();
    res.json({
      success: true,
      data: products,
      database_status: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      database_status: 'disconnected'
    });
  }
});

// Analytics routes
app.get('/api/analytics', async (req, res) => {
  try {
    const stats = await Order.getDashboardStats();
    const orders = await Order.getAll();
    
    const statusData = [
      { 
        name: "Pending", 
        value: parseInt(stats.pending) || 0, 
        color: "#f59e0b" 
      },
      { 
        name: "Received", 
        value: parseInt(stats.received) || 0, 
        color: "#3b82f6" 
      },
      { 
        name: "Issued", 
        value: parseInt(stats.issued) || 0, 
        color: "#10b981" 
      },
      { 
        name: "Sent to Courier", 
        value: parseInt(stats.courier) || 0, 
        color: "#8b5cf6" 
      }
    ];
    
    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        totalOrders: parseInt(stats.total) || 0,
        statusData,
        orders
      },
      database_status: 'connected'
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        totalRevenue: 0,
        totalOrders: 0,
        statusData: [],
        orders: []
      },
      database_status: 'disconnected'
    });
  }
});

// Courier routes
app.get('/api/courier/orders', async (req, res) => {
  try {
    const orders = await Order.getAll();
    const courierOrders = orders.filter(o => 
      o.status === 'sended' || 
      o.status === 'in-transit' || 
      o.status === 'delivered'
    );
    
    res.json({
      success: true,
      data: courierOrders,
      database_status: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courier orders',
      database_status: 'disconnected'
    });
  }
});

// Database status endpoint
app.get('/api/database/status', async (req, res) => {
  try {
    await db.query('SELECT 1');
    
    // Get table counts
    const orderCount = await db.query('SELECT COUNT(*) as count FROM orders');
    const productCount = await db.query('SELECT COUNT(*) as count FROM products');
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    
    res.json({
      success: true,
      database: {
        status: 'connected',
        host: process.env.DB_HOST,
        name: process.env.DB_NAME,
        tables: {
          orders: orderCount[0].count,
          products: productCount[0].count,
          users: userCount[0].count
        }
      }
    });
  } catch (error) {
    res.json({
      success: false,
      database: {
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

// Inquiry routes
app.get('/api/inquiries', async (req, res) => {
  try {
    const inquiries = await Inquiry.getAll();
    res.json({
      success: true,
      data: inquiries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries'
    });
  }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    const inquiry = await Inquiry.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: inquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit inquiry'
    });
  }
});

app.put('/api/inquiries/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const inquiry = await Inquiry.updateStatus(req.params.id, status);
    res.json({
      success: true,
      message: 'Inquiry status updated',
      data: inquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update inquiry'
    });
  }
});

app.delete('/api/inquiries/:id', async (req, res) => {
  try {
    await Inquiry.delete(req.params.id);
    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete inquiry'
    });
  }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3030;

const server = initializeDatabase().then(() => {
  const httpServer = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Server running on port', PORT);
    console.log('='.repeat(60));
    console.log('🌐 Health check:', `http://localhost:${PORT}/api/health`);
    console.log('🗄️  Database status:', `http://localhost:${PORT}/api/database/status`);
    console.log('🔑 Test login:', `POST http://localhost:${PORT}/api/auth/login`);
    console.log('   Email: admin@nirvaan.lk');
    console.log('   Password: admin123');
    console.log('='.repeat(60) + '\n');
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    httpServer.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return httpServer;
});
