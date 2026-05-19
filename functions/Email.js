import nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";

export const gmailUser = defineSecret("GMAIL_USER");
export const gmailPass = defineSecret("GMAIL_APP_PASSWORD");

export const createTransporter = () => nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser.value(),
    pass: gmailPass.value(),
  }
});