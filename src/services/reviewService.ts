import {
  reviewRepo,
  orderRepo,
  userRepo,
  productRepo,
} from "../database/database";
import { Review } from "../database/entities";
import { EntityManager, getManager } from "typeorm";

export class ReviewService {
  static async createReview(
    userId: string,
    productId: string,
    data: {
      rating: number;
      comment: string;
      images?: string[];
    }
  ): Promise<Review> {
    return getManager().transaction(
      async (transactionalEntityManager: EntityManager) => {
        try {
          // Check if user has purchased the product
          const hasOrdered = await orderRepo
            .createQueryBuilder("order")
            .innerJoin("order.orderItems", "orderItem")
            .where("order.user.id = :userId", { userId })
            .andWhere("orderItem.product.id = :productId", { productId })
            .andWhere("order.status = :status", { status: "delivered" })
            .getCount();

          // Check if user has already reviewed the product
          const existingReview = await reviewRepo.findOne({
            where: {
              user: { id: userId },
              product: { id: productId },
            },
          });

          if (existingReview) {
            throw new Error("You have already reviewed this product");
          }

          const review = new Review();
          review.user = await userRepo.findOne({ where: { id: userId } });
          review.product = await productRepo.findOne({
            where: { id: productId },
          });
          review.rating = data.rating;
          review.comment = data.comment;
          review.images = data.images || [];
          review.isVerifiedPurchase = hasOrdered > 0;
          review.status = "pending";

          return await transactionalEntityManager.save(Review, review);
        } catch (error) {
          console.error("Review creation error:", error);
          throw error;
        }
      }
    );
  }

  static async updateReview(
    userId: string,
    reviewId: string,
    data: {
      rating?: number;
      comment?: string;
      images?: string[];
    }
  ): Promise<Review> {
    try {
      const review = await reviewRepo.findOne({
        where: { id: reviewId, user: { id: userId } },
      });

      if (!review) {
        throw new Error("Review not found");
      }

      if (data.rating) review.rating = data.rating;
      if (data.comment) review.comment = data.comment;
      if (data.images) review.images = data.images;
      review.status = "pending"; // Reset status for re-moderation

      return await reviewRepo.save(review);
    } catch (error) {
      console.error("Review update error:", error);
      throw error;
    }
  }

  static async moderateReview(
    reviewId: string,
    data: {
      status: "approved" | "rejected";
      moderationNotes?: string;
      adminReply?: string;
    }
  ): Promise<Review> {
    try {
      const review = await reviewRepo.findOne({
        where: { id: reviewId },
      });

      if (!review) {
        throw new Error("Review not found");
      }

      review.status = data.status;
      review.moderationNotes = data.moderationNotes;
      if (data.adminReply) {
        review.adminReply = data.adminReply;
        review.replyDate = new Date();
      }

      return await reviewRepo.save(review);
    } catch (error) {
      console.error("Review moderation error:", error);
      throw error;
    }
  }

  static async voteReview(
    userId: string,
    reviewId: string,
    isHelpful: boolean
  ): Promise<Review> {
    try {
      const review = await reviewRepo.findOne({
        where: { id: reviewId },
      });

      if (!review) {
        throw new Error("Review not found");
      }

      if (isHelpful) {
        review.helpfulVotes += 1;
      } else {
        review.unhelpfulVotes += 1;
      }

      return await reviewRepo.save(review);
    } catch (error) {
      console.error("Review voting error:", error);
      throw error;
    }
  }

  static async getProductReviews(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      rating?: number;
      verifiedOnly?: boolean;
      sortBy?: "helpful" | "recent" | "rating";
    }
  ): Promise<{ reviews: Review[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = reviewRepo
        .createQueryBuilder("review")
        .leftJoinAndSelect("review.user", "user")
        .where("review.product.id = :productId", { productId })
        .andWhere("review.status = :status", { status: "approved" });

      if (options.rating) {
        queryBuilder.andWhere("review.rating = :rating", {
          rating: options.rating,
        });
      }

      if (options.verifiedOnly) {
        queryBuilder.andWhere("review.isVerifiedPurchase = true");
      }

      switch (options.sortBy) {
        case "helpful":
          queryBuilder.orderBy("review.helpfulVotes", "DESC");
          break;
        case "rating":
          queryBuilder.orderBy("review.rating", "DESC");
          break;
        case "recent":
        default:
          queryBuilder.orderBy("review.createdAt", "DESC");
      }

      const [reviews, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return { reviews, total };
    } catch (error) {
      console.error("Get product reviews error:", error);
      throw error;
    }
  }

  static async getReviewAnalytics(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    verifiedPurchases: number;
  }> {
    try {
      const queryBuilder = reviewRepo
        .createQueryBuilder("review")
        .where("review.product.id = :productId", { productId })
        .andWhere("review.status = :status", { status: "approved" });

      const totalReviews = await queryBuilder.getCount();

      const avgResult = await queryBuilder
        .select("AVG(review.rating)", "averageRating")
        .getRawOne();

      const distribution = await queryBuilder
        .select("review.rating", "rating")
        .addSelect("COUNT(*)", "count")
        .groupBy("review.rating")
        .getRawMany();

      const verifiedCount = await queryBuilder
        .andWhere("review.isVerifiedPurchase = true")
        .getCount();

      const ratingDistribution = distribution.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.rating]: parseInt(curr.count),
        }),
        {}
      );

      return {
        averageRating: parseFloat(avgResult.averageRating) || 0,
        totalReviews,
        ratingDistribution,
        verifiedPurchases: verifiedCount,
      };
    } catch (error) {
      console.error("Review analytics error:", error);
      throw error;
    }
  }
}
