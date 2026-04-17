async function ValidateSwipe(swipe, getDoc, doc, db){


    // trimming anything extra from the input
    swipe = swipe.trim();
    // if the input is not 7 or 16 char long then it is invalid. 
    if (swipe.length !== 7 && swipe.length !== 16) {
      return [false, "Invalid ID format"];
    } 

    // if the input is 7 char long it is just the ID number.
    else if (swipe.length == 7) {
        //backend validation that the student exists. 
      await getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          studentName = docSnap.data().FirstName + " " + docSnap.data().LastName;
        } else{
          return [false, "ID not associated with a student"];
        }
      })
      // student exists, checking if they are banned. 
      docRef = doc(db, "bannedStudents", verified_data);
      await getDoc(docRef).then((docSnap) =>{
        if (docSnap.exists()){
          studentName = docSnap.data().FirstName + " " + docSnap.data().LastName;
          console.log("banned user");
          swipeValid = false;
          reasonsSwipeDenied = studentName + " is currently banned from entering Augustana Rec Facilities.";
        }
      })
    } 

    // this input is 16 char long so it is a swipe. 
    else {
      verified_data = temp_input.slice(3, 10);
      docRef = await doc(db, "currentStudents", verified_data);
      await getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          studentName = docSnap.data().FirstName + " " + docSnap.data().LastName;
          console.log("valid ID");
          swipeValid = true;
        }
        else{
          swipeValid = false;
          reasonsSwipeDenied = "ID entered does not exist";
        }
      })
      docRef = doc(db, "bannedStudents", verified_data);
      await getDoc(docRef).then((docSnap) =>{
        if (docSnap.exists()){
          studentName = docSnap.data().FirstName + " " + docSnap.data().LastName;
          console.log("banned user");
          swipeValid = false;
          reasonsSwipeDenied = studentName + " is currently banned from entering Augustana Rec Facilities.";
        }
      })
    }
}