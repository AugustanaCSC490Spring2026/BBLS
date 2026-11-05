import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, limit } from "firebase/firestore";

const ADMIN = "admin@augustana.edu";
const DESK = "desk@augustana.edu";
let env;

const as = (email, verified = true) =>
  env.authenticatedContext(email, { email, email_verified: verified }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-bbls",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "authorized_users", ADMIN), { isAdmin: true });
    await setDoc(doc(db, "authorized_users", DESK), { isAdmin: false });
    await setDoc(doc(db, "authorized_users", "outsider@gmail.com"), { isAdmin: true });
    await setDoc(doc(db, "currentSchoolBody", "h1"), { FirstName: "A", Email: "a" });
    await setDoc(doc(db, "bannedStudents", "h1"), { reasonBanned: "x" });
    await setDoc(doc(db, "pepsicoCenter", "s1"), { ID: "h1" });
    await setDoc(doc(db, "pepsicoEquipmentInventory", "ball"), { available: 3 });
    await setDoc(doc(db, "rosterImports", "i1"), { status: "done" });
  });
});

test("unverified, outside, and unlisted accounts get nothing", async () => {
  for (const db of [as(ADMIN, false), as("outsider@gmail.com"), as("stranger@augustana.edu"), env.unauthenticatedContext().firestore()]) {
    await assertFails(getDoc(doc(db, "currentSchoolBody", "h1")));
    await assertFails(addDoc(collection(db, "pepsicoCenter"), { ID: "h1" }));
    await assertFails(setDoc(doc(db, "authorized_users", "x@augustana.edu"), { isAdmin: true }));
  }
});

test("anyone signed in may read only their own allowlist entry", async () => {
  await assertSucceeds(getDoc(doc(as("stranger@augustana.edu"), "authorized_users", "stranger@augustana.edu")));
  await assertSucceeds(getDoc(doc(as(DESK), "authorized_users", DESK)));
  await assertFails(getDoc(doc(as(DESK), "authorized_users", ADMIN)));
});

test("front desk cannot change the allowlist or promote itself", async () => {
  const db = as(DESK);
  await assertFails(updateDoc(doc(db, "authorized_users", DESK), { isAdmin: true }));
  await assertFails(setDoc(doc(db, "authorized_users", "friend@augustana.edu"), { isAdmin: false }));
  await assertFails(getDocs(collection(db, "authorized_users")));
});

test("front desk looks up one person but cannot list or write the roster", async () => {
  const db = as(DESK);
  await assertSucceeds(getDoc(doc(db, "currentSchoolBody", "h1")));
  await assertSucceeds(getDoc(doc(db, "bannedStudents", "h1")));
  await assertFails(getDocs(collection(db, "currentSchoolBody")));
  await assertFails(getDocs(collection(db, "bannedStudents")));
  await assertFails(setDoc(doc(db, "currentSchoolBody", "h2"), { FirstName: "B" }));
  await assertFails(setDoc(doc(db, "bannedStudents", "h2"), { reasonBanned: "x" }));
});

test("front desk appends swipes but cannot read or rewrite logs", async () => {
  const db = as(DESK);
  await assertSucceeds(addDoc(collection(db, "pepsicoCenter"), { ID: "h1" }));
  await assertSucceeds(addDoc(collection(db, "guestEntrance"), { name: "g" }));
  await assertFails(getDocs(collection(db, "pepsicoCenter")));
  await assertFails(updateDoc(doc(db, "pepsicoCenter", "s1"), { ID: "h2" }));
  await assertFails(deleteDoc(doc(db, "pepsicoCenter", "s1")));
});

test("front desk checks equipment in and out", async () => {
  const db = as(DESK);
  await assertSucceeds(updateDoc(doc(db, "pepsicoEquipmentInventory", "ball"), { available: 2 }));
  const ref = await assertSucceeds(addDoc(collection(db, "pepsicoCheckouts"), { item: "ball" }));
  await assertSucceeds(updateDoc(ref, { returned: true }));
  await assertSucceeds(setDoc(doc(db, "checkoutHistory", ref.id), { item: "ball" }));
  await assertFails(getDocs(collection(db, "checkoutHistory")));
  await assertFails(deleteDoc(doc(db, "pepsicoEquipmentInventory", "ball")));
});

test("admins manage the allowlist and bans, and find one student at a time", async () => {
  const db = as(ADMIN);
  const roster = collection(db, "currentSchoolBody");
  await assertSucceeds(getDocs(collection(db, "authorized_users")));
  await assertSucceeds(setDoc(doc(db, "authorized_users", "new@augustana.edu"), { isAdmin: false }));
  await assertSucceeds(setDoc(doc(db, "bannedStudents", "h2"), { reasonBanned: "x" }));
  await assertSucceeds(getDocs(query(roster, where("Email", "==", "a"), limit(1))));
  await assertFails(getDocs(roster));
  await assertFails(getDocs(query(roster, limit(2))));
  await assertFails(getDocs(query(roster, where("Email", "==", "a"))));
});

test("swipe logs and checkout history are never read from the client", async () => {
  for (const db of [as(ADMIN), as(DESK)]) {
    await assertFails(getDocs(collection(db, "pepsicoCenter")));
    await assertFails(getDoc(doc(db, "pepsicoCenter", "s1")));
    await assertFails(getDocs(collection(db, "checkoutHistory")));
  }
});

test("nobody writes the roster or reads server-only collections from the client", async () => {
  const db = as(ADMIN);
  await assertFails(setDoc(doc(db, "currentSchoolBody", "h2"), { FirstName: "B" }));
  await assertFails(deleteDoc(doc(db, "currentSchoolBody", "h1")));
  await assertFails(getDoc(doc(db, "rosterImports", "i1")));
  await assertFails(getDocs(collection(db, "currentStaff")));
});

test("a mixed-case token email still matches its lowercase allowlist entry", async () => {
  await assertSucceeds(getDoc(doc(as("Desk@Augustana.edu"), "currentSchoolBody", "h1")));
});
