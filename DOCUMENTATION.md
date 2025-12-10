# 📚 OMS Backend - Complete Documentation

**Order Management System Backend API**  
**Version:** 2.0  
**Last Updated:** December 6, 2025

---

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Database Setup](#database-setup)
4. [API Documentation](#api-documentation)
5. [Authentication](#authentication)
6. [Endpoints Reference](#endpoints-reference)
7. [Models & Database Schema](#models--database-schema)
8. [Error Handling](#error-handling)
9. [Security & Performance](#security--performance)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Installation
```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Setup database (if using MySQL)
npm run seed

# Start development server
npm run dev

# Start production server
npm start
```

### Choose Your Server Mode

**Option 1: In-Memory Mode (Development)**
```bash
node server.js
```
- Fast setup, no database needed
- Data stored in RAM
- Perfect for testing and development
- Data resets on server restart

**Option 2: Database Mode (Production)**
```bash
node server-db.js
```
- MySQL database required
- Persistent data storage
- Production-ready
- Real-time data synchronization

### Server URLs
- **API Base URL:** `http://localhost:3030`
- **Health Check:** `http://localhost:3030/api/health`
- **Database Status:** `http://localhost:3030/api/database/status`

---

## 🏗️ Project Overview

### Tech Stack
- **Runtime:** Node.js v22+
- **Framework:** Express.js v5.2
- **Database:** MySQL v3.15
- **Authentication:** JWT (jsonwebtoken v9.0)
- **Security:** Helmet v8.1, bcryptjs v3.0
- **Performance:** Compression v1.8
- **Validation:** Express-validator v7.3

### Project Structure
```
oms-backend/
├── src/
│   ├── controllers/         # Route controllers
│   │   ├── authController.js
│   │   ├── ordersController.js
│   │   ├── productsController.js
│   │   ├── dashboardController.js
│   │   ├── analyticsController.js
│   │   └── courierController.js
│   ├── models/             # Database models
│   │   ├── User.js
│   │   ├── Order.js
│   │   ├── Product.js
│   │   └── Inquiry.js
│   ├── middlewares/        # Custom middleware
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── routes/            # API routes
│   └── utils/             # Helper functions
├── seed/                  # Database seeders
│   └── seed.js
├── database.js           # Database connection
├── server.js            # In-memory server
├── server-db.js         # Database server
├── package.json
└── .env                 # Environment variables
```

### Key Features
✅ **User Authentication** - JWT-based secure authentication  
✅ **Order Management** - Complete CRUD operations  
✅ **Real-time Analytics** - Live dashboard statistics  
✅ **Courier Tracking** - Order status tracking  
✅ **Input Validation** - Comprehensive data validation  
✅ **Error Handling** - Structured error responses  
✅ **Rate Limiting** - API protection (100 req/min)  
✅ **Data Caching** - User cache (5min TTL)  
✅ **Security Headers** - Helmet protection  
✅ **Response Compression** - Gzip compression  
✅ **Graceful Shutdown** - Proper cleanup on exit  

---

## 🗄️ Database Setup

### Environment Configuration

Create `.env` file:
```env
# Server
PORT=3030
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=oms_db

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
```

### Database Schema

#### Orders Table
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id VARCHAR(50) UNIQUE NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  product_id VARCHAR(50),
  product_name VARCHAR(255),
  quantity INT NOT NULL,
  status ENUM('received', 'received', 'issued', 'sended', 
              'in-transit', 'delivered', 'cancelled') DEFAULT 'received',
  notes TEXT,
  total_amount DECIMAL(10, 2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Products Table
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  status ENUM('available', 'out-of-stock', 'discontinued') DEFAULT 'available',
  category VARCHAR(100),
  image VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fullName VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'manager') DEFAULT 'admin',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Inquiries Table
```sql
CREATE TABLE inquiries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message TEXT NOT NULL,
  name VARCHAR(255) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  mobile VARCHAR(20) DEFAULT '',
  status ENUM('pending', 'resolved') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Seed Database
```bash
# Run seeder to populate with sample data
npm run seed
```

This creates:
- 1 Admin user (admin@nirvaan.lk / admin123)
- 5 Sample products
- 6 Sample orders with various statuses

---

## 🔐 Authentication

### Login Flow

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@nirvaan.lk",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "fullName": "Admin User",
    "email": "admin@nirvaan.lk",
    "role": "admin"
  }
}
```

### Using Authentication

Include JWT token in request headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Default Credentials

**Admin Account:**
- Email: `admin@nirvaan.lk`
- Password: `admin123`
- Role: `admin`

---

## 📡 Endpoints Reference

### Health & Status

#### GET /api/health
Check server and database status

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "database": "Connected",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

#### GET /api/database/status
Detailed database information (database mode only)

**Response:**
```json
{
  "success": true,
  "database": {
    "status": "connected",
    "host": "localhost",
    "name": "oms_db",
    "tables": {
      "orders": 64,
      "products": 5,
      "users": 1
    }
  }
}
```

---

### 👤 Authentication Endpoints

#### POST /api/auth/login
User login

**Request Body:**
```json
{
  "email": "admin@nirvaan.lk",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "fullName": "Admin User",
    "email": "admin@nirvaan.lk",
    "role": "admin"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### 📦 Orders Endpoints

#### GET /api/orders
Get all orders with optional filtering

**Query Parameters:**
- `status` - Filter by status (received, received, issued, etc.)
- `search` - Search by name, mobile, or order ID
- `startDate` - Filter by date range (YYYY-MM-DD)
- `endDate` - Filter by date range (YYYY-MM-DD)
- `limit` - Limit results (max 1000)

**Example:**
```
GET /api/orders?status=received&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "order_id": "ORD20250612001",
      "fullName": "Kamal Perera",
      "address": "123 Main Street, Colombo",
      "mobile": "94701234567",
      "product_id": "PROD001",
      "product_name": "NIRVAAN 5KG Oil",
      "quantity": 2,
      "status": "pending",
      "total_amount": 20000.00,
      "createdAt": "2025-12-06T10:00:00Z"
    }
  ]
}
```

#### GET /api/orders/:id
Get single order by ID

**Example:**
```
GET /api/orders/1
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_id": "ORD20250612001",
    "fullName": "Kamal Perera",
    "status": "pending",
    ...
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Order not found"
}
```

#### POST /api/orders
Create new order (Public endpoint - no auth required)

**Request Body:**
```json
{
  "fullName": "John Doe",
  "address": "123 Main St, Colombo",
  "mobile": "0701234567",
  "product_id": "PROD001",
  "product_name": "NIRVAAN 5KG Oil",
  "quantity": 2,
  "notes": "Urgent delivery",
  "total_amount": 20000
}
```

**Validation Rules:**
- `fullName` - Required, min 2 characters
- `address` - Required, min 5 characters
- `mobile` - Required, 10-15 digits
- `product_id` - Required
- `quantity` - Required, 1-100

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 5,
    "order_id": "ORD20250612005",
    ...
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Valid mobile number is required (10-15 digits)"
}
```

#### PUT /api/orders/:id/status
Update order status

**Request Body:**
```json
{
  "status": "sended"
}
```

**Valid Status Values:**
- `received`
- `received`
- `issued`
- `sended`
- `in-transit`
- `delivered`
- `cancelled`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": 1,
    "status": "sended",
    ...
  }
}
```

#### PUT /api/orders/:id
Update entire order

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "address": "New Address",
  "quantity": 3,
  "total_amount": 30000
}
```

#### DELETE /api/orders/:id
Delete an order

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

---

### 🛍️ Products Endpoints

#### GET /api/products
Get all products with optional filtering

**Query Parameters:**
- `status` - Filter by status (available, out-of-stock, discontinued)
- `category` - Filter by category
- `search` - Search by name, description, or product ID
- `limit` - Limit results

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": "PROD001",
      "name": "NIRVAAN 5KG (100% PURE COCONUT OIL)",
      "description": "100% Pure Coconut Oil, 5KG pack",
      "price": 10000.00,
      "status": "available",
      "category": "Coconut Oil",
      "image": "/images/oil.jpg",
      "createdAt": "2025-12-06T10:00:00Z"
    }
  ]
}
```

---

### 📊 Dashboard & Analytics

#### GET /api/dashboard/stats
Get real-time dashboard statistics

**Response:**
```json
{
  "success": true,
  "total": 64,
  "pending": 12,
  "received": 15,
  "issued": 20,
  "courier": 10,
  "today": 5,
  "monthly": 64,
  "database_status": "connected"
}
```

#### GET /api/analytics
Get analytics data for charts

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 640000,
    "totalOrders": 64,
    "statusData": [
      { "name": "Received", "value": 15, "color": "#eab308" }
    ]
  }
}
```

---

### 🚚 Courier Endpoints

#### GET /api/courier/orders
Get all courier-related orders

Returns orders with status: `sended`, `in-transit`, or `delivered`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "order_id": "ORD20250612004",
      "fullName": "Anil Silva",
      "status": "sended",
      ...
    }
  ]
}
```

---

### 💬 Inquiry Endpoints

#### GET /api/inquiries
Get all customer inquiries

**Query Parameters:**
- `status` - Filter by status (pending, resolved)
- `limit` - Limit results

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "message": "When will my order arrive?",
      "name": "Customer Name",
      "email": "customer@email.com",
      "mobile": "0701234567",
      "status": "pending",
      "createdAt": "2025-12-06T10:00:00Z"
    }
  ]
}
```

#### POST /api/inquiries
Submit new inquiry (Public endpoint)

**Request Body:**
```json
{
  "message": "When will my order arrive?",
  "name": "John Doe",
  "email": "john@email.com",
  "mobile": "0701234567"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Inquiry submitted successfully",
  "data": {
    "id": 1,
    "message": "...",
    "status": "pending",
    "createdAt": "..."
  }
}
```

#### PUT /api/inquiries/:id/status
Update inquiry status

**Request Body:**
```json
{
  "status": "resolved"
}
```

#### DELETE /api/inquiries/:id
Delete an inquiry

---

## 🛡️ Error Handling

### Error Response Format

All errors follow this structure:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional validation errors
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Types

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Authentication Error:**
```json
{
  "success": false,
  "message": "Invalid authentication token"
}
```

**Database Error:**
```json
{
  "success": false,
  "message": "Duplicate entry found. This record already exists."
}
```

---

## 🔒 Security & Performance

### Security Features

1. **Helmet Protection** - XSS, clickjacking prevention
2. **Rate Limiting** - 100 requests per minute per IP
3. **Input Validation** - All inputs validated and sanitized
4. **Password Hashing** - bcrypt with salt rounds
5. **JWT Authentication** - Secure token-based auth
6. **Request Size Limits** - 10MB max payload
7. **CORS** - Configured for your domain

### Performance Optimizations

1. **Response Compression** - Gzip/Deflate (60-80% size reduction)
2. **Connection Pooling** - Optimized MySQL connections
3. **User Caching** - 5-minute cache for auth
4. **Health Check Caching** - 30-second cache
5. **Query Optimization** - Indexed fields, efficient queries
6. **Graceful Shutdown** - Proper cleanup on exit

### Rate Limiting

**Default Limits:**
- 100 requests per minute per IP
- Applies to all `/api/*` routes
- Returns 429 status when exceeded

**Customize:**
```javascript
const MAX_REQUESTS = 100;  // requests per window
const RATE_LIMIT_WINDOW = 60000;  // 1 minute
```

---

## 🧪 Testing

### Manual Testing

#### Test Health
```bash
curl http://localhost:3030/api/health
```

#### Test Login
```bash
curl -X POST http://localhost:3030/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nirvaan.lk","password":"admin123"}'
```

#### Test Orders
```bash
# Get all orders
curl http://localhost:3030/api/orders

# Get single order
curl http://localhost:3030/api/orders/1

# Update status
curl -X PUT http://localhost:3030/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"sended"}'
```

### Database Testing

```bash
# Test database connection
node quick-test.js

# Run comprehensive database tests
node test-database.js
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production` in .env
- [ ] Use strong `JWT_SECRET`
- [ ] Configure proper database credentials
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up logging (winston/morgan)
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Configure firewall rules
- [ ] Set proper CORS origins
- [ ] Enable compression
- [ ] Set rate limiting

### Environment Variables

```env
NODE_ENV=production
PORT=3030
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=strong-password
DB_NAME=oms_db
JWT_SECRET=very-strong-secret-key
JWT_EXPIRES_IN=24h
```

### Process Management

**Using PM2:**
```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server-db.js --name oms-backend

# View logs
pm2 logs oms-backend

# Restart
pm2 restart oms-backend

# Stop
pm2 stop oms-backend
```

---

## 🔧 Troubleshooting

### Common Issues

#### Server won't start
```bash
# Check if port is in use
netstat -ano | findstr :3030

# Kill process if needed (Windows)
taskkill /PID <PID> /F

# Try different port
PORT=3031 node server.js
```

#### Database connection failed
```bash
# Test database connection
node quick-test.js

# Check MySQL service is running
# Windows: services.msc
# Linux: sudo systemctl status mysql

# Verify credentials in .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=oms_db
```

#### JWT errors
```bash
# Ensure JWT_SECRET is set
echo $JWT_SECRET

# Generate new secret if needed
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Rate limit reached
Wait 1 minute or restart server to clear limits

#### Memory issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server-db.js
```

---

## 📞 Support & Resources

### Quick Commands

```bash
# Development
npm run dev              # Start with nodemon
npm start               # Start production server

# Database
npm run seed           # Seed database with sample data
node quick-test.js    # Test database connection
node test-database.js # Comprehensive DB tests

# Testing
node server.js        # Start in-memory mode
node server-db.js    # Start database mode
```

### File Reference

| File | Purpose |
|------|---------|
| `server.js` | In-memory development server |
| `server-db.js` | Production database server |
| `database.js` | MySQL connection & queries |
| `package.json` | Dependencies & scripts |
| `.env` | Environment configuration |
| `seed/seed.js` | Database seeder |

### Important URLs

- Health: `http://localhost:3030/api/health`
- DB Status: `http://localhost:3030/api/database/status`
- Orders: `http://localhost:3030/api/orders`
- Dashboard: `http://localhost:3030/api/dashboard/stats`

---

## 📝 Changelog

### Version 2.0 (December 6, 2025)
- ✅ Complete code optimization
- ✅ Added security headers (Helmet)
- ✅ Added response compression
- ✅ Implemented rate limiting
- ✅ Added user caching
- ✅ Enhanced input validation
- ✅ Improved error handling
- ✅ Added graceful shutdown
- ✅ Optimized database queries
- ✅ Consolidated documentation

### Version 1.0 (December 4, 2025)
- Initial release
- Basic CRUD operations
- JWT authentication
- MySQL integration
- Dashboard analytics

---

## 📄 License

ISC

---

**🎉 You're all set! Start building amazing features with OMS Backend!**

For questions or issues, refer to the troubleshooting section or check the inline code comments.
