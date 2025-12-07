const { Order, Product } = require('../models');

class AnalyticsController {
  // Get comprehensive analytics
  async getAnalytics(req, res, next) {
    try {
      const orders = await Order.getAll();
      const products = await Product.getAll();
      
      // Calculate total revenue
      const totalRevenue = orders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount || 0), 0
      );
      
      // Status distribution
      const statusData = [
        { name: "Received", value: 0, color: "#eab308" }
      ];
      
      orders.forEach(order => {
        if (order.status === 'received') statusData[0].value++;
      });
      
      // Weekly data (last 7 days)
      const weeklyData = this.generateWeeklyData(orders);
      
      // Monthly data (last 6 months)
      const monthlyData = await Order.getAnalyticsData();
      
      res.status(200).json({
        success: true,
        data: {
          totalRevenue,
          totalOrders: orders.length,
          totalProducts: products.length,
          averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
          statusData,
          weeklyData,
          monthlyData: this.formatMonthlyData(monthlyData)
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Generate weekly data
  generateWeeklyData(orders) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      weeklyData[dateStr] = {
        name: dayName,
        orders: 0,
        revenue: 0
      };
    }
    
    // Fill with order data
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateStr = orderDate.toISOString().split('T')[0];
      
      if (weeklyData[dateStr]) {
        weeklyData[dateStr].orders++;
        weeklyData[dateStr].revenue += parseFloat(order.total_amount || 0);
      }
    });
    
    return Object.values(weeklyData);
  }

  // Format monthly data
  formatMonthlyData(monthlyData) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return monthlyData.map(item => ({
      name: months[item.month - 1],
      orders: item.order_count,
      revenue: parseFloat(item.revenue) || 0,
      avgOrderValue: parseFloat(item.avg_order_value) || 0
    }));
  }

  // Get top performing products
  async getTopProducts(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const topProducts = await Order.getTopProducts(limit);
      
      // Get product details
      const productsWithDetails = await Promise.all(
        topProducts.map(async (product) => {
          const productDetails = await Product.findByProductId(product.product_id);
          return {
            ...product,
            image: productDetails?.image || '',
            price: productDetails?.price || 0
          };
        })
      );
      
      res.status(200).json({
        success: true,
        count: productsWithDetails.length,
        data: productsWithDetails
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get revenue analytics
  async getRevenueAnalytics(req, res, next) {
    try {
      const { period = 'monthly' } = req.query;
      let analyticsData;
      
      if (period === 'daily') {
        // Last 30 days
        const { query } = require('../../database');
        const sql = `
          SELECT 
            DATE(createdAt) as date,
            SUM(total_amount) as revenue,
            COUNT(*) as orders
          FROM orders 
          WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `;
        
        analyticsData = await query(sql);
      } else {
        // Monthly (default)
        analyticsData = await Order.getAnalyticsData();
      }
      
      res.status(200).json({
        success: true,
        period,
        data: analyticsData
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get customer analytics
  async getCustomerAnalytics(req, res, next) {
    try {
      const { query } = require('../../database');
      
      // Get top customers by order value
      const topCustomersSQL = `
        SELECT 
          fullName,
          mobile,
          COUNT(*) as order_count,
          SUM(total_amount) as total_spent,
          MAX(createdAt) as last_order_date
        FROM orders 
        GROUP BY fullName, mobile
        ORDER BY total_spent DESC
        LIMIT 10
      `;
      
      const topCustomers = await query(topCustomersSQL);
      
      // Get customer acquisition over time
      const acquisitionSQL = `
        SELECT 
          DATE(createdAt) as date,
          COUNT(DISTINCT CONCAT(fullName, mobile)) as new_customers
        FROM orders 
        WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `;
      
      const acquisitionData = await query(acquisitionSQL);
      
      res.status(200).json({
        success: true,
        data: {
          topCustomers,
          acquisitionData,
          totalCustomers: topCustomers.length
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get product performance analytics
  async getProductPerformance(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      let sql = `
        SELECT 
          p.product_id,
          p.name,
          p.category,
          p.price,
          COUNT(o.id) as order_count,
          SUM(o.quantity) as total_quantity,
          SUM(o.total_amount) as total_revenue
        FROM products p
        LEFT JOIN orders o ON p.product_id = o.product_id
      `;
      
      const params = [];
      
      if (startDate && endDate) {
        sql += ` WHERE DATE(o.createdAt) BETWEEN ? AND ? `;
        params.push(startDate, endDate);
      }
      
      sql += `
        GROUP BY p.product_id, p.name, p.category, p.price
        ORDER BY total_revenue DESC
      `;
      
      const { query } = require('../../database');
      const productPerformance = await query(sql, params);
      
      res.status(200).json({
        success: true,
        count: productPerformance.length,
        data: productPerformance
      });
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();