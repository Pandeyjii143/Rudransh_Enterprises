const { dbAsync } = require("../config/database");
const { authenticateToken, authorize } = require("../middleware/auth");
const { ROLES } = require("../config/constants");

class DeliveryController {
  // Get tracking info for an order
  static async getTracking(req, res) {
    try {
      const { orderId } = req.params;

      // Verify user owns the order
      const order = await dbAsync.get(
        "SELECT * FROM orders WHERE id = ? AND user_id = ?",
        [orderId, req.user.userId]
      );

      if (!order) {
        return res.status(404).json({ error: { message: "Order not found" } });
      }

      // Get delivery info
      const delivery = await dbAsync.get(
        "SELECT * FROM deliveries WHERE order_id = ?",
        [orderId]
      );

      if (!delivery) {
        return res.json({
          orderId,
          status: "pending",
          trackingNumber: null,
          carrier: null,
          currentLocation: null,
          estimatedDelivery: null,
          updates: []
        });
      }

      // Get tracking updates
      const updates = await dbAsync.all(
        "SELECT * FROM tracking_updates WHERE delivery_id = ? ORDER BY timestamp DESC",
        [delivery.id]
      );

      res.json({
        orderId,
        status: delivery.status,
        trackingNumber: delivery.tracking_number,
        carrier: delivery.carrier,
        currentLocation: delivery.current_location,
        estimatedDelivery: delivery.estimated_delivery,
        actualDelivery: delivery.actual_delivery,
        updates: updates.map(update => ({
          status: update.status,
          location: update.location,
          description: update.description,
          timestamp: update.timestamp
        }))
      });
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  }

  // Admin: Update delivery status
  static async updateDeliveryStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, trackingNumber, carrier, location, description } = req.body;

      // Get delivery
      const delivery = await dbAsync.get(
        "SELECT * FROM deliveries WHERE order_id = ?",
        [orderId]
      );

      if (!delivery) {
        return res.status(404).json({ error: { message: "Delivery not found" } });
      }

      // Update delivery
      await dbAsync.run(
        `UPDATE deliveries SET
          status = ?,
          tracking_number = COALESCE(?, tracking_number),
          carrier = COALESCE(?, carrier),
          current_location = COALESCE(?, current_location),
          updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [status, trackingNumber, carrier, location, delivery.id]
      );

      // Add tracking update
      if (description) {
        await dbAsync.run(
          `INSERT INTO tracking_updates (delivery_id, status, location, description) VALUES (?, ?, ?, ?)`,
          [delivery.id, status, location, description]
        );
      }

      // If delivered, update actual delivery time
      if (status === "delivered") {
        await dbAsync.run(
          "UPDATE deliveries SET actual_delivery = CURRENT_TIMESTAMP WHERE id = ?",
          [delivery.id]
        );
      }

      res.json({ message: "Delivery updated successfully" });
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  }

  // Admin: Get all deliveries
  static async getAllDeliveries(req, res) {
    try {
      const deliveries = await dbAsync.all(`
        SELECT
          d.*,
          o.user_id,
          o.total_amount,
          u.name as customer_name,
          u.email as customer_email
        FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        JOIN users u ON o.user_id = u.id
        ORDER BY d.created_at DESC
      `);

      res.json(deliveries);
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  }
}

module.exports = DeliveryController;