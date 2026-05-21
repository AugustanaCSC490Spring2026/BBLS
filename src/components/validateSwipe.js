import { doc, getDoc } from "firebase/firestore";
import { db } from "../Firebase.js";
import { hashId } from "./HashId.js";
import { getFunctions, httpsCallable } from "firebase/functions";



/**
 * 
 * want more attention to staff being able to swipe in normally rather than guest 
 * take ID's that stipped the 0
 * possible race conditions throgh await 
 * await 2 promises to save time banned & curent stuendnt
 * 
 * Handles ID validation through the format, existance of a student with that ID, and if that student is banned or not.
 * @param {string} swipe - The raw swipe ID string captured from the scanner.

 * @returns {Promise<{isValid: boolean, studentId: string, name: string, reasonDenied: string}>}
 * An object with multiple data points for different implementations within the project. 
 */


async function ValidateSwipe(swipe) {
  // defining vars for the return object.
  let swipeValid = null;
  let reasonSwipeDenied = "No reason given";
  let studentName = "No student name";

  // trimming anything extra from the input
  swipe = swipe.trim();

  // if its not 7 and not 16 characters long, its invalid.
  if (swipe.length !== 7 && swipe.length !== 16) {
    return {
      isValid: false,
      studentId: swipe,
      name: studentName,
      reasonDenied: "Invalid ID format"
    };
  }
  // if it's 7 we dont need to do anything
  // if its 16 we need to trim the extra characters off.
  else if (swipe.length == 16) {
    swipe = swipe.slice(3, 10);
  }

  // backend validation now that we know the ID number.
  try {
    const hashedId = await hashId(swipe);

    const studentSnapPromise = getDoc(doc(db, "currentStudents", hashedId));
    const bannedSnapPromise = getDoc(doc(db, "bannedStudents", hashedId));
    const functions = getFunctions();
    const sendEmail = httpsCallable(functions, "sendEmail");

    const [studentSnap, bannedSnap] = await Promise.all([studentSnapPromise, bannedSnapPromise]);
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
        studentId: swipe,
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

      const now = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

      sendEmail({
        to: "bengeorgia23@augustana.edu",
        subject: "Banned Student Attempted Entry",
        html: `<h1>Banned student, ${studentName}, attempted entry at ${now}</h1>`
      }).catch((err) => {
        console.error("Failed to send ban alert email:", err);
      });
    }

  }
  // if there was any error checking data from firebase, send back invalid so that the student re swipes
  catch (error) {
    console.log("Error fetching student data:", error);
    return {
      isValid: false,
      studentId: swipe,
      name: studentName,
      reasonDenied: "Error fetching student data"
    };
  }

  // returning the accumulated data in an object  
  return {
    isValid: swipeValid,
    studentId: swipe,
    name: studentName,
    reasonDenied: reasonSwipeDenied
  };
}

export default ValidateSwipe;
