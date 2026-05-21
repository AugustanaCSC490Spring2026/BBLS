//this file was created with google gemini
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createTransporter, gmailUser, gmailPass } from "./Email.js";


// Initialize the Admin SDK natively
initializeApp();
const adminDb = getFirestore();

export const dailyUnbanTask = onSchedule({
  schedule: "0 0 * * *",        // 1. Sets it to 4:30 PM (16:30)
  timeZone: "America/Chicago",   // 2. Locks it to your local Central Time
}, async () => {
  console.log("this is a test");
  try {
    // Server-side SDK uses the chainable collection() method directly on the db object
    const bannedRef = adminDb.collection("bannedStudents");
    const snapshot = await bannedRef.get();

    if (snapshot.empty) {
      console.log("No banned students found.");
      return;
    }

    const today = new Date().toLocaleDateString('en-CA');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
    const transporter = createTransporter();


    // Use a regular for...of loop for reliable async/await execution inside the function
    for (const doc of snapshot.docs) {
      const studentData = doc.data();
      if (tomorrowStr === studentData.dateToBeUnbanned) {
        transporter.sendMail({
          from: `"Campus Recreation" <${gmailUser.value()}>`,
          to: "bengeorgia23@augustana.edu",
          subject: "A student is unbanned from recreation facilities tomorrow",
          html: `<h1>${studentData.FirstName} ${studentData.LastName} is to be unbanned tomorrow. If there has been a mistake, please check and update the data in settings.</h1>`
        }).catch((err) => console.error(`Warning email failed for ${studentData.FirstName}:`, err));


      } else if (today >= studentData.dateToBeUnbanned) {
        console.log(`Unbanning student ID: ${doc.id}`);
        transporter.sendMail({
          from: `"Campus Recreation" <${gmailUser.value()}>`,
          to: `${studentData.Email}@augustana.edu`,
          subject: "Campus Recreation Unban",
          html: "<h1>You have been unbanned from campus recreation. Please be responsible moving forward.</h1>"
        }).catch((err) => console.error(`Unban email failed for ${studentData.FirstName}:`, err));
        await doc.ref.delete();

      }
    }

  } catch (error) {
    console.error("Error running scheduled unban:", error);
  }
});