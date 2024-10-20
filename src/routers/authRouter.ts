import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";

import constants from "../utils/constants";
import { userRepo } from "../database/database";

const router = express.Router();
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if identifier (username or email) and password are provided
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        success: false,
      });
    }

    // Determine if the identifier is an email or a username
    let user = await userRepo.findOne({ where: { email: email } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User does not exist", success: false });
    }

    // Validate password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res
        .status(401)
        .json({ message: "Invalid credentials", success: false });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      constants.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return user details and token
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
      success: true,
    });
  } catch (e) {
    console.error("Login error:", e);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

export default router;
