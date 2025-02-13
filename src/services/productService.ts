import { productRepo, categoryRepo } from "../database/database";
import { Product } from "../database/entities";
import { DeleteResult, LessThan } from "typeorm";

export class ProductService {
  static async createProduct(data: {
    name: string;
    description: string;
    price: number;
    sku: string;
    stockQuantity: number;
    categoryId: string;
    images?: string[];
  }): Promise<Product> {
    try {
      const category = await categoryRepo.findOne({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new Error("Category not found");
      }

      const product = new Product();
      product.name = data.name;
      product.description = data.description;
      product.price = data.price;
      product.sku = data.sku;
      product.stockQuantity = data.stockQuantity;
      product.category = category;
      product.images = data.images || [];

      return await productRepo.save(product);
    } catch (error) {
      console.error("Product creation error:", error);
      throw error;
    }
  }

  static async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      sku: string;
      stockQuantity: number;
      categoryId: string;
      images: string[];
      isActive: boolean;
    }>
  ): Promise<Product> {
    try {
      const product = await productRepo.findOne({ where: { id } });
      if (!product) {
        throw new Error("Product not found");
      }

      if (data.categoryId) {
        const category = await categoryRepo.findOne({
          where: { id: data.categoryId },
        });
        if (!category) {
          throw new Error("Category not found");
        }
        product.category = category;
      }

      // Update product fields
      Object.assign(product, {
        ...data,
        category: data.categoryId ? product.category : undefined,
      });

      return await productRepo.save(product);
    } catch (error) {
      console.error("Product update error:", error);
      throw error;
    }
  }

  static async deleteProduct(id: string): Promise<DeleteResult> {
    try {
      return await productRepo.delete(id);
    } catch (error) {
      console.error("Product deletion error:", error);
      throw error;
    }
  }

  static async getProduct(id: string): Promise<Product> {
    try {
      const product = await productRepo.findOne({
        where: { id },
        relations: ["category", "reviews"],
      });
      if (!product) {
        throw new Error("Product not found");
      }
      return product;
    } catch (error) {
      console.error("Product fetch error:", error);
      throw error;
    }
  }

  static async getAllProducts(options: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }): Promise<{ products: Product[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = productRepo
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("product.reviews", "reviews");

      if (options.categoryId) {
        queryBuilder.andWhere("category.id = :categoryId", {
          categoryId: options.categoryId,
        });
      }

      if (options.search) {
        queryBuilder.andWhere(
          "(product.name ILIKE :search OR product.description ILIKE :search)",
          { search: `%${options.search}%` }
        );
      }

      if (options.minPrice !== undefined) {
        queryBuilder.andWhere("product.price >= :minPrice", {
          minPrice: options.minPrice,
        });
      }

      if (options.maxPrice !== undefined) {
        queryBuilder.andWhere("product.price <= :maxPrice", {
          maxPrice: options.maxPrice,
        });
      }

      if (options.inStock !== undefined) {
        queryBuilder.andWhere("product.stockQuantity > 0");
      }

      const [products, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return { products, total };
    } catch (error) {
      console.error("Products fetch error:", error);
      throw error;
    }
  }

  static async getProductAnalytics(): Promise<{
    totalProducts: number;
    outOfStock: number;
    lowStock: number;
    totalCategories: number;
  }> {
    try {
      const totalProducts = await productRepo.count();
      const outOfStock = await productRepo.count({
        where: { stockQuantity: 0 },
      });
      const lowStock = await productRepo.count({
        where: { stockQuantity: LessThan(10) },
      });
      const totalCategories = await categoryRepo.count();

      return {
        totalProducts,
        outOfStock,
        lowStock,
        totalCategories,
      };
    } catch (error) {
      console.error("Product analytics error:", error);
      throw error;
    }
  }
}
