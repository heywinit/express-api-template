import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";
import { Product } from "./product";

@Entity()
export class Wishlist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.wishlistItems)
  user: User;

  @ManyToOne(() => Product)
  product: Product;

  @Column({ default: false })
  notifyOnPriceChange: boolean;

  @Column({ default: false })
  notifyOnAvailability: boolean;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  priceThreshold: number;

  @Column({ nullable: true })
  addedFromIp: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    source?: string;
    notes?: string;
    shareCount?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
