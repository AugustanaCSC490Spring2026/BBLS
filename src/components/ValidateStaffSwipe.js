import  { doc, getDoc } from "firebase/firestore";
import { db } from "../Firebase.js";
import { hashId } from "./HashId.js";

async function ValidateStaffSwipe(swipe) {

  // defining vars for the return object.

  let swipeValid = null;

  let reasonSwipeDenied = "No reason given";

  let name = "No staff name";



  // trimming anything extra from the input

  swipe = swipe.trim();



  if (swipe.length !== 9 && swipe.length !== 16) {

    return {

      isValid: false,

      staffId: swipe,

      name: name,

      reasonDenied: "Invalid ID format"

    };

  }

  // if it's 9 we dont need to do anything

  // if its 16 we need to trim the extra characters off.

  else if (swipe.length == 16) { //;000775530=0087? staff id includes leading 0's unlike student ids, so we trim differently


    swipe = swipe.slice(1, 10);

  }



  // backend validation now that we know the ID number.

  try {

    const hashedId = await hashId(swipe);
    const staffSnap = await getDoc(doc(db, "currentStaff", hashedId));

    if (staffSnap.exists()) {

      name = staffSnap.data().FirstName + " " + staffSnap.data().LastName;

      swipeValid = true;

    }

    else {

      return {

        isValid: false,

        staffId: swipe,

        name: name,

        reasonDenied: "ID entered does not exist"

      };

    }

  }

  catch (error) {

    console.log("Error fetching staff data:", error);

    return {

      isValid: false,

      staffId: swipe,

      name: name,

      reasonDenied: "Error fetching staff data"

    };

  }



  // staff exists, checking if they are banned.



  return {

    isValid: swipeValid,

    staffId: swipe,

    name: name,

    reasonDenied: reasonSwipeDenied

  };

}



export default ValidateStaffSwipe;