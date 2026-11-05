import { useState, useRef, useEffect, useCallback } from "react";
import { db } from "../Firebase.js";
import ToastContainer from "../components/ToastContainer";
import NavDropdown from "../components/NavDropdown.jsx";

// NEW: added serverTimestamp for accurate backend time
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import "../components/Dashboard.css";

import GuestPopup from "../components/GuestTab.jsx";
import ValidateSwipe from "../components/ValidateSwipe.js";
import { warmHashFunction } from "../components/HashId.js";
import { withTimeout, TIMED_OUT } from "../components/withTimeout.js";
import AwayModeOverlay from "../components/AwayModeOverlay.jsx";


const pepsicoCenterRef = collection(db, 'pepsicoCenter')
const westerlinGymRef = collection(db, 'westerlinGym')
const invalidSwipeInRef = collection(db, 'invalidSwipeIns');
const guestEntranceRef = collection(db, "guestEntrance");
const WARM_UP_INTERVAL_MS = 5 * 60 * 1000;
const SAVE_TIMEOUT_MS = 5000;
const QUEUED_MESSAGE = "This will save when the connection returns. Keep this page open.";

async function isConfirmedSaved(write) {
  return (await withTimeout(write, SAVE_TIMEOUT_MS)) !== TIMED_OUT;
}


function Dashboard({ gym, updateGym }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGuestPopupOpen, setIsGuestPopupOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const inputRef = useRef(null);
  const [awayMode, setAwayMode] = useState(false);
  const awayModeRef = useRef(false);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    awayModeRef.current = awayMode;
  }, [awayMode]);

  // Keeps the first swipe from waiting on a Cloud Function cold start
  useEffect(() => {
    warmHashFunction();
    const warmUpInterval = setInterval(warmHashFunction, WARM_UP_INTERVAL_MS);
    return () => clearInterval(warmUpInterval);
  }, []);

  // Focuses the input on load and on return from the guest popup or away mode,
  // then keeps it focused every 5 seconds
  useEffect(() => {
    // Away mode must not lose keystrokes to this input behind the overlay
    if (isGuestPopupOpen || awayMode) return;

    inputRef.current?.focus();

    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 5000);

    return () => clearInterval(focusInterval);
  }, [isGuestPopupOpen, awayMode]);

  const handleOverlaySwipe = async (rawId) => {
    try {
      const { isValid, hashedId, name, reasonDenied, unavailable } = await ValidateSwipe(rawId);
      if (unavailable) return { success: false, unavailable, reason: reasonDenied };
      const saved = await storeSwipeIn(gym, isValid, hashedId, serverTimestamp(), reasonDenied, name);
      return { success: isValid, name, reason: reasonDenied, queued: !saved };
    } catch (err) {
      console.error("Error saving swipe:", err);
      return { success: false, unavailable: true, reason: "Swipe not saved. Please swipe again." };
    }
  };

  const handleKeyDown = (input) => {
    if (input.key === "Enter") {
      input.preventDefault();
      handleSubmission();
    }
  };

  const addToast = (type, title, message) => {
    // The overlay shows its own result; toasts would pile up behind it
    if (awayModeRef.current) return;

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
      const { isValid: swipeValid, hashedId, name: studentName, reasonDenied: reasonSwipeDenied, unavailable } = await ValidateSwipe(temp_input);

      if (unavailable) {
        addToast("error", "ID Not Checked", reasonSwipeDenied);
      } else {
        // Save to firebase
        const saved = await storeSwipeIn(gym, swipeValid, hashedId, serverTimestamp(), reasonSwipeDenied, studentName);
        if (!saved) addToast("error", "Connection Problem", `Swipe not saved yet. ${QUEUED_MESSAGE}`);
      }

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
    try {
      const saved = await isConfirmedSaved(addDoc(guestEntranceRef, {
        location: gym,
        timestamp: serverTimestamp(),
        ...guestData
      }));
      if (saved) {
        addToast("success", "Guest Signed In", `Welcome, ${guestData.name}!`);
      } else {
        addToast("error", "Connection Problem", `Guest not saved yet. ${QUEUED_MESSAGE}`);
      }
    } catch (err) {
      console.error("Error saving guest entry:", err);
      addToast("error", "System Error", "Failed to save guest sign-in. Please try again.");
    }
  }

  // Resolves false if the write is still queued, so staff must not re-swipe and double count.
  async function storeSwipeIn(gym, swipeValid, swipeHash, timeStamp, reasonSwipeDenied, studentName) {
    const hashedId = swipeHash ?? "";

    if (swipeValid && gym !== "None Selected") {
      addToast("success", "ID Accepted", `Welcome, ${studentName}!`);

      if (gym === "PepsiCo Center") {
        return isConfirmedSaved(addDoc(pepsicoCenterRef, { ID: hashedId, swipeInTime: timeStamp }));
      } else if (gym === "Westerlin Gym") {
        return isConfirmedSaved(addDoc(westerlinGymRef, { ID: hashedId, swipeInTime: timeStamp }));
      }

    } else if (!swipeValid && reasonSwipeDenied.includes("banned")) {
      addToast("banned", "STUDENT BANNED", reasonSwipeDenied);
      return isConfirmedSaved(addDoc(invalidSwipeInRef, { gym: gym, ID: hashedId, swipeInTime: timeStamp }));

    } else if (!swipeValid) {
      addToast("error", "ID Denied", reasonSwipeDenied);
      return isConfirmedSaved(addDoc(invalidSwipeInRef, { gym: gym, ID: hashedId, swipeInTime: timeStamp }));
    }
    return true;
  }


  return (
    <>
      <div className="top-dashboard">
        <div className="dash-right">
          <NavDropdown
            options={["PepsiCo Center", "Westerlin Gym"]}
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
          gym={gym}
          onDismiss={() => setAwayMode(false)}
          onSwipe={handleOverlaySwipe}
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
                type="password"
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