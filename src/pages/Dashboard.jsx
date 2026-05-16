import { useState, useRef, useEffect, useCallback } from "react";
import { db } from "../Firebase.js";
import ToastContainer from "../components/ToastContainer";
import ValidateStaffSwipe from "../components/ValidateStaffSwipe.js";
import NavDropdown from "../components/NavDropdown.jsx";

// NEW: added serverTimestamp for accurate backend time
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import awayModeIcon from "../assets/moon.png";

import "../components/Dashboard.css";

import GuestPopup from "../components/GuestTab.jsx";
import ValidateSwipe from "../components/ValidateSwipe.js";
import AwayModeOverlay from "../components/AwayModeOverlay.jsx";
import BannedStudentOverlay from "../components/BannedStudentOverlay.jsx";
const pepsicoCenterRef = collection(db, 'pepsicoCenter')
const westerlinGymRef = collection(db, 'westerlinGym')
const invalidSwipeInRef = collection(db, 'invalidSwipeIns');
const currentStudentsRef = collection(db, "currentStudents");
const bannedStudentsRef = collection(db, "bannedStudents");
const guestEntranceRef = collection(db, "guestEntrance");


function Dashboard({ gym, updateGym }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGuestPopupOpen, setIsGuestPopupOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const inputRef = useRef(null);
  const overlaySwipeRef = useRef(null);
  const [awayMode, setAwayMode] = useState(false);
  const [bannedOverlay, setBannedOverlay] = useState({ visible: false, message: "" });
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

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
    const validationResult = await ValidateSwipe(rawId);
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

  const addToast = (type, title, message) => {
    const newToast = {
      id: toastIdRef.current++,
      type,
      title,
      message,
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      if (updated.length > 7) {
        // This keeps the 7 newest items. 
        // The "oldest" of these 7 stays at index 0 (the top).
        return updated.slice(-7);
      }
      return updated;
    });
  };

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleSubmission = async (event) => {
    if (event) event.preventDefault();

    // 1. EXIT if already processing
    if (isProcessing) return;

    const temp_input = studentId.trim();
    if (!temp_input) return; // Don't process empty strings

    // 2. SET to true to lock the button
    setIsProcessing(true);

    try {
      // Validating the swipe input
      const { isValid: swipeValid, studentId: verified_data, name: studentName, reasonDenied: reasonSwipeDenied } = await ValidateSwipe(temp_input);

      // Save to firebase
      await storeSwipeIn(gym, swipeValid, verified_data, serverTimestamp(), reasonSwipeDenied, studentName);

      setStudentId("");

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

    } catch (err) {
      console.error("Error saving swipe:", err);
      addToast("error", "System Error", "Failed to process swipe. Please try again.");
    } finally {
      // 3. ALWAYS unlock the button when finished
      setIsProcessing(false);
    }
  };

  async function processGuestEntry(guestData) {
    const timeStamp = serverTimestamp();
    let validBool = true;
    let reasonDenied = "No reason given";
    let overallName = "No staff name";

    if (guestData.category === "Staff") {
      const isValidData = await ValidateStaffSwipe(guestData.staffId);
      validBool = isValidData.isValid;
      reasonDenied = isValidData.reasonDenied;
      overallName = isValidData.name;

      if (validBool) {
        addDoc(guestEntranceRef, {
          location: gym,
          timestamp: timeStamp,
          ...guestData // This "spreads" the object into separate Firestore fields
        });
      }
    } else {
      overallName = guestData.name;
      validBool = true;
      addDoc(guestEntranceRef, {
        location: gym,
        timestamp: timeStamp,
        ...guestData // This "spreads" the object into separate Firestore fields
      });
    }
    if (validBool) {
      addToast("success", "ID Accepted", `Welcome, ${overallName}!`);
    } else {
      addToast("error", "ID Denied", reasonDenied);
    }
  };



  //saves data to firebase
  function storeSwipeIn(gym, swipeValid, verified_data, timeStamp, reasonSwipeDenied, studentName) {
    if (swipeValid && gym !== "None Selected") {
      addToast("success", "ID Accepted", `Welcome, ${studentName}!`);

      if (gym === "Pepsi-Co Center") {
        addDoc(pepsicoCenterRef, { ID: verified_data, swipeInTime: timeStamp });
      } else if (gym === "Westerlin Gym") {
        addDoc(westerlinGymRef, { ID: verified_data, swipeInTime: timeStamp });
      }

    } else if (!swipeValid && reasonSwipeDenied.includes("banned")){
      setBannedOverlay({ visible: true, message: reasonSwipeDenied });
    } else if (!swipeValid) {
      addToast("error", "ID Denied", reasonSwipeDenied);
      addDoc(invalidSwipeInRef, { gym: gym, ID: verified_data, swipeInTime: timeStamp });
    }
  }


  return (
    <>
      <div className="top-dashboard">
        <div className="dash-right">
          <NavDropdown
            options={["Pepsi-Co Center", "Westerlin Gym"]}
            defaultOption={gym}
            onChange={updateGym}
          />
        </div>
        <div className="dash-left">
          <button onClick={() => setAwayMode(true)}>
            Away
          </button>
        </div>
      </div>
      <div className="Dashboard">

        <AwayModeOverlay
          isActive={awayMode}
          onDismiss={() => setAwayMode(false)}
          onSwipe={(id) => overlaySwipeRef.current?.(id)}
        />

        <BannedStudentOverlay
          isVisible={bannedOverlay.visible}
          message={bannedOverlay.message}
          onDismiss={() => setBannedOverlay({ visible: false, message: "" })}
        />

        <div className="swipe-card">
          <div className="swipe-card-header">
            <h2>Swipe In</h2>
          </div>
          <div className="swipe-card-body">
            <form onSubmit={handleSubmission}>
              <label>Student ID</label>

              <input
                ref={inputRef}
                placeholder="Enter Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <button
                type="submit"
                className="swipe-button"
                disabled={isProcessing}
                style={{
                  opacity: isProcessing ? 0.6 : 1,
                  cursor: isProcessing ? "not-allowed" : "pointer",
                }}
              >
                {isProcessing ? "Processing..." : "Check In"}
              </button>
            </form>
          </div>
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
      {!awayMode && (
        <ToastContainer
          toasts={toasts}
          removeToast={removeToast}
        />
      )}
    </>
  );
}

export default Dashboard;