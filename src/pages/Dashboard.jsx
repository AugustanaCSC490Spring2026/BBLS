import React, { useState, useRef, useEffect } from "react";
import { db } from "../Firebase.js";

// NEW: added serverTimestamp for accurate backend time
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";

import "../components/Dashboard.css";

import GuestPopup from "../components/GuestTab.jsx";
import ValidateSwipe from "../components/ValidateSwipe.js";
import AwayModeOverlay from "../components/AwayModeOverlay.jsx";
const pepsicoCenterRef = collection(db, 'pepsicoCenter')
const westerlinGymRef = collection(db, 'westerlinGym')
const invalidSwipeInRef = collection(db, 'invalidSwipeIns');
const currentStudentsRef = collection(db, "currentStudents");
const bannedStudentsRef = collection(db, "bannedStudents");
const guestEntranceRef = collection(db, "guestEntrance");
let alertTimer;

import awayModeIcon from "../assets/moon.png";

function Dashboard({ gym, updateGym }) {
  const [isGuestPopupOpen, setIsGuestPopupOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const inputRef = useRef(null);
  const overlaySwipeRef = useRef(null);
  const [awayMode, setAwayMode] = useState(false);
  // Auto-focus on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

useEffect(() => {
  overlaySwipeRef.current = handleOverlaySwipe;
}, [gym]);

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
  const handleOverlaySwipe = async (rawId) => {
    const validationResult = await ValidateSwipe(rawId, getDoc, doc, db);
    const { isValid, studentId: verified_data, name, reasonDenied } = validationResult;

    try {
      storeSwipeIn(gym, isValid, verified_data, serverTimestamp(), reasonDenied, name);
    } catch (err) {
      console.error("Error saving swipe:", err);
    }

    return {
      success: isValid,
      name: name,
      reason: reasonDenied,
    };
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
    let reasonSwipeDenied;
    let docRef;
    let studentName;

    //validating the swipe input
    const validationResult = await ValidateSwipe(temp_input, getDoc, doc, db);
    swipeValid = validationResult.isValid;
    verified_data = validationResult.studentId;
    studentName = validationResult.name;
    reasonSwipeDenied = validationResult.reasonDenied;


    try {
      // CHANGED: using serverTimestamp instead of string date
      // This allows Firebase to store a real timestamp, so we can filter in analytics.jsx (written with ChatGPT)
      storeSwipeIn(gym, swipeValid, verified_data, serverTimestamp(), reasonSwipeDenied, studentName);
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
  function storeSwipeIn(gym, swipeValid, verified_data, timeStamp, reasonSwipeDenied, studentName) {

    const customAlert = document.getElementById("customAlert");
    const alertHeading = document.getElementById("alertHeading");
    const alertText = document.getElementById("alertText");

    if (!customAlert || !alertHeading || !alertText) return;

    if (swipeValid && gym !== "None Selected") {
      alertHeading.textContent = "ID Accepted";
      alertHeading.style.color = "#14AB00";
      alertText.textContent = "Welcome, " + studentName + "!";
      if (gym === "Pepsi-Co Center") {
        addDoc(pepsicoCenterRef, {
          ID: verified_data,
          swipeInTime: timeStamp,
        })
      } else if (gym === "Westerlin Gym") {
        addDoc(westerlinGymRef, {
          ID: verified_data,
          swipeInTime: timeStamp,
        })
      }
    }
    else if (!swipeValid) {
      alertHeading.textContent = "ID Denied";
      alertHeading.style.color = "#E80000";
      alertText.textContent = reasonSwipeDenied;
      console.log("Invalid swipe in");
      console.log(verified_data, timeStamp);
      addDoc(invalidSwipeInRef, {
        gym: gym,
        ID: verified_data,
        swipeInTime: timeStamp,
      })
    }
    customAlert.style.display = 'flex';
    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => { customAlert.style.display = 'none'; }, 4500);
  }


  return (
    <>
      <div className="top-dashboard">
        <button onClick={() => setAwayMode(true)}>
          <img src={awayModeIcon} alt="Away Mode" />
        </button>
      </div>
      <div className="Dashboard">

        <AwayModeOverlay
          isActive={awayMode}
          onDismiss={() => setAwayMode(false)}
          onSwipe={(id) => overlaySwipeRef.current?.(id)}
        />
        <div className="customAlert" id="customAlert">
          <div className="alertContent" id="alertContent">
            <h2 id="alertHeading"> If you can see this there is a bug</h2>
            <p id="alertText"></p>
          </div>
        </div>
        <div className="swipe-card">
          {/* <h1>{gym}</h1> */}
          <h2>Swipe In</h2>

          <form onSubmit={handleSubmission}>
            <label>Student ID</label>

            <input
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