import express from "express";
import { DiscountService } from "../services/discountService";
import { authMiddleware, adminAuthMiddleware } from "../middleware/auth";

const router = express.Router();

// Get active discounts (public)
router.get("/active", async (req, res) => {
  try {
    const { page, limit } = req.query;
    const discounts = await DiscountService.getActiveDiscounts({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    return res.json({ ...discounts, success: true });
  } catch (error) {
    console.error("Get active discounts error:", error);
    return res.status(500).json({
      message: "Failed to fetch active discounts",
      success: false,
    });
  }
});

// Validate discount code
router.post("/validate", authMiddleware, async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    const userId = (req as any).user.userId;

    if (!code || !cartTotal || !cartItems) {
      return res.status(400).json({
        message: "Code, cart total, and cart items are required",
        success: false,
      });
    }

    const validation = await DiscountService.validateDiscount(
      code,
      userId,
      cartTotal,
      cartItems
    );

    if (validation.valid && validation.discount) {
      const discountAmount = await DiscountService.calculateDiscountAmount(
        validation.discount,
        cartTotal,
        cartItems
      );
      return res.json({
        ...validation,
        discountAmount,
        success: true,
      });
    }

    return res.json({ ...validation, success: true });
  } catch (error) {
    console.error("Discount validation error:", error);
    return res.status(500).json({
      message: "Failed to validate discount",
      success: false,
    });
  }
});

// Admin routes
router.use(adminAuthMiddleware);

// Create discount
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      code,
      type,
      scope,
      value,
      startDate,
      endDate,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      applicableProductIds,
      applicableCategoryIds,
      applicableUserIds,
      conditions,
    } = req.body;

    if (
      !name ||
      !description ||
      !code ||
      !type ||
      !scope ||
      !value ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        success: false,
      });
    }

    const discount = await DiscountService.createDiscount({
      name,
      description,
      code,
      type,
      scope,
      value,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      applicableProductIds,
      applicableCategoryIds,
      applicableUserIds,
      conditions,
    });

    return res.status(201).json({ discount, success: true });
  } catch (error) {
    console.error("Create discount error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to create discount",
      success: false,
    });
  }
});

// Update discount
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      description,
      code,
      type,
      scope,
      value,
      startDate,
      endDate,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      isActive,
      applicableProductIds,
      applicableCategoryIds,
      applicableUserIds,
      conditions,
    } = req.body;

    const discount = await DiscountService.updateDiscount(req.params.id, {
      name,
      description,
      code,
      type,
      scope,
      value,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      isActive,
      applicableProductIds,
      applicableCategoryIds,
      applicableUserIds,
      conditions,
    });

    return res.json({ discount, success: true });
  } catch (error) {
    console.error("Update discount error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to update discount",
      success: false,
    });
  }
});

export default router;
