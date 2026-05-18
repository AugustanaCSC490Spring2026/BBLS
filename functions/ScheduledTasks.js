//this file was created with google gemini
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize the Admin SDK natively
initializeApp();
const adminDb = getFirestore();

export const dailyUnbanTask = onSchedule({
  schedule: "0 0 * * *",        // 1. Sets it to 4:30 PM (16:30)
  timeZone: "America/Chicago",   // 2. Locks it to your local Central Time
}, async () => {    console.log("this is a test");
  try {
    // Server-side SDK uses the chainable collection() method directly on the db object
    const bannedRef = adminDb.collection("bannedStudents");
    const snapshot = await bannedRef.get();
    
    if (snapshot.empty) {
      console.log("No banned students found.");
      return;
    }

    const today = new Date().toLocaleDateString('en-CA');

    // Use a regular for...of loop for reliable async/await execution inside the function
    for (const doc of snapshot.docs) {
      const studentData = doc.data();
      if (today >= studentData.dateToBeUnbanned) {
        console.log(`Unbanning student ID: ${doc.id}`);
        await doc.ref.delete();
      }
    }

  } catch (error) {
    console.error("Error running scheduled unban:", error);
  }
});