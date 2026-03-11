import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // React Router v6
import Analytics from "./Analytics";


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
    const verified_data = entry.slice(3, 10);
    alert("Entered ID: " + verified_data);
    setEntry('');
    inputRef.current?.focus();
  }


  return (
    <div>
      <h1>Dashboard Page</h1>
      <form>
        <input
          ref = {inputRef}
          id="user-entry"
          type="password"
          value={entry}
          onChange={handleChange}
          placeholder="ID Number"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <p/>
        <button onClick={handleEnter} style={{ marginRight: '10px' }}>
            Enter
        </button>
      </form>
      <p/>
      <button onClick={goToAnalytics}>Go to Analytics</button>
    </div>
  );
}

export default Dashboard;