import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Product } from "./product";
import { Category } from "./category";

export type DiscountType = "percentage" | "fixed" | "buy_x_get_y";
export type DiscountScope = "product" | "category" | "cart" | "user";

@Entity()
export class Discount {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column("text")
  description: string;

  @Column()
  code: string;

  @Column({
    type: "enum",
    enum: ["percentage", "fixed", "buy_x_get_y"],
    default: "percentage",
  })
  type: DiscountType;

  @Column({
    type: "enum",
    enum: ["product", "category", "cart", "user"],
    default: "product",
  })
  scope: DiscountScope;

  @Column("decimal", { precision: 10, scale: 2 })
  value: number;

  @Column({ nullable: true })
  minPurchaseAmount: number;

  @Column({ nullable: true })
  maxDiscountAmount: number;

  @Column({ default: -1 })
  usageLimit: number;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @ManyToMany(() => Product)
  @JoinTable()
  applicableProducts: Product[];

  @ManyToMany(() => Category)
  @JoinTable()
  applicableCategories: Category[];

  @Column({ type: "simple-array", nullable: true })
  applicableUserIds: string[];

  @Column({ type: "jsonb", nullable: true })
  conditions: {
    minItems?: number;
    maxItems?: number;
    requiredProducts?: string[];
    excludedProducts?: string[];
    userType?: string[];
    firstPurchaseOnly?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
