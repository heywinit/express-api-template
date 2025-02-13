import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";
import { Product } from "./product";

@Entity()
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.reviews)
  user: User;

  @ManyToOne(() => Product, (product) => product.reviews)
  product: Product;

  @Column("int")
  rating: number;

  @Column("text")
  comment: string;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ default: false })
  isVerifiedPurchase: boolean;

  @Column({ default: 0 })
  helpfulVotes: number;

  @Column({ default: 0 })
  unhelpfulVotes: number;

  @Column({ type: "text", nullable: true })
  adminReply: string;

  @Column({ type: "text", nullable: true })
  sellerReply: string;

  @Column({ nullable: true })
  replyDate: Date;

  @Column({ type: "simple-array", nullable: true })
  images: string[];

  @Column({ default: "pending" })
  status: "pending" | "approved" | "rejected";

  @Column({ type: "text", nullable: true })
  moderationNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
