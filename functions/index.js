import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import crypto from "crypto";
import { dailyUnbanTask } from "./ScheduledTasks.js";
import { requireAuthorized } from "./auth.js";

setGlobalOptions({ maxInstances: 10 });

export const dailyUnban = dailyUnbanTask;
export { sendEmail } from "./Email.js";

export const hashStudentId = onCall(
  { secrets: ["SECRET_SALT"] },
  async (request) => {
    await requireAuthorized(request);

    const { rawId } = request.data;

    if (!rawId || typeof rawId !== "string") {
      throw new HttpsError("invalid-argument", "rawId must be a string");
    }

    const salt = process.env.SECRET_SALT;
    const hashed = crypto
      .createHash("sha256")
      .update(rawId + salt)
      .digest("hex");

    return { hashed };
  }
);
