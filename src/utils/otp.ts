import formData from "form-data";
import Mailgun from "mailgun.js";
import constants from "./constants";

export function generateOTP(): string {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Initialize Mailgun with debug logging
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: constants.MAIL_GUN_API_KEY,
  url: "https://api.mailgun.net", // Explicitly set API URL
});

// Debug logging
console.log("Mailgun Configuration:");
console.log("API Key:", constants.MAIL_GUN_API_KEY.substring(0, 8) + "...");
console.log("Domain:", constants.MAILGUN_DOMAIN);

export async function sendOTPByEmail(
  email: string,
  otp: string
): Promise<void> {
  const messageData = {
    from: `Swankiz <postmaster@${constants.MAILGUN_DOMAIN}>`, // Updated sender
    to: [email],
    subject: "Your OTP for Swankiz",
    text: `Your OTP is: ${otp}. This OTP will expire in 10 minutes.`,
    html: `
      <h1>Welcome to Swankiz</h1>
      <p>Your OTP is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
    `,
  };

  try {
    const result = await mg.messages.create(
      constants.MAILGUN_DOMAIN,
      messageData
    );
    console.log("Email sent successfully:", result);
  } catch (error: any) {
    console.error("Failed to send OTP email:");
    console.error("Status:", error.status);
    console.error("Message:", error.message);
    if (error.details) {
      console.error("Details:", error.details);
    }
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
