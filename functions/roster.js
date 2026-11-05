import Papa from "papaparse";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "./auth.js";
import { hashNormalizedId, idHmacKey, normalizeRosterId } from "./ids.js";

export const ROSTER_COLLECTION = "currentSchoolBody";
export const IMPORT_LOG_COLLECTION = "rosterImports";

const COLUMNS = {
  ID: null,
  AUGIE_EMAIL: "Email",
  LastName: "LastName",
  Pref_FirstName: "FirstName",
  PersonType: "PersonType",
  Class: "Class",
  Transfer: "Transfer",
  "Residence Hall": "Residence",
  International: "International",
};
const REQUIRED_HEADERS = Object.keys(COLUMNS);
const IGNORED_HEADERS = ["Gender", "Race", "Race_Desc"];
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 20000;
const MAX_FIELD_LENGTH = 100;
const MAX_REPORTED_ERRORS = 25;

/**
 * Parses and validates a roster CSV. Never includes names or IDs in errors,
 * only spreadsheet row numbers and the failing column.
 * @returns {{ people: Array<{id: string, record: object}>, errors: string[] }}
 */
export function parseRoster(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const errors = [];
  const headers = parsed.meta.fields ?? [];

  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  const unknown = headers.filter((h) => !REQUIRED_HEADERS.includes(h) && !IGNORED_HEADERS.includes(h));
  if (missing.length) errors.push(`Missing columns: ${missing.join(", ")}`);
  if (unknown.length) errors.push(`Unexpected columns: ${unknown.join(", ")}`);
  if (errors.length) return { people: [], errors };

  if (parsed.errors.length) {
    for (const e of parsed.errors.slice(0, MAX_REPORTED_ERRORS)) {
      errors.push(`Row ${(e.row ?? 0) + 2}: ${e.message}`);
    }
    return { people: [], errors };
  }
  if (parsed.data.length === 0) return { people: [], errors: ["The file has no data rows."] };
  if (parsed.data.length > MAX_ROWS) return { people: [], errors: [`Too many rows (max ${MAX_ROWS}).`] };

  const seen = new Map();
  const people = [];
  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors = [];
    const id = normalizeRosterId(row.ID);
    if (!id) rowErrors.push("ID is not a valid 7-digit or 00-prefixed 9-digit ID");

    const record = {};
    for (const [column, field] of Object.entries(COLUMNS)) {
      if (!field) continue;
      const value = String(row[column] ?? "").trim();
      if (value.length > MAX_FIELD_LENGTH) rowErrors.push(`${column} is too long`);
      record[field] = value;
    }
    record.Email = record.Email.toLowerCase().replace(/@augustana\.edu$/, "");
    if (!/^[a-z0-9._-]+$/.test(record.Email)) rowErrors.push("AUGIE_EMAIL must be an augustana.edu username");
    if (!record.FirstName && !record.LastName) rowErrors.push("name is empty");

    if (id && seen.has(id)) rowErrors.push(`same ID as row ${seen.get(id)}`);
    if (id && !seen.has(id)) seen.set(id, rowNumber);

    if (rowErrors.length) errors.push(`Row ${rowNumber}: ${rowErrors.join("; ")}`);
    else people.push({ id, record });
  });

  if (errors.length > MAX_REPORTED_ERRORS) {
    const extra = errors.length - MAX_REPORTED_ERRORS;
    errors.length = MAX_REPORTED_ERRORS;
    errors.push(`...and ${extra} more rows with errors.`);
  }
  return { people: errors.length ? [] : people, errors };
}

/**
 * Upserts every person, then deletes roster docs not in this import.
 * The roster is never empty mid-import; a failure leaves old and new records,
 * both of which are valid people.
 */
export async function writeRoster(db, people, key, meta) {
  const logRef = db.collection(IMPORT_LOG_COLLECTION).doc();
  const importId = logRef.id;
  await logRef.set({
    status: "running",
    startedAt: FieldValue.serverTimestamp(),
    importedBy: meta.importedBy,
    rowCount: people.length,
  });

  try {
    const keep = new Set();
    const writer = db.bulkWriter();
    for (const { id, record } of people) {
      const hashed = hashNormalizedId(id, key);
      keep.add(hashed);
      writer.set(db.collection(ROSTER_COLLECTION).doc(hashed), { ...record, ID: hashed, importId });
    }
    await writer.close();

    const existing = await db.collection(ROSTER_COLLECTION).select().get();
    const remover = db.bulkWriter();
    let removed = 0;
    for (const doc of existing.docs) {
      if (!keep.has(doc.id)) {
        remover.delete(doc.ref);
        removed++;
      }
    }
    await remover.close();

    const summary = { written: people.length, removed };
    await logRef.update({ status: "done", finishedAt: FieldValue.serverTimestamp(), ...summary });
    return { importId, ...summary };
  } catch (err) {
    await logRef.update({ status: "failed", finishedAt: FieldValue.serverTimestamp() });
    throw err;
  }
}

export const importRoster = onCall(
  { secrets: [idHmacKey], timeoutSeconds: 300, memory: "512MiB" },
  async (request) => {
    const caller = await requireAdmin(request);
    const csv = request.data?.csv;
    if (typeof csv !== "string" || !csv.trim()) {
      throw new HttpsError("invalid-argument", "csv must be a non-empty string.");
    }
    if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
      throw new HttpsError("invalid-argument", "File is too large.");
    }

    const { people, errors } = parseRoster(csv.replace(/^\uFEFF/, ""));
    if (errors.length) {
      return { ok: false, errors };
    }

    try {
      const result = await writeRoster(getFirestore(), people, idHmacKey.value(), { importedBy: caller.email });
      return { ok: true, ...result };
    } catch (err) {
      console.error("importRoster failed:", err.code || err.name);
      throw new HttpsError("internal", "Import failed partway. The previous roster is still in place; re-run the import.");
    }
  }
);
