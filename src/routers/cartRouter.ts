import express from "express";
import { CartService } from "../services/cartService";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

// Add item to cart
router.post("/add", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = (req as any).user.userId;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        message: "Product ID and quantity (minimum 1) are required",
        success: false,
      });
    }

    const cartItem = await CartService.addToCart(userId, productId, quantity);
    return res.status(201).json({ cartItem, success: true });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to add item to cart",
      success: false,
    });
  }
});

// Update cart item quantity
router.put("/update/:cartItemId", async (req, res) => {
  try {
    const { quantity } = req.body;
    const userId = (req as any).user.userId;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        message: "Valid quantity is required",
        success: false,
      });
    }

    if (quantity === 0) {
      await CartService.removeFromCart(userId, req.params.cartItemId);
      return res.json({ message: "Item removed from cart", success: true });
    }

    const cartItem = await CartService.updateCartItem(
      userId,
      req.params.cartItemId,
      quantity
    );
    return res.json({ cartItem, success: true });
  } catch (error) {
    console.error("Update cart error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update cart",
      success: false,
    });
  }
});

// Remove item from cart
router.delete("/remove/:cartItemId", async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await CartService.removeFromCart(userId, req.params.cartItemId);
    return res.json({ message: "Item removed from cart", success: true });
  } catch (error) {
    console.error("Remove from cart error:", error);
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to remove item from cart",
      success: false,
    });
  }
});

// Get cart contents
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const cart = await CartService.getCart(userId);
    return res.json({ ...cart, success: true });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({
      message: "Failed to fetch cart",
      success: false,
    });
  }
});

// Clear cart
router.delete("/clear", async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await CartService.clearCart(userId);
    return res.json({ message: "Cart cleared", success: true });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({
      message: "Failed to clear cart",
      success: false,
    });
  }
});

// Validate cart items (check stock availability)
router.get("/validate", async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const validation = await CartService.validateCartItems(userId);
    return res.json({ ...validation, success: true });
  } catch (error) {
    console.error("Validate cart error:", error);
    return res.status(500).json({
      message: "Failed to validate cart",
      success: false,
    });
  }
});

export default router;
