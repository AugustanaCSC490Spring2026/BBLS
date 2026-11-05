import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const ALLOWED_DOMAIN = "augustana.edu";

export function isAllowedAccount(email, emailVerified) {
  return emailVerified === true
    && typeof email === "string"
    && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

/**
 * Verifies the caller of a callable function is a signed-in, verified
 * @augustana.edu account listed in authorized_users.
 * @returns {Promise<{email: string, isAdmin: boolean}>}
 */
export async function requireAuthorized(request, db = getFirestore()) {
  const token = request.auth?.token;
  if (!token?.email) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }
  const email = token.email.toLowerCase();
  if (!isAllowedAccount(email, token.email_verified)) {
    throw new HttpsError("permission-denied", "Not an authorized user.");
  }
  const snap = await db.doc(`authorized_users/${email}`).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "Not an authorized user.");
  }
  return { email, isAdmin: snap.data()?.isAdmin === true };
}

export async function requireAdmin(request, db = getFirestore()) {
  const caller = await requireAuthorized(request, db);
  if (!caller.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return caller;
}
