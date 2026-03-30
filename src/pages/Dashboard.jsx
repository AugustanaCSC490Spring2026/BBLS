import React, { useState, useRef, useEffect } from "react";
import { db } from "../Firebase.js";

// NEW: added serverTimestamp for accurate backend time
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";

import Navbar from "./Navigation.jsx";
import "../components/Dashboard.css";
import { FunnelChart } from "recharts";

const validSwipeInRef = collection(db, 'swipeIns');
const invalidSwipeInRef = collection(db, 'invalidSwipeIns');
const currentStudentsRef = collection(db, "currentStudents");

function Dashboard() {
  const [studentId, setStudentId] = useState("");
  const inputRef = useRef(null);

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
  function storeSwipeIn(swipeValid, verified_data, timeStamp) {
    if (swipeValid) {
      console.log("Accepted, Entered ID: " + verified_data);
      addDoc(validSwipeInRef, {
        ID: verified_data,
        swipeInTime: timeStamp,
      })
    }
    if (!swipeValid) {
      alert("Invalid ID: " + verified_data);
      console.log("Invalid ID: " + verified_data);
      addDoc(invalidSwipeInRef, {
        ID: verified_data,
        reasonSwipeDenied: "ID not in database",
        swipeInTime: timeStamp,
      })
    }
  }


  return (
    <>
      <Navbar />
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