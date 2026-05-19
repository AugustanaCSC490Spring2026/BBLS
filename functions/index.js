/* eslint-disable */
/**
 * Import function triggers from their respective submodules:
 *
 * 
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


//import {onRequest} from "firebase-functions/https";
//import logger from "firebase-functions/logger";

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.

import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import crypto from "crypto";
import { dailyUnbanTask } from "./ScheduledTasks.js";

// Set global configuration options
setGlobalOptions({ maxInstances: 10 });

// Export the function so the Firebase CLI can find it
export const dailyUnban = dailyUnbanTask;
export { sendEmail } from "./Email.js";

export const hashStudentId = onCall(
  { secrets: ["SECRET_SALT"] },
  (request) => {
    // v2 uses request.auth instead of context.auth
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

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