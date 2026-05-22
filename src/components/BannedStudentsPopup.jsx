import React, { useState } from "react";

// bannedStudents: [{ id, name, unbanDate, reason }]
function BannedStudentsPopup({ isOpen, onClose, bannedStudents, onUnban, onSaveChanges }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editReason, setEditReason] = useState("");
  const [editDate, setEditDate] = useState("");

  if (!isOpen) return null;

  const handleRowClick = (student) => {
    setSelectedStudent(student);
    setEditReason(student.reason || "");
    setEditDate(student.unbanDate || "");
  };

  const handleCancel = () => {
    setSelectedStudent(null);
    setEditReason("");
    setEditDate("");
  };

  const handleSave = () => {
    onSaveChanges({ studentId: selectedStudent.id, reasonBanned: editReason, dateToBeUnbanned: editDate, email: selectedStudent.email });
    handleCancel();
  };

  const handleUnban = () => {
    onUnban(selectedStudent.id, selectedStudent.name);
    handleCancel();
  };

  return (
    <div className="adminPopupOverlay" onClick={onClose}>
      <div className="adminPopup" onClick={(e) => e.stopPropagation()}>
        <button className="adminPopupClose" onClick={onClose}>✕</button>
        <h2>Currently Banned Students</h2>

        <table className="adminTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Reason</th>
              <th>Unban Date</th>
            </tr>
          </thead>
          <tbody>
            {bannedStudents.length === 0
              ? <tr><td colSpan="3">No students are currently banned.</td></tr>
              : bannedStudents.map((student, i) => (
                <tr
                  key={i}
                  className={`adminTableRow ${selectedStudent?.id === student.id ? "adminRowSelected" : ""}`}
                  onClick={() => handleRowClick(student)}
                >
                  <td>{student.name}</td>
                  <td>{student.reason || "—"}</td>
                  <td>{student.unbanDate}</td>
                </tr>
              ))
            }
          </tbody>
        </table>

        {selectedStudent && (
          <div className="adminEditForm">
            <p className="adminEditTitle">Edit ban — {selectedStudent.name}</p>
            <div className="adminEditFields">
              <input
                type="text"
                placeholder="Reason banned"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="adminEditButtons">
              <button className="adminSaveButton" onClick={handleSave}>Save Changes</button>
              <button className="adminCancelButton" onClick={handleCancel}>Cancel</button>
              <button className="adminDeleteButton" onClick={handleUnban}>Unban</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BannedStudentsPopup;
