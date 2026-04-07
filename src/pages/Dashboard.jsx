import React, { useState, useRef, useEffect } from "react";
import { db } from "../Firebase.js";
import { useLocation } from 'react-router-dom';

// NEW: added serverTimestamp for accurate backend time
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";

import Navbar from "./Navigation.jsx";
import "../components/Dashboard.css";
import { FunnelChart } from "recharts";
import GuestPopup from "../components/GuestTab.jsx";

const pepsicoCenterRef = collection(db, 'pepsicoCenter')
const westerlinGymRef = collection(db, 'westerlinGym')
const invalidSwipeInRef = collection(db, 'invalidSwipeIns');
const currentStudentsRef = collection(db, "currentStudents");
const bannedStudentsRef = collection(db, "bannedStudents");


const guestEntranceRef = collection(db, "guestEntrance");

function Dashboard( {gym, updateGym } ) {
  const [isGuestPopupOpen, setIsGuestPopupOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const inputRef = useRef(null);
  const locationState = useLocation();
  const pickedGym = locationState.state?.gym || "None Selected";

  // Auto-focus on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  

  // Keeps input focused every 5 seconds
  useEffect(() => {
    // If the guest popup is open, don't start the interval
    if (isGuestPopupOpen) return;

    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 5000);

    return () => clearInterval(focusInterval);
  }, [isGuestPopupOpen]); 

  const handleKeyDown = (input) => {
    if (input.key === "Enter") {
      input.preventDefault();
      handleSubmission();
    }
  };

  const handleSubmission = async (event) => {
    if (event) event.preventDefault();

    const temp_input = studentId.trim();
    setStudentId(temp_input);

    let verified_data;
    let swipeValid = false;
    let reasonsSwipeDenied;
    let docRef;
    let studentName;


    // Validate ID
    if (temp_input.length !== 7 && temp_input.length !== 16) {
      verified_data = temp_input;
      swipeValid = false;
      reasonsSwipeDenied = "invalid ID format";
    } else if (temp_input.length == 7) {
      verified_data = temp_input;
      docRef = await doc(db, "currentStudents", verified_data);
      await getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          console.log("valid ID");
          studentName = docSnap.data().Name;
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
          studentName = docSnap.data().Name;
          console.log("banned user");
          swipeValid = false;
          reasonsSwipeDenied = studentName + " is currently banned from entering Augustan Rec Facilities";
        }
      })
    } else {
      verified_data = temp_input.slice(3, 10);
      docRef = await doc(db, "currentStudents", verified_data);
      await getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          studentName = docSnap.data().Name;
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
          studentName = docSnap.data().Name;
          console.log("banned user");
          swipeValid = false;
          reasonsSwipeDenied = studentName + " is currently banned from entering Augustan Rec Facilities";
        }
      })
    }

    try {
      // CHANGED: using serverTimestamp instead of string date
      // This allows Firebase to store a real timestamp, so we can filter in analytics.jsx (written with ChatGPT)
      storeSwipeIn(gym, swipeValid, verified_data, serverTimestamp(), reasonsSwipeDenied, studentName);
    } catch (err) {
      console.error("Error saving swipe:", err);
    }

    setStudentId("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

  }
  const processGuestEntry = (guestData) => {
  // guestData is now the object { name, category, gradYear, etc. }
  storeGuestSwipeIn(gym, guestData, serverTimestamp());
  setIsGuestPopupOpen(false);
};

  function storeGuestSwipeIn(gym, guestData, timeStamp) {
  addDoc(guestEntranceRef, {
    location: gym,
    timestamp: timeStamp,
    ...guestData // This "spreads" the object into separate Firestore fields
  });
}
    //saves data to firebase
  function storeSwipeIn(gym, swipeValid, verified_data, timeStamp, reasonsSwipeDenied, studentName){
    
    const customAlert = document.getElementById("customAlert");
    const alertContent = document.getElementById("alertContent");
    const alertHeading = document.getElementById("alertHeading");
    const alertText = document.getElementById("alertText");

      if (swipeValid && gym !== "None Selected"){
        alertHeading.textContent = "Swipe in Accepted";
        alertHeading.style.color = "#14AB00";
        alertText.textContent = "welcome " + studentName;
        if(gym === "Pepsi-Co Center"){
          addDoc(pepsicoCenterRef, {
          ID: verified_data,
          swipeInTime: timeStamp,
        })
        } else if (gym === "Westerlin Gym"){
          addDoc(westerlinGymRef, {
          ID: verified_data,
          swipeInTime: timeStamp,
        })
        }
    }
    else if (!swipeValid){
        alertHeading.textContent = "Swipe in Denied";
        alertHeading.style.color = "#E80000";
        alertText.textContent = reasonsSwipeDenied;
      console.log("invalid swipe");
      console.log(verified_data, timeStamp);
      addDoc(invalidSwipeInRef, {
      gym: gym,
      ID: verified_data,
      swipeInTime: timeStamp,
    })
    }
      customAlert.style.display = 'flex';
      setTimeout(() => {customAlert.style.display = 'none';}, 6000);
  }


  return (
    <>
      <Navbar currentGym={gym} onGymChange={updateGym} />
      <div className="Dashboard">
          <div className="customAlert" id="customAlert">
            <div className="alertContent" id="alertContent">
              <h2 id="alertHeading"> Test Text</h2>
              <p id="alertText"></p>
            </div>
          </div>
        <div className="swipe-card">
          {/* <h1>{gym}</h1> */}
          <h2>Swipe In</h2>

          <form onSubmit={handleSubmission}>
            <label>Student ID</label>

            <input
              type="password"
              ref={inputRef}
              placeholder="Enter Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button type="submit" className="swipe-button">
              Check In
            </button>

          </form>
        </div>
      </div>
      <button 
        className="guest-trigger-btn" 
        onClick={() => setIsGuestPopupOpen(!isGuestPopupOpen)}
      >
        {isGuestPopupOpen ? "Close Form" : "Guest Sign-In"}
      </button>

      {/* NEW CLEAN COMPONENT */}
      <GuestPopup 
        isOpen={isGuestPopupOpen} 
        onClose={() => setIsGuestPopupOpen(false)}
        onSubmitGuest={processGuestEntry} // Pass the new bridge function
      />

    </>
  );
}

export default Dashboard;