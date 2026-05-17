import React from "react";

function AdminPopup({
  isOpen,
  onClose,
  adminList,
  isEditingAdmin,
  editingAdmin,
  editEmail,
  onEmailChange,
  editRole,
  onRoleChange,
  onRowClick,
  onAddClick,
  onSave,
  onDelete,
  onCancelEdit,
}) {
  if (!isOpen) return null;

  return (
    <div className="adminPopupOverlay" onClick={onClose}>
      <div className="adminPopup" onClick={(e) => e.stopPropagation()}>
        <button className="adminPopupClose" onClick={onClose}>✕</button>
        <h2>Manage Administrators</h2>

        <table className="adminTable">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {adminList.length === 0
              ? <tr><td colSpan="2">No administrators found.</td></tr>
              : [...adminList].sort((a, b) => b.isAdmin - a.isAdmin).map((admin, i) => (
                <tr
                  key={i}
                  className={`adminTableRow ${editingAdmin?.id === admin.id ? "adminRowSelected" : ""}`}
                  onClick={() => onRowClick(admin)}
                >
                  <td>{admin.email || admin.Email || admin.id}</td>
                  <td>{admin.isAdmin ? "Admin" : "Desk Worker"}</td>
                </tr>
              ))
            }
            <tr className="adminTableRow addAdminRow" onClick={onAddClick}>
              <td colSpan="2">+ Add Administrator</td>
            </tr>
          </tbody>
        </table>

        {isEditingAdmin && (
          <div className="adminEditForm">
            <p className="adminEditTitle">{editingAdmin ? "Edit administrator" : "Add administrator"}</p>
            <div className="adminEditFields">
              <input
                type="text"
                placeholder="Email address"
                value={editEmail}
                onChange={(e) => onEmailChange(e.target.value)}
              />
              <select value={editRole} onChange={(e) => onRoleChange(e.target.value === "true")}>
                <option value="false">Desk Worker</option>
                <option value="true">Admin</option>
              </select>
            </div>
            <div className="adminEditButtons">
              <button className="adminSaveButton" onClick={onSave}>Save</button>
              <button className="adminCancelButton" onClick={onCancelEdit}>Cancel</button>
              {editingAdmin && (
                <button className="adminDeleteButton" onClick={onDelete}>Remove</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPopup;
