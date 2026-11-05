import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { dailyUnbanTask } from "./ScheduledTasks.js";
import { requireAuthorized } from "./auth.js";
import { hashNormalizedId, idHmacKey, normalizeSwipeId } from "./ids.js";

setGlobalOptions({ maxInstances: 10 });

export const dailyUnban = dailyUnbanTask;
export { sendEmail } from "./Email.js";
export { importRoster } from "./roster.js";
export { analyticsSummary } from "./analytics.js";

export const hashStudentId = onCall(
  { secrets: [idHmacKey] },
  async (request) => {
    await requireAuthorized(request);

    const id = normalizeSwipeId(request.data?.rawId);
    if (!id) {
      throw new HttpsError("invalid-argument", "Invalid ID format");
    }

    return { hashed: hashNormalizedId(id, idHmacKey.value()) };
  }
);
