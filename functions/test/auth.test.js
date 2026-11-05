import { test } from "node:test";
import assert from "node:assert/strict";
import { requireAuthorized, requireAdmin } from "../auth.js";
import { validateEmailRequest } from "../Email.js";
import { rejectOutsideAccount } from "../signInBlock.js";

const fakeDb = (users) => ({
  doc: (path) => ({
    get: async () => {
      const id = path.split("/")[1];
      return { exists: id in users, data: () => users[id] };
    },
  }),
});

const db = fakeDb({
  "staff@augustana.edu": { isAdmin: false },
  "boss@augustana.edu": { isAdmin: true },
  "outsider@gmail.com": { isAdmin: true },
});

const req = (email, verified = true) => ({ auth: { token: { email, email_verified: verified } } });

const code = (c) => (err) => err.code === c;

test("rejects unauthenticated callers", async () => {
  await assert.rejects(requireAuthorized({}, db), code("unauthenticated"));
});

test("rejects non-augustana accounts even if listed", async () => {
  await assert.rejects(requireAuthorized(req("outsider@gmail.com"), db), code("permission-denied"));
});

test("rejects unverified emails", async () => {
  await assert.rejects(requireAuthorized(req("staff@augustana.edu", false), db), code("permission-denied"));
});

test("rejects augustana accounts not in authorized_users", async () => {
  await assert.rejects(requireAuthorized(req("random@augustana.edu"), db), code("permission-denied"));
});

test("accepts listed staff, case-insensitively", async () => {
  assert.deepEqual(await requireAuthorized(req("Staff@Augustana.edu"), db), { email: "staff@augustana.edu", isAdmin: false });
});

test("requireAdmin rejects non-admin staff and accepts admins", async () => {
  await assert.rejects(requireAdmin(req("staff@augustana.edu"), db), code("permission-denied"));
  assert.equal((await requireAdmin(req("boss@augustana.edu"), db)).isAdmin, true);
});

test("sign-in block lets verified augustana accounts through, case-insensitively", () => {
  assert.equal(rejectOutsideAccount({ data: { email: "Staff@Augustana.edu", emailVerified: true } }), undefined);
});

test("sign-in block rejects other domains, lookalikes, unverified and missing emails", () => {
  const rejected = [
    { email: "outsider@gmail.com", emailVerified: true },
    { email: "a@augustana.edu.evil.com", emailVerified: true },
    { email: "a@notaugustana.edu", emailVerified: true },
    { email: "staff@augustana.edu", emailVerified: false },
    { email: "staff@augustana.edu" },
    { emailVerified: true },
    undefined,
  ];
  for (const data of rejected) {
    assert.throws(() => rejectOutsideAccount({ data }), code("permission-denied"));
  }
});

test("email recipients must be one augustana address", () => {
  const ok = { subject: "Hi", html: "<p>x</p>" };
  assert.equal(validateEmailRequest({ ...ok, to: "Student1@augustana.edu" }).to, "student1@augustana.edu");
  for (const to of ["a@gmail.com", "a@augustana.edu, b@gmail.com", "a@augustana.edu.evil.com", "", 5]) {
    assert.throws(() => validateEmailRequest({ ...ok, to }), code("invalid-argument"));
  }
});

test("email subject rejects header injection and length abuse", () => {
  const base = { to: "a@augustana.edu", html: "x" };
  assert.throws(() => validateEmailRequest({ ...base, subject: "a\r\nBcc: x@y.com" }), code("invalid-argument"));
  assert.throws(() => validateEmailRequest({ ...base, subject: "s".repeat(201) }), code("invalid-argument"));
  assert.throws(() => validateEmailRequest({ ...base, subject: "ok", html: "h".repeat(10001) }), code("invalid-argument"));
});
