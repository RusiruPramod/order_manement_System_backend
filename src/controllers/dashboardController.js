const { Order } = require('../models');

class DashboardController {
  // Get dashboard statistics
  async getStats(req, res, next) {
    try {
      const stats = await Order.getDashboardStats();
      
      res.status(200).json({
        success: true,
        ...stats
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get recent orders
  async getRecentOrders(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const orders = await Order.getRecentOrders(limit);
      
      res.status(200).json({
        success: true,
        count: orders.length,
        orders
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get daily data for charts
  async getDailyData(req, res, next) {
    try {
      const dailyOrders = await Order.getDailyOrders();
      
      // Format for frontend chart
      const formattedData = dailyOrders.map(item => ({
        name: item.day_name.substring(0, 3), // Short day name
        orders: item.order_count,
        revenue: parseFloat(item.total_revenue) || 0
      }));
      
      // Ensure 7 days of data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const completeData = days.map(day => {
        const existing = formattedData.find(d => d.name === day);
        return existing || { name: day, orders: 0, revenue: 0 };
      });
      
      res.status(200).json({
        success: true,
        data: completeData
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get status distribution
  async getStatusDistribution(req, res, next) {
    try {
      const orders = await Order.getAll();
      
      const statusData = [
        { name: "Received", value: 0, color: "#eab308" }
      ];
      
      orders.forEach(order => {
        if (order.status === 'received') {
          statusData[0].value++;
        }
      });
      
      res.status(200).json({
        success: true,
        data: statusData
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get monthly summary
  async getMonthlySummary(req, res, next) {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const orders = await Order.getAll();
      
      const monthlyOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear;
      });
      
      const totalRevenue = monthlyOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount || 0), 0
      );
      
      const averageOrderValue = monthlyOrders.length > 0 ? 
        totalRevenue / monthlyOrders.length : 0;
      
      res.status(200).json({
        success: true,
        month: currentDate.toLocaleString('default', { month: 'long' }),
        year: currentYear,
        totalOrders: monthlyOrders.length,
        totalRevenue: totalRevenue,
        averageOrderValue: averageOrderValue.toFixed(2)
      });
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();