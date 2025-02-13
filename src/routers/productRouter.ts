import express from "express";
import { ProductService } from "../services/productService";
import { adminAuthMiddleware, authMiddleware } from "../middleware/auth";

const router = express.Router();

// Public routes
router.get("/", async (req, res) => {
  try {
    const { page, limit, categoryId, search, minPrice, maxPrice, inStock } =
      req.query;
    const result = await ProductService.getAllProducts({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      categoryId: categoryId as string,
      search: search as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      inStock: inStock ? inStock === "true" : undefined,
    });
    return res.json({ ...result, success: true });
  } catch (error) {
    console.error("Get products error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch products", success: false });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await ProductService.getProduct(req.params.id);
    return res.json({ product, success: true });
  } catch (error) {
    console.error("Get product error:", error);
    return res
      .status(404)
      .json({ message: "Product not found", success: false });
  }
});

// Admin routes
router.post("/", adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description, price, sku, stockQuantity, categoryId, images } =
      req.body;

    if (
      !name ||
      !description ||
      !price ||
      !sku ||
      !stockQuantity ||
      !categoryId
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        success: false,
      });
    }

    const product = await ProductService.createProduct({
      name,
      description,
      price,
      sku,
      stockQuantity,
      categoryId,
      images,
    });

    return res.status(201).json({ product, success: true });
  } catch (error) {
    console.error("Create product error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to create product",
      success: false,
    });
  }
});

router.put("/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      sku,
      stockQuantity,
      categoryId,
      images,
      isActive,
    } = req.body;

    const product = await ProductService.updateProduct(req.params.id, {
      name,
      description,
      price,
      sku,
      stockQuantity,
      categoryId,
      images,
      isActive,
    });

    return res.json({ product, success: true });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to update product",
      success: false,
    });
  }
});

router.delete("/:id", adminAuthMiddleware, async (req, res) => {
  try {
    await ProductService.deleteProduct(req.params.id);
    return res.json({ message: "Product deleted successfully", success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete product", success: false });
  }
});

// Analytics route (admin only)
router.get("/analytics/summary", adminAuthMiddleware, async (req, res) => {
  try {
    const analytics = await ProductService.getProductAnalytics();
    return res.json({ ...analytics, success: true });
  } catch (error) {
    console.error("Product analytics error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch analytics", success: false });
  }
});

export default router;
