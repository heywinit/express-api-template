import { userRepo } from "../database/database";
import { User } from "../database/entities";
import { generateOTP, sendOTPByEmail } from "../utils/otp";
import jwt from "jsonwebtoken";
import constants from "../utils/constants";
import { LessThan } from "typeorm";

export class AuthService {
  static async initiateRegistration(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user already exists and is verified
      const existingUser = await userRepo.findOne({ where: { email } });
      if (existingUser && existingUser.isVerified) {
        return { success: false, message: "Email already registered" };
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

      // Create or update user
      const user = existingUser || new User();
      user.email = email;
      user.otpSecret = otp;
      user.otpExpiry = otpExpiry;
      user.isVerified = false;

      await userRepo.save(user);

      // Send OTP via email
      await sendOTPByEmail(email, otp);

      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      console.error("Registration initiation error:", error);
      return { success: false, message: "Failed to initiate registration" };
    }
  }

  static async verifyOTP(
    email: string,
    otp: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      const user = await userRepo.findOne({
        where: {
          email,
          otpSecret: otp,
          otpExpiry: LessThan(new Date()),
          isActive: true,
        },
      });

      if (!user) {
        return { success: false, message: "Invalid or expired OTP" };
      }

      // Mark user as verified and clear OTP
      user.isVerified = true;
      user.otpSecret = null;
      user.otpExpiry = null;
      user.lastLoginAt = new Date();
      await userRepo.save(user);

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        constants.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return {
        success: true,
        message: "OTP verified successfully",
        token,
      };
    } catch (error) {
      console.error("OTP verification error:", error);
      return { success: false, message: "Failed to verify OTP" };
    }
  }

  static async login(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await userRepo.findOne({
        where: {
          email,
          isVerified: true,
          isActive: true,
        },
      });

      if (!user) {
        return { success: false, message: "User not found or not verified" };
      }

      // Generate and send new OTP
      const otp = generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

      user.otpSecret = otp;
      user.otpExpiry = otpExpiry;
      await userRepo.save(user);

      // Send OTP via email
      await sendOTPByEmail(email, otp);

      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Failed to initiate login" };
    }
  }

  static async createAdmin(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const existingUser = await userRepo.findOne({ where: { email } });
      if (existingUser) {
        return { success: false, message: "Email already registered" };
      }

      const user = new User();
      user.email = email;
      user.role = "admin";
      user.isVerified = false;
      await userRepo.save(user);

      // Initiate OTP verification
      return this.initiateRegistration(email);
    } catch (error) {
      console.error("Admin creation error:", error);
      return { success: false, message: "Failed to create admin" };
    }
  }
}
