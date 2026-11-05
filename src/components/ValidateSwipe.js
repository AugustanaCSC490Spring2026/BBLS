import { doc, getDoc } from "firebase/firestore";
import { db } from "../Firebase.js";
import { hashId } from "./HashId.js";
import { withTimeout, TIMED_OUT } from "./withTimeout.js";

const LOOKUP_TIMEOUT_MS = 15000;



/**
 * 
 * want more attention to staff being able to swipe in normally rather than guest 
 * take ID's that stipped the 0
 * possible race conditions throgh await 
 * await 2 promises to save time banned & curent stuendnt
 * 
 * Handles ID validation through the format, existance of a student with that ID, and if that student is banned or not.
 * @param {string} swipe - The raw swipe ID string captured from the scanner.

 * @returns {Promise<{isValid: boolean, hashedId: string|null, name: string, reasonDenied: string, unavailable?: boolean}>}
 * unavailable is true when the ID could not be checked, so the swipe is neither accepted nor denied.
 * An object with multiple data points for different implementations within the project. 
 */


async function ValidateSwipe(swipe) {
  // defining vars for the return object.
  let swipeValid = null;
  let reasonSwipeDenied = "No reason given";
  let studentName = "No student name";

  // trimming anything extra from the input
  swipe = swipe.trim();

  // The server extracts the 7-digit ID from 7-, 9- and 16-character reads.
  if (swipe.length !== 7 && swipe.length !== 9 && swipe.length !== 16) {
    return {
      isValid: false,
      hashedId: null,
      name: studentName,
      reasonDenied: "Invalid ID format"
    };
  }

  // backend validation now that we know the ID number.
  let hashedId = null;
  try {
    const lookup = await withTimeout((async () => {
      const hashed = await hashId(swipe);
      const snaps = await Promise.all([
        getDoc(doc(db, "currentSchoolBody", hashed)),
        getDoc(doc(db, "bannedStudents", hashed)),
      ]);
      return { hashed, snaps };
    })(), LOOKUP_TIMEOUT_MS);
    if (lookup === TIMED_OUT) throw new Error("ID lookup timed out");

    hashedId = lookup.hashed;
    const [studentSnap, bannedSnap] = lookup.snaps;
    // student does exist, update variables
    // ben Amuller wrote lines 30 and 31
    if (studentSnap.exists()) {
      studentName = studentSnap.data().FirstName + " " + studentSnap.data().LastName;
      swipeValid = true;
    }
    // student doesnt exist in firebase so return
    else {
      return {
        isValid: false,
        hashedId,
        name: studentName,
        reasonDenied: "ID entered does not exist"
      };
    }


    // if student is banned, update variables
    // Ben Aumuller wrote lines 46 and 47
    if (bannedSnap.exists()) {
      studentName = bannedSnap.data().FirstName + " " + bannedSnap.data().LastName;
      swipeValid = false;
      reasonSwipeDenied = studentName + " is currently banned from entering Augustana Rec Facilities.";

      // sendEmail({
      //   to: "bengeorgia23@augustana.edu",
      //   subject: "Banned Student Attempted Entry",
      //   html: `<h1>Banned student, ${studentName}, attempted entry at ${now}</h1>`
      // }).catch((err) => {
      //   console.error("Failed to send ban alert email:", err);
      // });
    }

  }
  catch (error) {
    // The server read the ID and rejected its contents, which is a real denial.
    if (error.code === "functions/invalid-argument") {
      return {
        isValid: false,
        hashedId: null,
        name: studentName,
        reasonDenied: "Invalid ID format"
      };
    }
    console.error("Error fetching student data:", error);
    return {
      isValid: false,
      unavailable: true,
      hashedId,
      name: studentName,
      reasonDenied: "Check the connection and swipe again."
    };
  }

  // returning the accumulated data in an object  
  return {
    isValid: swipeValid,
    hashedId,
    name: studentName,
    reasonDenied: reasonSwipeDenied
  };
}

export default ValidateSwipe;
