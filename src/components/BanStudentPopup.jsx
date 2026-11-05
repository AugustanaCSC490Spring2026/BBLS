import React, { useState, useEffect } from "react";

// student: { name, isBanned, unbanDate, reasonBanned, studentId }
function BanStudentForm({ student, onBan, onUnban, onCancel, onReasonChange, onDateChange }) {
  const [reason, setReason] = useState(student.reasonBanned || "");
  const [unbanDate, setUnbanDate] = useState(student.unbanDate || "");

  // Settings submits these values, so it needs the loaded student's starting values too
  useEffect(() => {
    onReasonChange(student.reasonBanned || "");
    onDateChange(student.unbanDate || "");
  }, [student]);

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

function BanStudentPopup({ isOpen, student, ...formProps }) {
  if (!isOpen || !student) return null;
  return <BanStudentForm key={student.studentId} student={student} {...formProps} />;
}

export default BanStudentPopup;
