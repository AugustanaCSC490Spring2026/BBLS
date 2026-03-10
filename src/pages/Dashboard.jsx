import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // React Router v6
import Analytics from "./Analytics";
import firebase from "firebase/compat/app";
import {db} from '../Firebase.js'
import { addDoc, collection } from "firebase/firestore";

const swipeInRef = collection(db, 'Swipe-Ins');

function Dashboard() {
  const navigate = useNavigate();
  const [entry, setEntry] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const goToAnalytics = () => {
    navigate("/analytics"); // route path to Analytics.jsx
  };
  
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
    setEntry(e.target.value);
  };

  const handleEnter = () => {
    console.log("Entered ID:", entry);
    let timeStamp = new Date();
    timeStamp = timeStamp.toLocaleString();
    console.log(new Date("3/10/2026, 11:52:35 AM"));
    setEntry('');
    inputRef.current?.focus();
    addDoc(swipeInRef, {
      ID: entry,
      swipeInTime: timeStamp,
    })

  }

  return (
    <div>
      <h1>Dashboard Page</h1>
      <input
        ref = {inputRef}
        id="user-entry"
        type="text"
        value={entry}
        onChange={handleChange}
        placeholder="ID Number"
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      <p/>
      <button onClick={handleEnter} style={{ marginRight: '10px' }}>
          Enter
      </button>
      <p/>
      <button onClick={goToAnalytics}>Go to Analytics</button>
    </div>
  );
}

export default Dashboard;