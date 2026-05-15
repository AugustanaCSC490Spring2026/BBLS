import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./Firebase.js";

const functions = getFunctions(app);
const hashStudentIdFn = httpsCallable(functions, "hashStudentId");

export async function hashId(rawId) {
  const result = await hashStudentIdFn({ rawId });
  return result.data.hashed;
}