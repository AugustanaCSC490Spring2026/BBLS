<<<<<<< HEAD
/* eslint-disable */
/**
 * Import function triggers from their respective submodules:
 *
 * 
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


import { setGlobalOptions } from "firebase-functions";
//const {onRequest} = require("firebase-functions/https");
//const logger = require("firebase-functions/logger");

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
setGlobalOptions({ maxInstances: 10 });
// /functions/index.js
import { dailyUnbanTask } from "./ScheduledTasks.js";

export const dailyUnban = dailyUnbanTask;


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
=======
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const crypto = require("crypto");

exports.hashStudentId = onCall(
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
>>>>>>> 8edee8e05287dc143b6e8bd83f24d7c865742fb4
