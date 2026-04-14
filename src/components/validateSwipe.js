function validateSwipe(swipe){
    if (swipe.length !== 7 && swipe.length !== 16) {
      verified_data = swipe;
      swipeValid = false;
      reasonsSwipeDenied = "Invalid ID format";
    } else if (swipe.length == 7) {
      verified_data = swipe;
      docRef = await doc(db, "currentStudents", verified_data);
      await getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          console.log("valid ID");
          studentName = docSnap.data().FirstName + " " + docSnap.data().LastName;
          swipeValid = true;
        }
        else{
          swipeValid = false;
          reasonsSwipeDenied = "ID entered does not exist.";
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
    } else {
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