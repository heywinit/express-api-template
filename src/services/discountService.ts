import { discountRepo, productRepo, categoryRepo } from "../database/database";
import { Discount, Product, Category } from "../database/entities";
import { EntityManager, getManager, In, LessThan, MoreThan } from "typeorm";

export class DiscountService {
  static async createDiscount(data: {
    name: string;
    description: string;
    code: string;
    type: "percentage" | "fixed" | "buy_x_get_y";
    scope: "product" | "category" | "cart" | "user";
    value: number;
    startDate: Date;
    endDate: Date;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    applicableProductIds?: string[];
    applicableCategoryIds?: string[];
    applicableUserIds?: string[];
    conditions?: {
      minItems?: number;
      maxItems?: number;
      requiredProducts?: string[];
      excludedProducts?: string[];
      userType?: string[];
      firstPurchaseOnly?: boolean;
    };
  }): Promise<Discount> {
    return getManager().transaction(
      async (transactionalEntityManager: EntityManager) => {
        try {
          const discount = new Discount();
          Object.assign(discount, {
            ...data,
            conditions: data.conditions || {},
          });

          if (data.applicableProductIds?.length) {
            discount.applicableProducts = await productRepo.find({
              where: { id: In(data.applicableProductIds) },
            });
          }

          if (data.applicableCategoryIds?.length) {
            discount.applicableCategories = await categoryRepo.find({
              where: { id: In(data.applicableCategoryIds) },
            });
          }

          return await transactionalEntityManager.save(Discount, discount);
        } catch (error) {
          console.error("Discount creation error:", error);
          throw error;
        }
      }
    );
  }

  static async updateDiscount(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      code: string;
      type: "percentage" | "fixed" | "buy_x_get_y";
      scope: "product" | "category" | "cart" | "user";
      value: number;
      startDate: Date;
      endDate: Date;
      minPurchaseAmount: number;
      maxDiscountAmount: number;
      usageLimit: number;
      isActive: boolean;
      applicableProductIds: string[];
      applicableCategoryIds: string[];
      applicableUserIds: string[];
      conditions: {
        minItems?: number;
        maxItems?: number;
        requiredProducts?: string[];
        excludedProducts?: string[];
        userType?: string[];
        firstPurchaseOnly?: boolean;
      };
    }>
  ): Promise<Discount> {
    return getManager().transaction(
      async (transactionalEntityManager: EntityManager) => {
        try {
          const discount = await discountRepo.findOne({
            where: { id },
            relations: ["applicableProducts", "applicableCategories"],
          });

          if (!discount) {
            throw new Error("Discount not found");
          }

          if (data.applicableProductIds) {
            discount.applicableProducts = await productRepo.find({
              where: { id: In(data.applicableProductIds) },
            });
          }

          if (data.applicableCategoryIds) {
            discount.applicableCategories = await categoryRepo.find({
              where: { id: In(data.applicableCategoryIds) },
            });
          }

          Object.assign(discount, {
            ...data,
            applicableProducts: data.applicableProductIds
              ? discount.applicableProducts
              : undefined,
            applicableCategories: data.applicableCategoryIds
              ? discount.applicableCategories
              : undefined,
          });

          return await transactionalEntityManager.save(Discount, discount);
        } catch (error) {
          console.error("Discount update error:", error);
          throw error;
        }
      }
    );
  }

  static async validateDiscount(
    code: string,
    userId: string,
    cartTotal: number,
    cartItems: Array<{ productId: string; quantity: number }>
  ): Promise<{
    valid: boolean;
    discount?: Discount;
    invalidReason?: string;
  }> {
    try {
      const discount = await discountRepo.findOne({
        where: {
          code,
          isActive: true,
          startDate: LessThan(new Date()),
          endDate: MoreThan(new Date()),
        },
        relations: ["applicableProducts", "applicableCategories"],
      });

      if (!discount) {
        return { valid: false, invalidReason: "Discount not found or expired" };
      }

      // Check usage limit
      if (
        discount.usageLimit !== -1 &&
        discount.usageCount >= discount.usageLimit
      ) {
        return { valid: false, invalidReason: "Discount usage limit reached" };
      }

      // Check minimum purchase amount
      if (
        discount.minPurchaseAmount &&
        cartTotal < discount.minPurchaseAmount
      ) {
        return {
          valid: false,
          invalidReason: `Minimum purchase amount of ${discount.minPurchaseAmount} required`,
        };
      }

      // Check conditions
      if (discount.conditions) {
        const { minItems, maxItems, requiredProducts, excludedProducts } =
          discount.conditions;

        const totalItems = cartItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        if (minItems && totalItems < minItems) {
          return {
            valid: false,
            invalidReason: `Minimum ${minItems} items required`,
          };
        }
        if (maxItems && totalItems > maxItems) {
          return {
            valid: false,
            invalidReason: `Maximum ${maxItems} items allowed`,
          };
        }

        if (requiredProducts?.length) {
          const hasRequired = cartItems.some((item) =>
            requiredProducts.includes(item.productId)
          );
          if (!hasRequired) {
            return {
              valid: false,
              invalidReason: "Required products missing from cart",
            };
          }
        }

        if (excludedProducts?.length) {
          const hasExcluded = cartItems.some((item) =>
            excludedProducts.includes(item.productId)
          );
          if (hasExcluded) {
            return {
              valid: false,
              invalidReason: "Cart contains excluded products",
            };
          }
        }
      }

      return { valid: true, discount };
    } catch (error) {
      console.error("Discount validation error:", error);
      throw error;
    }
  }

  static async calculateDiscountAmount(
    discount: Discount,
    cartTotal: number,
    cartItems: Array<{ productId: string; quantity: number; price: number }>
  ): Promise<number> {
    try {
      let discountAmount = 0;

      switch (discount.type) {
        case "percentage":
          discountAmount = cartTotal * (discount.value / 100);
          break;

        case "fixed":
          discountAmount = discount.value;
          break;

        case "buy_x_get_y":
          // Implementation depends on specific business rules
          // This is a simple example where value represents the number of free items
          const eligibleItems = cartItems
            .filter((item) => {
              if (discount.applicableProducts?.length) {
                return discount.applicableProducts.some(
                  (p) => p.id === item.productId
                );
              }
              return true;
            })
            .sort((a, b) => a.price - b.price); // Sort by price to give cheapest items free

          const freeItems = eligibleItems.slice(0, Math.floor(discount.value));
          discountAmount = freeItems.reduce((sum, item) => sum + item.price, 0);
          break;
      }

      // Apply maximum discount limit if set
      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
      }

      return discountAmount;
    } catch (error) {
      console.error("Discount calculation error:", error);
      throw error;
    }
  }

  static async getActiveDiscounts(options: {
    page?: number;
    limit?: number;
  }): Promise<{ discounts: Discount[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const [discounts, total] = await discountRepo.findAndCount({
        where: {
          isActive: true,
          startDate: LessThan(new Date()),
          endDate: MoreThan(new Date()),
        },
        relations: ["applicableProducts", "applicableCategories"],
        skip,
        take: limit,
        order: {
          createdAt: "DESC",
        },
      });

      return { discounts, total };
    } catch (error) {
      console.error("Get active discounts error:", error);
      throw error;
    }
  }
}
