import React, { useState, useEffect } from "react";
import "./Dashboard.css";

function GuestPopup({ isOpen, onClose, onSubmitGuest }) {
  const currentYear = new Date().getFullYear();

  // 1. Initial State Definitions
  const [guestCategory, setGuestCategory] = useState("");
  const [guestName, setGuestName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [gradYear, setGradYear] = useState(currentYear);

  // 2. THE RESET LOGIC: Clears the form every time the popup is closed
  useEffect(() => {
    if (!isOpen) {
      setGuestCategory("");
      setGuestName("");
      setStaffId("");
      setOtherReason("");
      setGradYear(currentYear);
    }
  }, [isOpen, currentYear]);

  if (!isOpen) return null;

  // 3. Handling the Data Payload
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const guestData = {
      name: guestName,
      category: guestCategory,
    };

    // Only attach extra fields if they are relevant to the category
    if (guestCategory === "Alumni") {
      guestData.gradYear = Number(gradYear);
    } else if (guestCategory === "Staff") {
      guestData.staffId = staffId;
    } else if (guestCategory === "Other") {
      guestData.otherReason = otherReason;
    }

    if (guestName.trim() && guestCategory) {
      onSubmitGuest(guestData);
      // Form resets automatically via the useEffect once Dashboard closes it
    }
  };

  return (
    <div className="guest-popup-container">
      <div className="guest-popup-header">
        <h3>Guest Sign-In</h3>
        
        {/* IMPROVED X BUTTON: Uses SVG for better scaling/centering */}
        <button type="button" className="close-btn" onClick={onClose}>
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Category:</label>
          <select
            value={guestCategory}
            onChange={(e) => setGuestCategory(e.target.value)}
            required
          >
            <option value="" disabled>Select category</option>
            <option value="Alumni">Alumni</option>
            <option value="Physical Therapy">Physical Therapy</option>
            <option value="Staff">Staff / Faculty</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {guestCategory && (
          <div className="guest-details-animation">
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter guest name"
                required
                autoFocus
              />
            </div>

            {guestCategory === "Alumni" && (
              <div className="input-group">
                <label>Graduation Year</label>
                <input
                  type="number"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  min="1900"
                  max={currentYear + 5}
                  required
                />
              </div>
            )}

            {guestCategory === "Staff" && (
              <div className="input-group">
                <label>Staff ID Number</label>
                <input
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="Enter ID #"
                  required
                />
              </div>
            )}

            {guestCategory === "Other" && (
              <div className="input-group">
                <label>Reason for Visit</label>
                <input
                  type="text"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Why are you visiting?"
                  required
                />
              </div>
            )}

            <button type="submit" className="guest-submit-btn">
              Sign In Guest
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default GuestPopup;