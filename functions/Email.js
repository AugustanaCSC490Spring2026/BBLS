import nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const gmailUser = defineSecret("GMAIL_USER");
export const gmailPass = defineSecret("GMAIL_APP_PASSWORD");

export const createTransporter = () => nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser.value(),
    pass: gmailPass.value(),
  }
});

export const sendEmail = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { to, subject, html } = request.data;

    const transporter = createTransporter();

    try {
      await transporter.sendMail({
        from: `"Campus Recreation" <${gmailUser.value()}>`,
        to,
        subject,
        html
      });
      return { success: true };
    } catch (error) {
      throw new HttpsError("internal", error.message);
    }
  }
);