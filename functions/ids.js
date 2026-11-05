import crypto from "crypto";
import { defineSecret } from "firebase-functions/params";

export const idHmacKey = defineSecret("ID_HMAC_KEY");

/**
 * Normalizes a roster ID to the canonical 7-digit form.
 * Excel strips leading zeros, so shorter values are left-padded.
 * Staff exports pad to 9 digits with a leading "00".
 * @returns {string|null} the 7-digit ID, or null if the value is not a valid ID.
 */
export function normalizeRosterId(raw) {
  const id = String(raw ?? "").trim();
  if (!/^\d{1,9}$/.test(id)) return null;
  if (id.length === 9) return id.startsWith("00") ? id.slice(2) : null;
  if (id.length === 8) return null;
  return id.padStart(7, "0");
}

/**
 * Normalizes a value typed or swiped at the front desk.
 * 16-character card reads carry the ID at positions 3-9.
 * @returns {string|null}
 */
export function normalizeSwipeId(raw) {
  const value = String(raw ?? "").trim();
  if (value.length === 16) {
    const id = value.slice(3, 10);
    return /^\d{7}$/.test(id) ? id : null;
  }
  if (value.length === 7 || value.length === 9) return normalizeRosterId(value);
  return null;
}

/**
 * SAFETY: the key must never leave Secret Manager. IDs have only 10^7 values,
 * so anyone holding the key can reverse every stored hash.
 */
export function hashNormalizedId(id, key) {
  if (!/^\d{7}$/.test(id)) throw new Error("hashNormalizedId expects a 7-digit ID");
  if (!key || key.length < 32) throw new Error("ID_HMAC_KEY is missing or too short");
  return crypto.createHmac("sha256", key).update(id).digest("hex");
}
