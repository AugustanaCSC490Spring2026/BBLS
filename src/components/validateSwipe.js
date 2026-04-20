async function ValidateSwipe(swipe, getDoc, doc, db){
  // defining vars for the return object.
  let swipeValid = null;
  let reasonSwipeDenied = "No reason given";
  let studentName = "No student name";

  // trimming anything extra from the input
  swipe = swipe.trim();

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
  try{
    const studentSnap = await getDoc(doc(db, "currentStudents", swipe));
    if (studentSnap.exists()) {
      studentName = studentSnap.data().FirstName + " " + studentSnap.data().LastName;
      swipeValid = true;  
    }
    else{
      return {
        isValid: false,
        studentId: swipe,
        name: studentName,
        reasonDenied: "ID entered does not exist"
      };
    }
    const bannedSnap = await getDoc(doc(db, "bannedStudents", swipe));
      if (bannedSnap.exists()) {
      studentName = bannedSnap.data().FirstName + " " + bannedSnap.data().LastName;
      console.log("banned user");
      swipeValid = false;
      reasonSwipeDenied = studentName + " is currently banned from entering Augustana Rec Facilities.";
    }

  }
  catch (error){
    console.log("Error fetching student data:", error);
    return {
      isValid: false,
      studentId: swipe,
      name: studentName,
      reasonDenied: "Error fetching student data"
    };
  }
  
  // student exists, checking if they are banned.
  
  return {
  isValid: swipeValid,
  studentId: swipe,
  name: studentName,
  reasonDenied: reasonSwipeDenied
  };
}

export default ValidateSwipe;
  