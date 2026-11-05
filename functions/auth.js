import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const ALLOWED_DOMAIN = "augustana.edu";

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
  if (token.email_verified !== true || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
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
