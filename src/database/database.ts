import "reflect-metadata";
import { DataSource, Repository } from "typeorm";
import {
  User,
  Product,
  Category,
  Order,
  OrderItem,
  Payment,
  Review,
  Cart,
  Discount,
  Wishlist,
} from "./entities";
import Constants from "../utils/constants";

let userRepo: Repository<User>;
let productRepo: Repository<Product>;
let categoryRepo: Repository<Category>;
let orderRepo: Repository<Order>;
let orderItemRepo: Repository<OrderItem>;
let paymentRepo: Repository<Payment>;
let reviewRepo: Repository<Review>;
let cartRepo: Repository<Cart>;
let discountRepo: Repository<Discount>;
let wishlistRepo: Repository<Wishlist>;

export async function initializeDatabase() {
  const dataSource = new DataSource({
    host: Constants.DB_HOST,
    username: Constants.DB_USER,
    password: Constants.DB_PASS,
    schema: "public",
    type: "postgres",
    database: "postgres",
    port: 6543,
    driver: require("pg"),
    ssl: false,
    entities: [
      User,
      Product,
      Category,
      Order,
      OrderItem,
      Payment,
      Review,
      Cart,
      Discount,
      Wishlist,
    ],
    synchronize: true, // Set to true when you want to sync DB fields and tables with codebase
  });
  await dataSource
    .initialize()
    .then(() => console.info("Database connected successfully"))
    .catch((err: Error) =>
      console.error("Error during database initialization", err)
    );

  userRepo = dataSource.getRepository(User);
  productRepo = dataSource.getRepository(Product);
  categoryRepo = dataSource.getRepository(Category);
  orderRepo = dataSource.getRepository(Order);
  orderItemRepo = dataSource.getRepository(OrderItem);
  paymentRepo = dataSource.getRepository(Payment);
  reviewRepo = dataSource.getRepository(Review);
  cartRepo = dataSource.getRepository(Cart);
  discountRepo = dataSource.getRepository(Discount);
  wishlistRepo = dataSource.getRepository(Wishlist);
}

export {
  userRepo,
  productRepo,
  categoryRepo,
  orderRepo,
  orderItemRepo,
  paymentRepo,
  reviewRepo,
  cartRepo,
  discountRepo,
  wishlistRepo,
};
