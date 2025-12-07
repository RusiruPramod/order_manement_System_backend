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
        { name: "Pending", value: 0, color: "#f59e0b" },
        { name: "Received", value: 0, color: "#3b82f6" },
        { name: "Issued", value: 0, color: "#10b981" },
        { name: "Sent to Courier", value: 0, color: "#8b5cf6" },
        { name: "In Transit", value: 0, color: "#6366f1" },
        { name: "Delivered", value: 0, color: "#ef4444" }
      ];
      
      orders.forEach(order => {
        const status = order.status.toLowerCase();
        const statusMap = {
          'pending': 'Pending',
          'received': 'Received',
          'issued': 'Issued',
          'sended': 'Sent to Courier',
          'in-transit': 'In Transit',
          'delivered': 'Delivered'
        };
        
        const statusName = statusMap[status] || 'Pending';
        const statusItem = statusData.find(s => s.name === statusName);
        if (statusItem) {
          statusItem.value++;
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