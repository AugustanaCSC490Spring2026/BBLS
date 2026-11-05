import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRosterId, normalizeSwipeId, hashNormalizedId } from "../ids.js";
import { parseRoster, writeRoster } from "../roster.js";

const HEADER = "ID,AUGIE_EMAIL,LastName,Pref_FirstName,PersonType,Class,Transfer,Residence Hall,International,Gender,Race,Race_Desc";
const KEY = "k".repeat(32);

test("roster IDs normalize to 7 digits", () => {
  assert.equal(normalizeRosterId("0111111"), "0111111");
  assert.equal(normalizeRosterId("111111"), "0111111");
  assert.equal(normalizeRosterId("001111111"), "1111111");
  assert.equal(normalizeRosterId(" 0775530 "), "0775530");
  for (const bad of ["", "12345678", "121111111", "12a4567", "1234567890", null]) {
    assert.equal(normalizeRosterId(bad), null, String(bad));
  }
});

test("swipe and import agree on the same person", () => {
  assert.equal(normalizeSwipeId("001111111"), normalizeRosterId("001111111"));
  assert.equal(normalizeSwipeId("0111111"), normalizeRosterId("111111"));
  assert.equal(normalizeSwipeId("abc0111111xyz123"), "0111111");
  assert.equal(normalizeSwipeId("12345"), null);
});

test("hash is keyed and rejects weak keys", () => {
  assert.notEqual(hashNormalizedId("0111111", KEY), hashNormalizedId("0111111", "x".repeat(32)));
  assert.throws(() => hashNormalizedId("0111111", "short"));
  assert.throws(() => hashNormalizedId("111111", KEY));
});

test("valid roster parses, ignores Gender/Race, lowercases email", () => {
  const { people, errors } = parseRoster(`${HEADER}\n0111111,TestStudent01,student,test,Student,SR,Yes,TLA,Domestic,F,X,Y\n001111111,teststaff02,staff,test,staff,,,Recreation,,,,`);
  assert.deepEqual(errors, []);
  assert.equal(people.length, 2);
  assert.equal(people[0].record.Email, "teststudent01");
  assert.equal(people[1].id, "1111111");
  assert.ok(!("Gender" in people[0].record) && !("Race" in people[0].record));
});

test("any bad row rejects the whole file without leaking names", () => {
  const { people, errors } = parseRoster(`${HEADER}\n0111111,a,Secretname,x,Student,SR,,,,,,\n12,b,Other,y,Student,SR,,,,,,\n111111,c,Dup,z,Student,SR,,,,,,`);
  assert.equal(people.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^Row 4: same ID as row 2/);
  assert.ok(errors.every((e) => !e.includes("Secretname")));
});

test("missing or unknown columns are rejected", () => {
  assert.match(parseRoster("ID,Email\n1,a").errors.join(" "), /Missing columns/);
  assert.match(parseRoster(`${HEADER},SSN\n0111111,a,b,c,,,,,,,,,1`).errors.join(" "), /Unexpected columns: SSN/);
});

test("a failed roster write stops the import before anyone is removed", async () => {
  const deleted = [];
  const log = {};
  const db = {
    collection: (name) => ({
      doc: (id) => (name === "rosterImports"
        ? { id: "log1", set: async (d) => Object.assign(log, d), update: async (d) => Object.assign(log, d) }
        : { id }),
      select: () => ({ get: async () => ({ docs: [{ id: "someone-old", ref: "someone-old" }] }) }),
    }),
    bulkWriter: () => ({
      set: () => Promise.reject(new Error("write failed")),
      delete: (ref) => { deleted.push(ref); return Promise.resolve(); },
      close: async () => {},
    }),
  };
  const people = [{ id: "0111111", record: { FirstName: "A" } }];

  await assert.rejects(writeRoster(db, people, KEY, { importedBy: "a@augustana.edu" }), /1 of 1 roster writes failed/);
  assert.deepEqual(deleted, []);
  assert.equal(log.status, "failed");
});
