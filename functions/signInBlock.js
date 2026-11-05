import { beforeUserCreated, beforeUserSignedIn, HttpsError } from "firebase-functions/v2/identity";
import { isAllowedAccount } from "./auth.js";

/**
 * Stops accounts outside the allowed domain before Firebase Auth stores them
 * or issues a token. Throws for a rejected account, returns nothing otherwise.
 */
export function rejectOutsideAccount(event) {
  if (!isAllowedAccount(event.data?.email, event.data?.emailVerified)) {
    throw new HttpsError("permission-denied", "Use your Augustana College Google account.");
  }
}

export const blockOutsideSignUp = beforeUserCreated({ region: "us-central1" }, rejectOutsideAccount);
export const blockOutsideSignIn = beforeUserSignedIn({ region: "us-central1" }, rejectOutsideAccount);
