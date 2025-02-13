import { cartRepo, productRepo, userRepo } from "../database/database";
import { Cart, User, Product } from "../database/entities";
import { EntityManager, LessThan } from "typeorm";

export class CartService {
  static async addToCart(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> {
    try {
      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error("User not found");
      }

      const product = await productRepo.findOne({ where: { id: productId } });
      if (!product) {
        throw new Error("Product not found");
      }

      if (product.stockQuantity < quantity) {
        throw new Error("Not enough stock available");
      }

      // Check if item already exists in cart
      let cartItem = await cartRepo.findOne({
        where: {
          user: { id: userId },
          product: { id: productId },
        },
      });

      if (cartItem) {
        cartItem.quantity += quantity;
      } else {
        cartItem = new Cart();
        cartItem.user = user;
        cartItem.product = product;
        cartItem.quantity = quantity;
      }

      return await cartRepo.save(cartItem);
    } catch (error) {
      console.error("Add to cart error:", error);
      throw error;
    }
  }

  static async updateCartItem(
    userId: string,
    cartItemId: string,
    quantity: number
  ): Promise<Cart> {
    try {
      const cartItem = await cartRepo.findOne({
        where: { id: cartItemId, user: { id: userId } },
        relations: ["product"],
      });

      if (!cartItem) {
        throw new Error("Cart item not found");
      }

      if (cartItem.product.stockQuantity < quantity) {
        throw new Error("Not enough stock available");
      }

      cartItem.quantity = quantity;
      return await cartRepo.save(cartItem);
    } catch (error) {
      console.error("Update cart item error:", error);
      throw error;
    }
  }

  static async removeFromCart(
    userId: string,
    cartItemId: string
  ): Promise<void> {
    try {
      const result = await cartRepo.delete({
        id: cartItemId,
        user: { id: userId },
      });

      if (result.affected === 0) {
        throw new Error("Cart item not found");
      }
    } catch (error) {
      console.error("Remove from cart error:", error);
      throw error;
    }
  }

  static async getCart(userId: string): Promise<{
    items: Cart[];
    total: number;
  }> {
    try {
      const items = await cartRepo.find({
        where: { user: { id: userId } },
        relations: ["product", "product.category"],
      });

      const total = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      return { items, total };
    } catch (error) {
      console.error("Get cart error:", error);
      throw error;
    }
  }

  static async clearCart(userId: string): Promise<void> {
    try {
      await cartRepo.delete({ user: { id: userId } });
    } catch (error) {
      console.error("Clear cart error:", error);
      throw error;
    }
  }

  static async validateCartItems(userId: string): Promise<{
    valid: boolean;
    invalidItems: { productId: string; reason: string }[];
  }> {
    try {
      const { items } = await this.getCart(userId);
      const invalidItems: { productId: string; reason: string }[] = [];

      for (const item of items) {
        const product = await productRepo.findOne({
          where: { id: item.product.id },
        });
        if (!product) {
          invalidItems.push({
            productId: item.product.id,
            reason: "Product no longer exists",
          });
          continue;
        }

        if (!product.isActive) {
          invalidItems.push({
            productId: product.id,
            reason: "Product is no longer available",
          });
          continue;
        }

        if (product.stockQuantity < item.quantity) {
          invalidItems.push({
            productId: product.id,
            reason: `Only ${product.stockQuantity} items available`,
          });
          continue;
        }
      }

      return {
        valid: invalidItems.length === 0,
        invalidItems,
      };
    } catch (error) {
      console.error("Validate cart error:", error);
      throw error;
    }
  }
}
