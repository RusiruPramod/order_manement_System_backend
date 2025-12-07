const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const createDatabase = async () => {
  let connection;

  try {
    // Connect without database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('Creating database...');

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`✅ Database ${process.env.DB_NAME} created/verified`);

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Drop tables if exists (for clean seed)
    console.log('Dropping existing tables...');
    await connection.query('DROP TABLE IF EXISTS products');
    await connection.query('DROP TABLE IF EXISTS orders');
    await connection.query('DROP TABLE IF EXISTS users');

    // Create users table
    console.log('Creating users table...');
    await connection.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        fullName VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'staff') DEFAULT 'admin',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    console.log('Creating products table...');
    await connection.query(`
      CREATE TABLE products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL DEFAULT 10000.00,
        status ENUM('available', 'out-of-stock', 'discontinued') DEFAULT 'available',
        category VARCHAR(100),
        image VARCHAR(500),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    console.log('Creating orders table...');
    await connection.query(`
      CREATE TABLE orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id VARCHAR(20) UNIQUE NOT NULL,
        fullName VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        product_id VARCHAR(20) NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        quantity INT NOT NULL,
        status ENUM('pending', 'received', 'issued', 'sended', 'in-transit', 'delivered') DEFAULT 'pending',
        notes TEXT,
        total_amount DECIMAL(10, 2),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
      )
    `);

    // Insert admin user
    console.log('Inserting admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(`
      INSERT INTO users (fullName, email, password, role) 
      VALUES (?, ?, ?, ?)
    `, ['Admin User', 'admin@nirvaan.lk', hashedPassword, 'admin']);

    // Insert sample products
    console.log('Inserting sample products...');
    const products = [
      {
        product_id: 'PROD001',
        name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
        description: '100% Pure Coconut Oil, 5KG pack',
        price: 10000.00,
        status: 'available',
        category: 'Coconut Oil',
        image: 'https://example.com/oil.jpg'
      },
      {
        product_id: 'PROD002',
        name: 'NIRVAAN 1KG (PURE COCONUT OIL)',
        description: '100% Pure Coconut Oil, 1KG pack',
        price: 2500.00,
        status: 'available',
        category: 'Coconut Oil',
        image: 'https://example.com/oil1kg.jpg'
      },
      {
        product_id: 'PROD003',
        name: 'NIRVAAN COCONUT MILK POWDER 400G',
        description: 'Premium Coconut Milk Powder',
        price: 1200.00,
        status: 'available',
        category: 'Coconut Powder',
        image: 'https://example.com/powder.jpg'
      },
      {
        product_id: 'PROD004',
        name: 'NIRVAAN VIRGIN COCONUT OIL 500ML',
        description: 'Virgin Coconut Oil for cooking',
        price: 1500.00,
        status: 'out-of-stock',
        category: 'Coconut Oil',
        image: 'https://example.com/virgin.jpg'
      },
      {
        product_id: 'PROD005',
        name: 'NIRVAAN COCONUT CREAM 200ML',
        description: 'Rich Coconut Cream',
        price: 800.00,
        status: 'available',
        category: 'Coconut Cream',
        image: 'https://example.com/cream.jpg'
      }
    ];

    for (const product of products) {
      await connection.query(`
        INSERT INTO products (product_id, name, description, price, status, category, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        product.product_id,
        product.name,
        product.description,
        product.price,
        product.status,
        product.category,
        product.image
      ]);
    }

    // Insert sample orders
    console.log('Inserting sample orders...');
    const orders = [
      {
        order_id: 'ORD202401001',
        fullName: 'Kamal Perera',
        address: '123 Main Street, Colombo',
        mobile: '94701234567',
        product_id: 'PROD001',
        product_name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
        quantity: 2,
        status: 'pending',
        total_amount: 20000.00
      },
      {
        order_id: 'ORD202401002',
        fullName: 'Nimal Fernando',
        address: '456 Galle Road, Galle',
        mobile: '94707654321',
        product_id: 'PROD002',
        product_name: 'NIRVAAN 1KG (PURE COCONUT OIL)',
        quantity: 5,
        status: 'received',
        total_amount: 12500.00
      },
      {
        order_id: 'ORD202401003',
        fullName: 'Sunil Rathnayake',
        address: '789 Kandy Road, Kandy',
        mobile: '94709876543',
        product_id: 'PROD003',
        product_name: 'NIRVAAN COCONUT MILK POWDER 400G',
        quantity: 10,
        status: 'issued',
        total_amount: 12000.00
      },
      {
        order_id: 'ORD202401004',
        fullName: 'Anil Silva',
        address: '321 Negombo Road, Negombo',
        mobile: '94705556677',
        product_id: 'PROD001',
        product_name: 'NIRVAAN 5KG (100% PURE COCONUT OIL)',
        quantity: 1,
        status: 'sended',
        total_amount: 10000.00
      },
      {
        order_id: 'ORD202401005',
        fullName: 'Ranjith Bandara',
        address: '654 Matara Road, Matara',
        mobile: '94708889900',
        product_id: 'PROD005',
        product_name: 'NIRVAAN COCONUT CREAM 200ML',
        quantity: 20,
        status: 'in-transit',
        total_amount: 16000.00
      },
      {
        order_id: 'ORD202401006',
        fullName: 'Dilshan Wijesinghe',
        address: '987 Kurunegala Road, Kurunegala',
        mobile: '94701112233',
        product_id: 'PROD004',
        product_name: 'NIRVAAN VIRGIN COCONUT OIL 500ML',
        quantity: 3,
        status: 'delivered',
        total_amount: 4500.00
      }
    ];

    for (const order of orders) {
      await connection.query(`
        INSERT INTO orders (order_id, fullName, address, mobile, product_id, product_name, quantity, status, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.order_id,
        order.fullName,
        order.address,
        order.mobile,
        order.product_id,
        order.product_name,
        order.quantity,
        order.status,
        order.total_amount
      ]);
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Sample Data Summary:');
    console.log('👤 Admin User: admin@nirvaan.lk / admin123');
    console.log('📦 Products: 5 sample products added');
    console.log('📋 Orders: 6 sample orders added');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit();
  }
};

createDatabase();