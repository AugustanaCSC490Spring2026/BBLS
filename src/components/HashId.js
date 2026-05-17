import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../Firebase.js";

const functionsInstance = getFunctions(app, "us-central1");
const hashStudentIdFn = httpsCallable(functionsInstance, "hashStudentId");

export async function hashId(rawId) {
  const result = await hashStudentIdFn({ rawId });
  return result.data.hashed;
}