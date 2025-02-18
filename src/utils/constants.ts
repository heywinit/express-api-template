import dotenv from "dotenv";

dotenv.config();

export default {
  JWT_SECRET: process.env.JWT_SECRET,

  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,

  INFO_WEBHOOK: process.env.INFO_WEBHOOK,
  ERROR_WEBHOOK: process.env.ERROR_WEBHOOK,

  PORT: process.env.PORT || 3000,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_GUN_API_KEY: process.env.MAIL_GUN_API_KEY || "",
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || "swankiz.co.in",
};
