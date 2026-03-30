import React, { useState, useRef, useEffect } from "react";
import { db } from "../Firebase.js";
import { useLocation } from 'react-router-dom';

// NEW: added serverTimestamp for accurate backend time
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import Navbar from "./Navigation.jsx";
import "../components/Dashboard.css";
import { FunnelChart } from "recharts";

const validSwipeInRef = collection(db, 'swipeIns')
const invalidSwipeInRef = collection(db, 'invalidSwipeIns')

function Dashboard( {gym, updateGym } ) {
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
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 5000);

    return () => clearInterval(focusInterval);
  }, []);

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
      alert("Invalid ID: " + temp_input);
      console.log("Invalid ID: " + temp_input);
      verified_data = temp_input;
      swipeValid = false;
    } else if (temp_input.length == 7) {
      verified_data = temp_input;
      console.log("Accepted, Entered ID: " + verified_data);
      swipeValid = true;
    } else {
      verified_data = temp_input.slice(3, 10);
      console.log("Accepted, Entered ID: " + verified_data);
      swipeValid = true;
    }

    try {
      // CHANGED: using serverTimestamp instead of string date
      // This allows Firebase to store a real timestamp, so we can filter in analytics.jsx (written with ChatGPT)
      storeSwipeIn(swipeValid, verified_data, serverTimestamp());
    } catch (err) {
      console.error("Error saving swipe:", err);
    }

    setStudentId("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

  }
    //saves data to firebase
  function storeSwipeIn(swipeValid, verified_data, timeStamp){
    if (swipeValid){
    console.log("this is true");
    addDoc(validSwipeInRef, {
      ID: verified_data,
      swipeInTime: timeStamp,
    })
  }
    if (!swipeValid){
          console.log("This is false");
          console.log(verified_data, timeStamp);
      addDoc(invalidSwipeInRef, {
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
    </>
  );
}

export default Dashboard;