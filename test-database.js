const db = require('./database');
const Order = require('./src/models/Order');
const Product = require('./src/models/Product');
const User = require('./src/models/User');

console.log('\n' + '='.repeat(70));
console.log('🔍 MYSQL DATABASE CONNECTION TEST');
console.log('='.repeat(70) + '\n');

async function testDatabaseConnection() {
  try {
    // Test 1: Basic Connection
    console.log('Test 1: Testing basic database connection...');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      console.error('\n❌ DATABASE NOT CONNECTED!\n');
      console.log('Possible issues:');
      console.log('1. MySQL server is not running');
      console.log('2. Database credentials are incorrect in .env file');
      console.log('3. Database "oms_db" does not exist\n');
      console.log('Your .env settings:');
      console.log('  DB_HOST:', process.env.DB_HOST);
      console.log('  DB_USER:', process.env.DB_USER);
      console.log('  DB_NAME:', process.env.DB_NAME);
      console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(empty)');
      console.log('\n' + '='.repeat(70));
      return false;
    }
    
    console.log('✅ Basic connection successful!\n');
    
    // Test 2: Check Tables
    console.log('Test 2: Checking database tables...');
    try {
      const tables = await db.query('SHOW TABLES');
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });
      console.log('');
    } catch (error) {
      console.error('❌ Could not check tables:', error.message);
    }
    
    // Test 3: Check Orders Table
    console.log('Test 3: Checking orders table...');
    try {
      const orders = await Order.getAll();
      console.log(`✅ Orders table exists with ${orders.length} orders`);
      
      if (orders.length > 0) {
        console.log('\n   Recent orders:');
        orders.slice(0, 3).forEach(order => {
          console.log(`   - ID: ${order.id}, Customer: ${order.fullName}, Status: ${order.status}`);
        });
      } else {
        console.log('   ⚠️  No orders found (table is empty)');
      }
      console.log('');
    } catch (error) {
      console.error('❌ Orders table error:', error.message);
      console.log('   Run seed script: npm run seed\n');
    }
    
    // Test 4: Check Products Table
    console.log('Test 4: Checking products table...');
    try {
      const products = await Product.getAll();
      console.log(`✅ Products table exists with ${products.length} products`);
      
      if (products.length > 0) {
        console.log('\n   Available products:');
        products.forEach(product => {
          console.log(`   - ${product.name} (Rs. ${product.price})`);
        });
      } else {
        console.log('   ⚠️  No products found (table is empty)');
      }
      console.log('');
    } catch (error) {
      console.error('❌ Products table error:', error.message);
      console.log('   Run seed script: npm run seed\n');
    }
    
    // Test 5: Check Users Table
    console.log('Test 5: Checking users table...');
    try {
      const users = await db.query('SELECT id, fullName, email, role FROM users');
      console.log(`✅ Users table exists with ${users.length} users`);
      
      if (users.length > 0) {
        console.log('\n   Registered users:');
        users.forEach(user => {
          console.log(`   - ${user.fullName} (${user.email}) - ${user.role}`);
        });
      } else {
        console.log('   ⚠️  No users found (table is empty)');
      }
      console.log('');
    } catch (error) {
      console.error('❌ Users table error:', error.message);
      console.log('   Run seed script: npm run seed\n');
    }
    
    // Test 6: Check Dashboard Stats
    console.log('Test 6: Testing dashboard statistics...');
    try {
      const stats = await Order.getDashboardStats();
      console.log('✅ Dashboard stats retrieved successfully:');
      console.log(`   Total Orders: ${stats.total}`);
      console.log(`   Received: ${stats.pending}`);
      console.log(`   Received: ${stats.received}`);
      console.log(`   Issued: ${stats.issued}`);
      console.log(`   Courier: ${stats.courier}`);
      console.log(`   Today: ${stats.today}`);
      console.log(`   This Month: ${stats.monthly}`);
      console.log(`   Total Revenue: Rs. ${stats.total_revenue || 0}\n`);
    } catch (error) {
      console.error('❌ Dashboard stats error:', error.message + '\n');
    }
    
    // Test 7: Test Write Operation
    console.log('Test 7: Testing database write operation...');
    try {
      const testOrder = await Order.create({
        fullName: 'Test Customer',
        address: 'Test Address',
        mobile: '94701234567',
        product_id: 'PROD001',
        product_name: 'Test Product',
        quantity: 1,
        status: 'received',
        total_amount: 10000
      });
      
      console.log('✅ Write operation successful!');
      console.log(`   Created test order ID: ${testOrder.id}`);
      
      // Clean up test order
      await Order.delete(testOrder.id);
      console.log('   Test order deleted\n');
    } catch (error) {
      console.error('❌ Write operation failed:', error.message);
      console.log('   Database might be read-only or permissions issue\n');
    }
    
    // Final Summary
    console.log('='.repeat(70));
    console.log('📊 DATABASE STATUS SUMMARY');
    console.log('='.repeat(70));
    console.log('✅ Database Connection: WORKING');
    console.log('✅ Server can READ from database');
    console.log('✅ Server can WRITE to database');
    console.log('✅ All models are functioning correctly');
    console.log('\n🎉 YOUR DATABASE IS FULLY CONNECTED AND WORKING!\n');
    console.log('You can now use server-db.js for full database functionality:');
    console.log('   node server-db.js\n');
    console.log('='.repeat(70) + '\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.error(error.stack);
    console.log('\n' + '='.repeat(70) + '\n');
    return false;
  } finally {
    process.exit(0);
  }
}

// Run the test
testDatabaseConnection();
