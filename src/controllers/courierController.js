const { Order } = require('../models');

class CourierController {
  // Get all courier orders
  async getCourierOrders(req, res, next) {
    try {
      const filters = {};
      
      if (req.query.status && req.query.status !== 'all') {
        filters.status = req.query.status;
      } else {
        // Default to courier-related statuses
        filters.status = ['sended', 'in-transit', 'delivered'];
      }
      
      if (req.query.search) {
        filters.search = req.query.search;
      }
      
      const orders = await Order.getAll(filters);
      
      // Filter to only courier-related orders
      const courierOrders = orders.filter(order => 
        ['sended', 'in-transit', 'delivered'].includes(order.status)
      );
      
      res.status(200).json({
        success: true,
        count: courierOrders.length,
        data: courierOrders
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Update courier status
  async updateCourierStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }
      
      const validStatuses = ['sended', 'in-transit', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid courier status'
        });
      }
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      // Validate status transition
      if (!this.isValidStatusTransition(order.status, status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${order.status} to ${status}`
        });
      }
      
      const updatedOrder = await Order.updateStatus(id, status);
      
      res.status(200).json({
        success: true,
        message: 'Courier status updated successfully',
        data: updatedOrder
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Validate status transition
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'sended': ['in-transit', 'delivered'],
      'in-transit': ['delivered'],
      'delivered': [] // No transitions from delivered
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  // Get next possible statuses
  async getNextStatuses(req, res, next) {
    try {
      const { id } = req.params;
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      const nextStatuses = this.getPossibleNextStatuses(order.status);
      
      res.status(200).json({
        success: true,
        currentStatus: order.status,
        nextStatuses
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get possible next statuses
  getPossibleNextStatuses(currentStatus) {
    const statusMap = {
      'sended': [
        { value: 'in-transit', label: 'In Transit' },
        { value: 'delivered', label: 'Delivered' }
      ],
      'in-transit': [
        { value: 'delivered', label: 'Delivered' }
      ],
      'delivered': []
    };
    
    return statusMap[currentStatus] || [];
  }

  // Get courier statistics
  async getCourierStats(req, res, next) {
    try {
      const orders = await Order.getAll();
      
      const stats = {
        total: 0,
        sentToCourier: 0,
        inTransit: 0,
        delivered: 0,
        pendingDelivery: 0,
        avgDeliveryTime: 0
      };
      
      // Calculate basic stats
      orders.forEach(order => {
        if (order.status === 'sended') {
          stats.total++;
          stats.sentToCourier++;
          stats.pendingDelivery++;
        } else if (order.status === 'in-transit') {
          stats.total++;
          stats.inTransit++;
          stats.pendingDelivery++;
        } else if (order.status === 'delivered') {
          stats.total++;
          stats.delivered++;
        }
      });
      
      // Calculate average delivery time for delivered orders
      const deliveredOrders = orders.filter(order => order.status === 'delivered');
      if (deliveredOrders.length > 0) {
        const totalDeliveryTime = deliveredOrders.reduce((sum, order) => {
          const createdAt = new Date(order.createdAt);
          const updatedAt = new Date(order.updatedAt);
          const deliveryTime = (updatedAt - createdAt) / (1000 * 60 * 60 * 24); // Convert to days
          return sum + deliveryTime;
        }, 0);
        
        stats.avgDeliveryTime = totalDeliveryTime / deliveredOrders.length;
      }
      
      res.status(200).json({
        success: true,
        ...stats
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Bulk update courier status
  async bulkUpdateStatus(req, res, next) {
    try {
      const { orderIds, status } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order IDs array is required'
        });
      }
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }
      
      const validStatuses = ['sended', 'in-transit', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      
      const results = {
        successful: [],
        failed: []
      };
      
      // Update each order
      for (const orderId of orderIds) {
        try {
          const order = await Order.findById(orderId);
          
          if (!order) {
            results.failed.push({ id: orderId, error: 'Order not found' });
            continue;
          }
          
          // Validate status transition
          if (!this.isValidStatusTransition(order.status, status)) {
            results.failed.push({ 
              id: orderId, 
              error: `Invalid transition from ${order.status} to ${status}` 
            });
            continue;
          }
          
          await Order.updateStatus(orderId, status);
          results.successful.push(orderId);
          
        } catch (error) {
          results.failed.push({ id: orderId, error: error.message });
        }
      }
      
      res.status(200).json({
        success: true,
        message: `Updated ${results.successful.length} orders, ${results.failed.length} failed`,
        results
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get delivery timeline for order
  async getDeliveryTimeline(req, res, next) {
    try {
      const { id } = req.params;
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      const timeline = [
        {
          status: 'order-placed',
          label: 'Order Placed',
          date: order.createdAt,
          completed: true
        },
        {
          status: 'processed',
          label: 'Order Processed',
          date: ['received', 'issued', 'sended', 'in-transit', 'delivered'].includes(order.status) ? 
                order.updatedAt : null,
          completed: ['received', 'issued', 'sended', 'in-transit', 'delivered'].includes(order.status)
        },
        {
          status: 'sended',
          label: 'Sent to Courier',
          date: ['sended', 'in-transit', 'delivered'].includes(order.status) ? 
                order.updatedAt : null,
          completed: ['sended', 'in-transit', 'delivered'].includes(order.status)
        },
        {
          status: 'in-transit',
          label: 'In Transit',
          date: ['in-transit', 'delivered'].includes(order.status) ? 
                order.updatedAt : null,
          completed: ['in-transit', 'delivered'].includes(order.status)
        },
        {
          status: 'delivered',
          label: 'Delivered',
          date: order.status === 'delivered' ? order.updatedAt : null,
          completed: order.status === 'delivered'
        }
      ];
      
      res.status(200).json({
        success: true,
        data: timeline
      });
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CourierController();