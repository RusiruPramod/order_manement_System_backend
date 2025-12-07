const { Order, Product } = require('../models');
const { validationResult } = require('express-validator');

class OrdersController {
  // Get all orders
  async getAllOrders(req, res, next) {
    try {
      const filters = {};
      
      if (req.query.status && req.query.status !== 'all') {
        filters.status = req.query.status;
      }
      
      if (req.query.search) {
        filters.search = req.query.search;
      }
      
      if (req.query.startDate && req.query.endDate) {
        filters.startDate = req.query.startDate;
        filters.endDate = req.query.endDate;
      }
      
      const orders = await Order.getAll(filters);
      
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get order by ID
  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: order
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Create new order
  async createOrder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { 
        fullName, 
        address, 
        mobile, 
        product_id, 
        product_name, 
        quantity, 
        notes,
        total_amount 
      } = req.body;
      
      // Validate product
      const product = await Product.findByProductId(product_id);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Create order
      const orderData = {
        fullName,
        address,
        mobile,
        product_id,
        product_name: product_name || product.name,
        quantity: parseInt(quantity),
        notes,
        total_amount: total_amount || (parseInt(quantity) * parseFloat(product.price))
      };
      
      const order = await Order.create(orderData);
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Update order
  async updateOrder(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      // If product_id is updated, validate new product
      if (updateData.product_id && updateData.product_id !== order.product_id) {
        const product = await Product.findByProductId(updateData.product_id);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: 'Product not found'
          });
        }
        
        if (!updateData.product_name) {
          updateData.product_name = product.name;
        }
        
        if (!updateData.total_amount) {
          const quantity = updateData.quantity || order.quantity;
          updateData.total_amount = quantity * parseFloat(product.price);
        }
      }
      
      // If quantity is updated, recalculate total
      if (updateData.quantity && !updateData.total_amount) {
        const product = await Product.findByProductId(order.product_id);
        if (product) {
          updateData.total_amount = updateData.quantity * parseFloat(product.price);
        }
      }
      
      const updatedOrder = await Order.update(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: updatedOrder
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Update order status
  async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }
      
      const validStatuses = ['pending', 'received', 'issued', 'sended', 'in-transit', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      const updatedOrder = await Order.updateStatus(id, status);
      
      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Delete order
  async deleteOrder(req, res, next) {
    try {
      const { id } = req.params;
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      await Order.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Order deleted successfully'
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Send order to courier
  async sendToCourier(req, res, next) {
    try {
      const { id } = req.params;
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      const updatedOrder = await Order.updateStatus(id, 'sended');
      
      res.status(200).json({
        success: true,
        message: 'Order sent to courier successfully',
        data: updatedOrder
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Generate WhatsApp message for order
  async generateWhatsAppMessage(req, res, next) {
    try {
      const { id } = req.params;
      
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      const message = `නව ඇණවුමක්!\n\nනම: ${order.fullName}\nදුරකථන: ${order.mobile}\nලිපිනය: ${order.address}\nනිෂ්පාදනය: ${order.product_name}\nප්‍රමාණය: ${order.quantity}\nඇණවුම් අංකය: ${order.order_id}`;
      
      res.status(200).json({
        success: true,
        message: message,
        whatsappNumber: order.mobile
      });
      
    } catch (error) {
      next(error);
    }
  }

  // Get order timeline
  async getOrderTimeline(req, res, next) {
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
          status: "pending", 
          label: "Order Placed", 
          date: order.createdAt,
          completed: true 
        },
        { 
          status: "received", 
          label: "Order Received", 
          date: ['received', 'issued', 'sended', 'in-transit', 'delivered'].includes(order.status) ? 
                order.updatedAt : null,
          completed: ['received', 'issued', 'sended', 'in-transit', 'delivered'].includes(order.status)
        },
        { 
          status: "issued", 
          label: "Order Issued", 
          date: ['issued', 'sended', 'in-transit', 'delivered'].includes(order.status) ? 
                order.updatedAt : null,
          completed: ['issued', 'sended', 'in-transit', 'delivered'].includes(order.status)
        },
        { 
          status: "sended", 
          label: "Sent to Courier", 
          date: ['sended', 'in-transit', 'delivered'].includes(order.status) ? 
                order.updatedAt : null,
          completed: ['sended', 'in-transit', 'delivered'].includes(order.status)
        },
        { 
          status: "in-transit", 
          label: "In Transit", 
          date: ['in-transit', 'delivered'].includes(order.status) ? 
                order.updatedAt : null,
          completed: ['in-transit', 'delivered'].includes(order.status)
        },
        { 
          status: "delivered", 
          label: "Delivered", 
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

module.exports = new OrdersController();