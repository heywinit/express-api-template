import express from "express";
import { ReviewService } from "../services/reviewService";
import { authMiddleware, adminAuthMiddleware } from "../middleware/auth";

const router = express.Router();

// Get product reviews (public)
router.get("/product/:productId", async (req, res) => {
  try {
    const { page, limit, rating, verifiedOnly, sortBy } = req.query;
    const reviews = await ReviewService.getProductReviews(
      req.params.productId,
      {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        rating: rating ? parseInt(rating as string) : undefined,
        verifiedOnly: verifiedOnly === "true",
        sortBy: sortBy as "helpful" | "recent" | "rating",
      }
    );
    return res.json({ ...reviews, success: true });
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({
      message: "Failed to fetch reviews",
      success: false,
    });
  }
});

// Get review analytics (public)
router.get("/product/:productId/analytics", async (req, res) => {
  try {
    const analytics = await ReviewService.getReviewAnalytics(
      req.params.productId
    );
    return res.json({ ...analytics, success: true });
  } catch (error) {
    console.error("Review analytics error:", error);
    return res.status(500).json({
      message: "Failed to fetch review analytics",
      success: false,
    });
  }
});

// Create review (authenticated)
router.post("/product/:productId", authMiddleware, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const userId = (req as any).user.userId;

    if (!rating || !comment) {
      return res.status(400).json({
        message: "Rating and comment are required",
        success: false,
      });
    }

    const review = await ReviewService.createReview(
      userId,
      req.params.productId,
      {
        rating,
        comment,
        images,
      }
    );

    return res.status(201).json({ review, success: true });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to create review",
      success: false,
    });
  }
});

// Update review (authenticated)
router.put("/:reviewId", authMiddleware, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const userId = (req as any).user.userId;

    const review = await ReviewService.updateReview(
      userId,
      req.params.reviewId,
      {
        rating,
        comment,
        images,
      }
    );

    return res.json({ review, success: true });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to update review",
      success: false,
    });
  }
});

// Vote on review (authenticated)
router.post("/:reviewId/vote", authMiddleware, async (req, res) => {
  try {
    const { isHelpful } = req.body;
    const userId = (req as any).user.userId;

    if (isHelpful === undefined) {
      return res.status(400).json({
        message: "Vote type is required",
        success: false,
      });
    }

    const review = await ReviewService.voteReview(
      userId,
      req.params.reviewId,
      isHelpful
    );

    return res.json({ review, success: true });
  } catch (error) {
    console.error("Review vote error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to vote on review",
      success: false,
    });
  }
});

// Moderate review (admin only)
router.put("/:reviewId/moderate", adminAuthMiddleware, async (req, res) => {
  try {
    const { status, moderationNotes, adminReply } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        success: false,
      });
    }

    const review = await ReviewService.moderateReview(req.params.reviewId, {
      status,
      moderationNotes,
      adminReply,
    });

    return res.json({ review, success: true });
  } catch (error) {
    console.error("Review moderation error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to moderate review",
      success: false,
    });
  }
});

export default router;
