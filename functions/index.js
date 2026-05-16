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