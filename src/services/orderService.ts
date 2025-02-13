import {
  orderRepo,
  orderItemRepo,
  productRepo,
  userRepo,
  cartRepo,
  paymentRepo,
} from "../database/database";
import { Order, OrderItem, Payment, User, Cart } from "../database/entities";
import { CartService } from "./cartService";
import { EntityManager, getManager } from "typeorm";

export class OrderService {
  static async createOrder(
    userId: string,
    data: {
      shippingAddress: string;
      paymentMethod: "credit_card" | "paypal" | "stripe" | "bank_transfer";
    }
  ): Promise<Order> {
    return getManager().transaction(
      async (transactionalEntityManager: EntityManager) => {
        try {
          // Validate cart
          const cartValidation = await CartService.validateCartItems(userId);
          if (!cartValidation.valid) {
            throw new Error(
              `Invalid cart items: ${cartValidation.invalidItems
                .map((item) => item.reason)
                .join(", ")}`
            );
          }

          // Get cart items
          const { items, total } = await CartService.getCart(userId);
          if (items.length === 0) {
            throw new Error("Cart is empty");
          }

          const user = await userRepo.findOne({ where: { id: userId } });
          if (!user) {
            throw new Error("User not found");
          }

          // Create order
          const order = new Order();
          order.user = user;
          order.shippingAddress = data.shippingAddress;
          order.totalAmount = total;
          order.status = "pending";

          const savedOrder = await transactionalEntityManager.save(
            Order,
            order
          );

          // Create order items and update product stock
          for (const cartItem of items) {
            const orderItem = new OrderItem();
            orderItem.order = savedOrder;
            orderItem.product = cartItem.product;
            orderItem.quantity = cartItem.quantity;
            orderItem.price = cartItem.product.price;
            await transactionalEntityManager.save(OrderItem, orderItem);

            // Update product stock
            const product = cartItem.product;
            product.stockQuantity -= cartItem.quantity;
            await transactionalEntityManager.save(product);
          }

          // Create initial payment record
          const payment = new Payment();
          payment.order = savedOrder;
          payment.amount = total;
          payment.status = "pending";
          payment.paymentMethod = data.paymentMethod;
          await transactionalEntityManager.save(Payment, payment);

          // Clear cart
          await transactionalEntityManager.delete(Cart, {
            user: { id: userId },
          });

          return savedOrder;
        } catch (error) {
          console.error("Order creation error:", error);
          throw error;
        }
      }
    );
  }

  static async updateOrderStatus(
    orderId: string,
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  ): Promise<Order> {
    try {
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["orderItems", "orderItems.product"],
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // If cancelling order, restore product stock
      if (status === "cancelled" && order.status !== "cancelled") {
        await getManager().transaction(async (transactionalEntityManager) => {
          for (const item of order.orderItems) {
            const product = item.product;
            product.stockQuantity += item.quantity;
            await transactionalEntityManager.save(product);
          }
          order.status = status;
          await transactionalEntityManager.save(order);
        });
      } else {
        order.status = status;
        await orderRepo.save(order);
      }

      return order;
    } catch (error) {
      console.error("Order status update error:", error);
      throw error;
    }
  }

  static async getOrder(orderId: string, userId: string): Promise<Order> {
    try {
      const order = await orderRepo.findOne({
        where: { id: orderId, user: { id: userId } },
        relations: [
          "user",
          "orderItems",
          "orderItems.product",
          "orderItems.product.category",
          "payments",
        ],
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      console.error("Get order error:", error);
      throw error;
    }
  }

  static async getUserOrders(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
    }
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = orderRepo
        .createQueryBuilder("order")
        .leftJoinAndSelect("order.orderItems", "orderItems")
        .leftJoinAndSelect("orderItems.product", "product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("order.payments", "payments")
        .where("order.user.id = :userId", { userId });

      if (options.status) {
        queryBuilder.andWhere("order.status = :status", {
          status: options.status,
        });
      }

      const [orders, total] = await queryBuilder
        .orderBy("order.createdAt", "DESC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return { orders, total };
    } catch (error) {
      console.error("Get user orders error:", error);
      throw error;
    }
  }

  static async getOrderAnalytics(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
  }> {
    try {
      const totalOrders = await orderRepo.count();

      const result = await orderRepo
        .createQueryBuilder("order")
        .select("SUM(order.totalAmount)", "totalRevenue")
        .addSelect("AVG(order.totalAmount)", "averageOrderValue")
        .getRawOne();

      const ordersByStatus = await orderRepo
        .createQueryBuilder("order")
        .select("order.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("order.status")
        .getRawMany();

      const statusCounts = ordersByStatus.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.status]: parseInt(curr.count),
        }),
        {}
      );

      return {
        totalOrders,
        totalRevenue: parseFloat(result.totalRevenue) || 0,
        averageOrderValue: parseFloat(result.averageOrderValue) || 0,
        ordersByStatus: statusCounts,
      };
    } catch (error) {
      console.error("Order analytics error:", error);
      throw error;
    }
  }
}
