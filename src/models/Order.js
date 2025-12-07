const db = require('../../database');

class Order {
  // Validate order data
  static validateOrderData(data) {
    const errors = [];
    
    if (!data.fullName || data.fullName.trim().length < 2) {
      errors.push('Full name is required (minimum 2 characters)');
    }
    
    if (!data.address || data.address.trim().length < 5) {
      errors.push('Valid address is required');
    }
    
    if (!data.mobile || !/^[0-9]{10,15}$/.test(data.mobile.replace(/[\s\-\+]/g, ''))) {
      errors.push('Valid mobile number is required');
    }
    
    if (!data.product_id) {
      errors.push('Product ID is required');
    }
    
    if (!data.quantity || parseInt(data.quantity) < 1) {
      errors.push('Valid quantity is required');
    }
    
    return errors;
  }

  // Generate order ID
  static generateOrderId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${year}${month}${day}${random}`;
  }

  // Create order with validation
  static async create(orderData) {
    // Validate input
    const errors = this.validateOrderData(orderData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const orderId = this.generateOrderId();
    const { 
      fullName, 
      address, 
      mobile, 
      product_id, 
      product_name, 
      quantity, 
      status = 'pending',
      notes = '',
      total_amount 
    } = orderData;

    const sanitizedData = {
      orderId,
      fullName: fullName.trim(),
      address: address.trim(),
      mobile: mobile.replace(/[\s\-]/g, ''),
      product_id,
      product_name: product_name || '',
      quantity: parseInt(quantity),
      status,
      notes: notes.trim(),
      total_amount: total_amount || parseInt(quantity) * 10000
    };

    const sql = `
      INSERT INTO orders 
      (order_id, fullName, address, mobile, product_id, product_name, quantity, status, notes, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await db.query(sql, [
      sanitizedData.orderId,
      sanitizedData.fullName,
      sanitizedData.address,
      sanitizedData.mobile,
      sanitizedData.product_id,
      sanitizedData.product_name,
      sanitizedData.quantity,
      sanitizedData.status,
      sanitizedData.notes,
      sanitizedData.total_amount
    ]);
    
    return this.findById(result.insertId);
  }

  // Find order by ID
  static async findById(id) {
    const sql = 'SELECT * FROM orders WHERE id = ? LIMIT 1';
    const orders = await db.query(sql, [id]);
    return orders[0] || null;
  }

  // Find order by order_id
  static async findByOrderId(orderId) {
    const sql = 'SELECT * FROM orders WHERE order_id = ? LIMIT 1';
    const orders = await db.query(sql, [orderId]);
    return orders[0] || null;
  }

  // Get all orders with optimized query
  static async getAll(filters = {}) {
    let sql = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];
    
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    
    if (filters.search) {
      conditions.push('(fullName LIKE ? OR mobile LIKE ? OR order_id LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.startDate && filters.endDate) {
      conditions.push('DATE(createdAt) BETWEEN ? AND ?');
      params.push(filters.startDate, filters.endDate);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY createdAt DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }
    
    return await db.query(sql, params);
  }

  // Update order
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    
    const allowedFields = ['fullName', 'address', 'mobile', 'product_id', 'product_name', 
                          'quantity', 'status', 'notes', 'total_amount'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });
    
    if (fields.length === 0) return null;
    
    values.push(id);
    const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
    
    await db.query(sql, values);
    return this.findById(id);
  }

  // Update order status
  static async updateStatus(id, status) {
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    await db.query(sql, [status, id]);
    return this.findById(id);
  }

  // Delete order
  static async delete(id) {
    const sql = 'DELETE FROM orders WHERE id = ?';
    await db.query(sql, [id]);
    return true;
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status IN ('sended', 'in-transit', 'delivered') THEN 1 ELSE 0 END) as courier,
        SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as monthly,
        SUM(total_amount) as total_revenue
      FROM orders
    `;
    
    const result = await db.query(sql);
    return result[0] || {
      total: 0, pending: 0, received: 0, issued: 0, 
      courier: 0, today: 0, monthly: 0, total_revenue: 0
    };
  }

  // Get daily orders for last 7 days
  static async getDailyOrders() {
    const sql = `
      SELECT 
        DATE(createdAt) as date,
        DAYNAME(createdAt) as day_name,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue
      FROM orders 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(createdAt), DAYNAME(createdAt)
      ORDER BY date ASC
    `;
    
    return await db.query(sql);
  }

  // Get recent orders
  static async getRecentOrders(limit = 5) {
    const sql = `
      SELECT * FROM orders 
      ORDER BY createdAt DESC 
      LIMIT ?
    `;
    
    return await db.query(sql, [limit]);
  }

  // Get orders by status
  static async getOrdersByStatus(status) {
    const sql = `
      SELECT * FROM orders 
      WHERE status = ? 
      ORDER BY createdAt DESC
    `;
    
    return await db.query(sql, [status]);
  }

  // Get analytics data
  static async getAnalyticsData() {
    const sql = `
      SELECT 
        MONTH(createdAt) as month,
        YEAR(createdAt) as year,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY YEAR(createdAt), MONTH(createdAt)
      ORDER BY year DESC, month DESC
    `;
    
    return await db.query(sql);
  }

  // Get top products
  static async getTopProducts(limit = 5) {
    const sql = `
      SELECT 
        product_id,
        product_name,
        SUM(quantity) as total_quantity,
        SUM(total_amount) as total_revenue,
        COUNT(*) as order_count
      FROM orders 
      GROUP BY product_id, product_name
      ORDER BY total_revenue DESC
      LIMIT ?
    `;
    
    return await db.query(sql, [limit]);
  }
}

module.exports = Order;