import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { hashNormalizedId } from "../ids.js";
import { writeRoster, ROSTER_COLLECTION, IMPORT_LOG_COLLECTION } from "../roster.js";

const KEY = "k".repeat(32);
const skip = !process.env.FIRESTORE_EMULATOR_HOST && "needs the Firestore emulator";

const person = (id, FirstName) => ({ id, record: { FirstName, LastName: "T", Email: FirstName.toLowerCase() } });

test("writeRoster upserts, removes stale people, and logs the import", { skip }, async () => {
  initializeApp({ projectId: "demo-bbls" });
  const db = getFirestore();
  const roster = db.collection(ROSTER_COLLECTION);

  await db.collection(ROSTER_COLLECTION).doc("legacy-plain-id").set({ FirstName: "Old" });
  const first = await writeRoster(db, [person("1111111", "Ann"), person("2222222", "Bo")], KEY, { importedBy: "a@augustana.edu" });
  assert.deepEqual({ written: first.written, removed: first.removed }, { written: 2, removed: 1 });

  const second = await writeRoster(db, [person("2222222", "Bob"), person("3333333", "Cy")], KEY, { importedBy: "a@augustana.edu" });
  assert.deepEqual({ written: second.written, removed: second.removed }, { written: 2, removed: 1 });

  const docs = (await roster.get()).docs;
  assert.deepEqual(docs.map((d) => d.id).sort(), [hashNormalizedId("2222222", KEY), hashNormalizedId("3333333", KEY)].sort());
  const bob = (await roster.doc(hashNormalizedId("2222222", KEY)).get()).data();
  assert.equal(bob.FirstName, "Bob");
  assert.equal(bob.ID, hashNormalizedId("2222222", KEY));
  assert.equal(bob.importId, second.importId);

  const log = (await db.collection(IMPORT_LOG_COLLECTION).doc(second.importId).get()).data();
  assert.equal(log.status, "done");
  assert.equal(log.importedBy, "a@augustana.edu");
  assert.equal(log.removed, 1);
});
