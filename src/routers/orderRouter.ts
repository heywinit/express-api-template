import express from "express";
import { OrderService } from "../services/orderService";
import { authMiddleware, adminAuthMiddleware } from "../middleware/auth";

const router = express.Router();

// All order routes require authentication
router.use(authMiddleware);

// Create new order
router.post("/", async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = (req as any).user.userId;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        message: "Shipping address and payment method are required",
        success: false,
      });
    }

    const order = await OrderService.createOrder(userId, {
      shippingAddress,
      paymentMethod,
    });

    return res.status(201).json({ order, success: true });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to create order",
      success: false,
    });
  }
});

// Get user's orders
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { page, limit, status } = req.query;

    const orders = await OrderService.getUserOrders(userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as any,
    });

    return res.json({ ...orders, success: true });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      message: "Failed to fetch orders",
      success: false,
    });
  }
});

// Get specific order
router.get("/:orderId", async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const order = await OrderService.getOrder(req.params.orderId, userId);
    return res.json({ order, success: true });
  } catch (error) {
    console.error("Get order error:", error);
    return res.status(404).json({
      message: error instanceof Error ? error.message : "Order not found",
      success: false,
    });
  }
});

// Update order status (admin only)
router.put("/:orderId/status", adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        success: false,
      });
    }

    const order = await OrderService.updateOrderStatus(
      req.params.orderId,
      status
    );
    return res.json({ order, success: true });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update order status",
      success: false,
    });
  }
});

// Get order analytics (admin only)
router.get("/analytics/summary", adminAuthMiddleware, async (req, res) => {
  try {
    const analytics = await OrderService.getOrderAnalytics();
    return res.json({ ...analytics, success: true });
  } catch (error) {
    console.error("Order analytics error:", error);
    return res.status(500).json({
      message: "Failed to fetch order analytics",
      success: false,
    });
  }
});

export default router;
