import nodemailer from "nodemailer";
import constants from "./constants";

export function generateOTP(): string {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  host: constants.SMTP_HOST,
  port: constants.SMTP_PORT,
  secure: true,
  auth: {
    user: constants.SMTP_USER,
    pass: constants.SMTP_PASS,
  },
});

export async function sendOTPByEmail(
  email: string,
  otp: string
): Promise<void> {
  const mailOptions = {
    from: constants.SMTP_FROM,
    to: email,
    subject: "Your OTP for Swankiz",
    html: `
      <h1>Welcome to Swankiz</h1>
      <p>Your OTP is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
}
