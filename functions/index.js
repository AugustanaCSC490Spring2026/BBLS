const functions = require("firebase-functions");
const crypto = require("crypto");

exports.hashStudentId = functions.https.onCall(
  { secrets: ["SECRET_SALT"] },
  (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { rawId } = data;
    if (!rawId || typeof rawId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "rawId must be a string");
    }
    const salt = process.env.SECRET_SALT;
    const hashed = crypto.createHash("sha256").update(rawId + salt).digest("hex");
    return { hashed };
  }
);