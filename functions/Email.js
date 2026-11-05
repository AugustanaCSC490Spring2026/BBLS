import nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ALLOWED_DOMAIN, requireAdmin } from "./auth.js";

export const gmailUser = defineSecret("GMAIL_USER");
export const gmailPass = defineSecret("GMAIL_APP_PASSWORD");

const MAX_SUBJECT = 200;
const MAX_HTML = 10000;

export const createTransporter = () => nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser.value(),
    pass: gmailPass.value(),
  }
});

export function validateEmailRequest(data) {
  const { to, subject, html } = data ?? {};
  if (typeof to !== "string" || typeof subject !== "string" || typeof html !== "string") {
    throw new HttpsError("invalid-argument", "to, subject, and html must be strings.");
  }
  const recipient = to.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@augustana\.edu$/.test(recipient)) {
    throw new HttpsError("invalid-argument", `Recipient must be a single @${ALLOWED_DOMAIN} address.`);
  }
  if (!subject.trim() || subject.length > MAX_SUBJECT || /[\r\n]/.test(subject)) {
    throw new HttpsError("invalid-argument", "Invalid subject.");
  }
  if (html.length > MAX_HTML) {
    throw new HttpsError("invalid-argument", "Message too long.");
  }
  return { to: recipient, subject: subject.trim(), html };
}

export const sendEmail = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    await requireAdmin(request);
    const { to, subject, html } = validateEmailRequest(request.data);

    try {
      await createTransporter().sendMail({
        from: `"Campus Recreation" <${gmailUser.value()}>`,
        to,
        subject,
        html
      });
      return { success: true };
    } catch (error) {
      console.error("sendEmail failed:", error.code || error.name);
      throw new HttpsError("internal", "Email could not be sent.");
    }
  }
);
