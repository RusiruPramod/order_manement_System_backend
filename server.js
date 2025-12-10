const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory data storage (replace with database later)
let orders = [
  {
    id: '1',
    order_id: 'ORD202401001',
    fullName: 'Kamal Perera',
    address: '123 Main Street, Colombo',
    mobile: '94701234567',
    product: 'Herbal Cream',
    product_id: 'PROD001',
    product_name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
    quantity: '2',
    status: 'received',
    total_amount: 20000.00,
    createdAt: '2024-01-01T10:00:00Z'
  },
  {
    id: '2',
    order_id: 'ORD202401002',
    fullName: 'Rusiru Pramod',
    address: '456 Galle Road, Colombo',
    mobile: '94701234568',
    product: 'Herbal Cream',
    product_id: 'PROD001',
    product_name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
    quantity: '3',
    status: 'received',
    total_amount: 30000.00,
    createdAt: '2024-01-02T10:00:00Z'
  },
  {
    id: '3',
    order_id: 'ORD202401003',
    fullName: 'Nimal Silva',
    address: '789 Kandy Road, Kandy',
    mobile: '94701234569',
    product: 'Herbal Cream',
    product_id: 'PROD001',
    product_name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
    quantity: '1',
    status: 'received',
    total_amount: 10000.00,
    createdAt: '2024-01-03T10:00:00Z'
  },
  {
    id: '4',
    order_id: 'ORD202401004',
    fullName: 'Anil Silva',
    address: '321 Temple Road, Matara',
    mobile: '94701234570',
    product: 'Herbal Cream',
    product_id: 'PROD001',
    product_name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
    quantity: '2',
    status: 'sended',
    total_amount: 20000.00,
    createdAt: '2024-01-04T10:00:00Z'
  }
];

let products = [
  {
    id: '1',
    product_id: 'PROD001',
    name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
    description: '100% Pure Coconut Oil, 5KG pack',
    price: 10000.00,
    status: 'available',
    category: 'Coconut Oil',
    image: '/images/oil.jpg'
  },
  {
    id: '2',
    product_id: 'PROD002',
    name: 'NIRVAAN 1KG (100% PURE COCONUT OIL)',
    description: '100% Pure Coconut Oil, 1KG pack',
    price: 2500.00,
    status: 'available',
    category: 'Coconut Oil',
    image: '/images/oil-small.jpg'
  }
];

// In-memory inquiries storage
let inquiries = [];

// Simple test routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes (simplified)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple authentication
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
});

// Dashboard routes
app.get('/api/dashboard/stats', (req, res) => {
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'received').length,
    received: orders.filter(o => o.status === 'received').length,
    issued: orders.filter(o => o.status === 'issued').length,
    courier: orders.filter(o => o.status === 'sended' || o.status === 'in-transit').length,
    today: orders.filter(o => {
      const orderDate = new Date(o.createdAt).toDateString();
      const today = new Date().toDateString();
      return orderDate === today;
    }).length,
    monthly: orders.filter(o => {
      const orderMonth = new Date(o.createdAt).getMonth();
      const currentMonth = new Date().getMonth();
      return orderMonth === currentMonth;
    }).length
  };
  
  res.json({
    success: true,
    ...stats
  });
});

// Orders routes
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    data: orders
  });
});

// Get single order by ID
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }
  
  res.json({
    success: true,
    data: order
  });
});

// Create new order (PUBLIC ENDPOINT - no auth required)
app.post('/api/orders', (req, res) => {
  const { fullName, address, mobile, product, quantity } = req.body;
  
  // Validate required fields
  if (!fullName || !address || !mobile || !product || !quantity) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }
  
  // Validate data types and formats
  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Valid full name is required (minimum 2 characters)'
    });
  }

  if (typeof mobile !== 'string' || !/^[0-9]{10,15}$/.test(mobile.replace(/[\s\-\+]/g, ''))) {
    return res.status(400).json({
      success: false,
      message: 'Valid mobile number is required (10-15 digits)'
    });
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty < 1 || qty > 100) {
    return res.status(400).json({
      success: false,
      message: 'Valid quantity is required (1-100)'
    });
  }
  
  // Generate order ID
  const orderNumber = String(orders.length + 1).padStart(3, '0');
  const order_id = `ORD2024${orderNumber}`;
  
  // Map product to product details
  const productMap = {
    'herbal-cream': {
      product_id: 'PROD001',
      product_name: 'ආත්තෝර ආලේපය',
      price: 10000
    }
  };
  
  const productDetails = productMap[product] || productMap['herbal-cream'];
  const total_amount = productDetails.price * qty;
  
  // Create new order
  const newOrder = {
    id: String(orders.length + 1),
    order_id: order_id,
    fullName: fullName.trim(),
    address: address.trim(),
    mobile: mobile.replace(/[\s\-]/g, ''),
    product: product,
    product_id: productDetails.product_id,
    product_name: productDetails.product_name,
    quantity: String(qty),
    status: 'received',
    total_amount: total_amount,
    createdAt: new Date().toISOString()
  };
  
  orders.push(newOrder);
  
  console.log('New order created:', newOrder);
  
  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: newOrder
  });
});

// Update order status
app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const orderId = parseInt(req.params.id);
  
  if (isNaN(orderId) || orderId < 1) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID'
    });
  }

  const orderIndex = orders.findIndex(o => o.id === String(orderId));
  
  if (orderIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }
  
  // Validate status
  const validStatuses = [ 'received',  'sended'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
    });
  }
  
  orders[orderIndex].status = status;
  
  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: orders[orderIndex]
  });
});

// Products routes
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: products
  });
});

// Analytics routes
app.get('/api/analytics', (req, res) => {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const statusData = [
    { 
      name: "Received", 
      value: orders.filter(o => o.status === 'received').length, 
      color: "#eab308" 
    }
  ];
  
  res.json({
    success: true,
    data: {
      totalRevenue,
      totalOrders: orders.length,
      statusData
    }
  });
});

// Courier routes
app.get('/api/courier/orders', (req, res) => {
  const courierOrders = orders.filter(o => 
    o.status === 'sended' || 
    o.status === 'in-transit' || 
    o.status === 'delivered'
  );
  
  res.json({
    success: true,
    data: courierOrders
  });
});

// Inquiry routes
app.get('/api/inquiries', (req, res) => {
  res.json({
    success: true,
    data: inquiries
  });
});

app.post('/api/inquiries', (req, res) => {
  const inquiry = {
    id: (inquiries.length + 1).toString(),
    ...req.body,
    status: 'received',
    createdAt: new Date().toISOString()
  };
  
  inquiries.push(inquiry);
  
  res.status(201).json({
    success: true,
    message: 'Inquiry submitted successfully',
    data: inquiry
  });
});

app.put('/api/inquiries/:id/status', (req, res) => {
  const { status } = req.body;
  const inquiryIndex = inquiries.findIndex(i => i.id === req.params.id);
  
  if (inquiryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Inquiry not found'
    });
  }
  
  inquiries[inquiryIndex].status = status;
  
  res.json({
    success: true,
    message: 'Inquiry status updated',
    data: inquiries[inquiryIndex]
  });
});

app.delete('/api/inquiries/:id', (req, res) => {
  const inquiryIndex = inquiries.findIndex(i => i.id === req.params.id);
  
  if (inquiryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Inquiry not found'
    });
  }
  
  inquiries.splice(inquiryIndex, 1);
  
  res.json({
    success: true,
    message: 'Inquiry deleted successfully'
  });
});

// 404 handler - SIMPLE VERSION
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
    message: 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3030;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Test login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   Email: admin@nirvaan.lk`);
  console.log(`   Password: admin123`);
});