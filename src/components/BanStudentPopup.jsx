import React, { useState, useEffect } from "react";

// student: { name, isBanned, unbanDate, reasonBanned }
function BanStudentPopup({ isOpen, student, onBan, onUnban, onCancel, onReasonChange, onDateChange }) {
  const [reason, setReason] = useState("");
  const [unbanDate, setUnbanDate] = useState("");

  // Sync controlled inputs and notify Settings whenever a new student is loaded
  useEffect(() => {
    if (isOpen && student) {
      const r = student.reasonBanned || "";
      const d = student.unbanDate || "";
      setReason(r);
      setUnbanDate(d);
      onReasonChange(r);
      onDateChange(d);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleReasonChange = (e) => {
    setReason(e.target.value);
    onReasonChange(e.target.value);
  };

  const handleDateChange = (e) => {
    setUnbanDate(e.target.value);
    onDateChange(e.target.value);
  };

  return (
    <div className="banStudentsPopupContainer" style={{ display: "flex" }}>
      <div className="banStudentsPopupBackground">
        <div className="banStudentsPopup">
          <h2>
            {student.isBanned
              ? `${student.name} is currently banned.`
              : `${student.name} is currently not banned.`}
          </h2>
          <p className="banStudentsPopupText">
            {student.isBanned
              ? "Would you like to unban this student or edit information?"
              : "Would you like to ban this student?"}
          </p>
          <p className="banStudentReasonStatememnt">reason student is to be banned</p>
          <input
            className="banStudentReasonForm"
            id="banStudentReasonForm"
            type="text"
            value={reason}
            placeholder="Enter reason Student is to be banned"
            onChange={handleReasonChange}
          />
          <p className="unbanDateStatement">Date Student is to be Unbanned</p>
          <input
            className="unbaneDateInput"
            type="date"
            value={unbanDate}
            onChange={handleDateChange}
          />
          <div className="popup-button-group">
            <button className="banStudentButton" onClick={onBan}>
              {student.isBanned ? "edit ban" : "ban"}
            </button>
            <button className="cancelOperationButton" onClick={onCancel}>Cancel</button>
            {student.isBanned && (
              <button className="unbanStudentButton" onClick={onUnban}>Unban</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BanStudentPopup;
