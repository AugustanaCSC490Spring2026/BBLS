import React, { useState, useRef, useEffect } from "react";
import {db} from '../Firebase.js'
import { addDoc, collection } from "firebase/firestore";
import Navbar from "./Navigation.jsx";
import "../components/Dashboard.css";

const swipeInRef = collection(db, 'swipeIns')

function Dashboard() {
  const [studentId, setStudentId] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  

useEffect(() => {
    const focusInterval = setInterval(() => {
      // If the current focused element is NOT our input, focus it!
      if (document.activeElement !== inputRef.current) {
        console.log("Refocusing input...");
        inputRef.current?.focus();
      }
    }, 5000); // 5000ms = 5 seconds

    // Cleanup: Stop the interval if the user navigates away from this page
    return () => clearInterval(focusInterval);
  }, []);

  const handleChange = (e) => {
    setStudentId(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      handleEnter();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      handleEnter();
    }
  };

  const handleEnter = () => {
    const verified_data = entry.slice(3, 10); 
    alert("Entered ID: " + verified_data);
    let timeStamp = new Date();
    timeStamp = timeStamp.toLocaleString();
    console.log(new Date("3/10/2026, 11:52:35 AM"));
    setStudentId('');
    inputRef.current?.focus();
    addDoc(swipeInRef, {
      ID: entry,
      swipeInTime: timeStamp,
    })

  }


  return (
    <>
      <Navbar />
      <div className="Dashboard">
          <div className="swipe-card">
            <h2>Swipe In</h2>

            <form onSubmit={handleSwipe}>

              <label>Student ID</label>
              <input
                type="text"
                placeholder="Enter Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
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