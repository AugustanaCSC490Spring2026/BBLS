import React, { useState, useRef, useEffect } from "react";
import { db } from "../Firebase.js";
import { useLocation } from 'react-router-dom';

// NEW: added serverTimestamp for accurate backend time
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";

import Navbar from "./Navigation.jsx";
import "../components/Dashboard.css";
import { FunnelChart } from "recharts";

const validSwipeInRef = collection(db, 'swipeIns');
const pepsicoCenterRef = collection(db, 'pepsicoCenter')
const westerlinGymRef = collection(db, 'westerlinGym')
const invalidSwipeInRef = collection(db, 'invalidSwipeIns');
const currentStudentsRef = collection(db, "currentStudents");
const guestEntranceRef = collection(db, "guestEntrance");

function Dashboard( {gym, updateGym } ) {
  const [guestCategory, setGuestCategory] = useState(""); // Holds dropdown value
  const [otherReason, setOtherReason] = useState("");     // Holds "Other" text
  const [guestName, setGuestName] = useState("");
  const [guestPurpose, setGuestPurpose] = useState("");
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

  const handleGuestSubmit = (e) => {
  e.preventDefault();

  // If they picked "Other", use the text box value; otherwise use the dropdown value
  const finalReason = guestCategory === "Other" ? otherReason : guestCategory;

  if (guestName.trim() && finalReason) {
    storeGuestSwipeIn(gym, guestName, finalReason, serverTimestamp());
    
    // Reset everything
    setGuestName("");
    setGuestCategory("");
    setOtherReason("");
    setIsGuestPopupOpen(false);
  }
};

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

    // Validate ID
    if (temp_input.length !== 7 && temp_input.length !== 16) {
      verified_data = temp_input;
      swipeValid = false;
    } else if (temp_input.length == 7) {
      verified_data = temp_input;
      const docRef = await doc(db, "currentStudents", verified_data);
      await getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          console.log("valid ID");
          swipeValid = true;
        }
      })
    } else {
      verified_data = temp_input.slice(3, 10);
      const docRef = await doc(db, "currentStudents", verified_data);
      await getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          console.log("valid ID");
          swipeValid = true;
        }
      })
    }

    try {
      // CHANGED: using serverTimestamp instead of string date
      // This allows Firebase to store a real timestamp, so we can filter in analytics.jsx (written with ChatGPT)
      storeSwipeIn(gym, swipeValid, verified_data, serverTimestamp());
    } catch (err) {
      console.error("Error saving swipe:", err);
    }

    setStudentId("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

  }

  function storeGuestSwipeIn(gym, name, visitReason, timeStamp){
    addDoc(guestEntranceRef, {
        location: gym,
        name: name,
        reasonForVisit: visitReason,
        timestamp: timeStamp
    })
  }
    //saves data to firebase
  function storeSwipeIn(gym, swipeValid, verified_data, timeStamp){
    if (swipeValid && gym !== "None Selected"){
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
    if (!swipeValid){
      console.log("This is false");
      console.log(verified_data, timeStamp);
      addDoc(invalidSwipeInRef, {
      gym: gym,
      ID: verified_data,
      swipeInTime: timeStamp,
    })
    }
  }


  return (
    <>
      <Navbar currentGym={gym} onGymChange={updateGym} />
      <div className="Dashboard">
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
  onClick={() => setIsGuestPopupOpen(!isGuestPopupOpen)} // This toggles it
>
  {isGuestPopupOpen ? "Close Form" : "Guest Sign-In"}
</button>
    {isGuestPopupOpen && (
  <div className="guest-popup-container">
    <div className="guest-popup-header">
      <h3>Guest Sign-In</h3>
    </div>
    
    <form onSubmit={handleGuestSubmit}>
      <div className="input-group">
        <label>Full Name</label>
        <input 
          type="text" 
          value={guestName} 
          onChange={(e) => setGuestName(e.target.value)} 
          placeholder="Enter guest name"
          required 
        />
      </div>
      
      <div className="input-group">
  <label>Reason for Visit</label>
  <select 
    value={guestCategory} 
    onChange={(e) => setGuestCategory(e.target.value)}
    required
  >
    <option value="" disabled>Select a reason</option>
    <option value="Physical Therapy">Physical Therapy</option>
    <option value="Other">Other</option>
  </select>
</div>

{/* CONDITIONAL TEXT BOX: Only shows if "Other" is selected */}
{guestCategory === "Other" && (
  <div className="input-group">
    <label>Please Specify</label>
    <input 
      type="text"
      value={otherReason}
      onChange={(e) => setOtherReason(e.target.value)}
      placeholder="Why are you visiting?"
      required
      autoFocus
    />
  </div>
)}
      
      <button type="submit" className="guest-submit-btn">Sign In Guest</button>
    </form>
  </div>
)}
    </>
  );
}

export default Dashboard;