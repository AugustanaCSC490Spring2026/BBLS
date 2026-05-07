import React, { useState, useEffect } from "react";

function RemoveInventoryPopup({ isOpen, onClose, onSubmit, availableEquipment }) {
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setSelectedItem("");
      setQuantity(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedEquipment = availableEquipment.find((item) => item.name === selectedItem);
  const maxRemovable = selectedEquipment?.available ?? 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem || quantity <= 0) return;
    onSubmit({ itemName: selectedItem, quantity: Number(quantity) });
    onClose();
  };

  return (
    <div className="guest-popup-container">
      <div className="guest-popup-header">
        <h3>Remove from Inventory</h3>
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
          <label>Equipment Item:</label>
          <select
            value={selectedItem}
            onChange={(e) => {
              setSelectedItem(e.target.value);
              setQuantity(1);
            }}
            required
          >
            <option value="" disabled>
              Select item
            </option>
            {availableEquipment.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} ({item.available}/{item.total} available)
              </option>
            ))}
          </select>
        </div>

        {selectedItem && (
          <div className="guest-details-animation">
            <div className="input-group">
              <label>Quantity to Remove:</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                max={maxRemovable}
                required
                autoFocus
              />
              {maxRemovable === 0 && (
                <p style={{ color: "#ff4d4d", fontSize: "0.85rem", marginTop: "4px" }}>
                  All items are currently checked out.
                </p>
              )}
              {maxRemovable > 0 && (
                <p style={{ color: "#666", fontSize: "0.85rem", marginTop: "4px" }}>
                  Max removable: {maxRemovable} (items currently checked out cannot be removed)
                </p>
              )}
            </div>

            <button
              type="submit"
              className="guest-submit-btn"
              disabled={maxRemovable === 0}
              style={{ opacity: maxRemovable === 0 ? 0.5 : 1 }}
            >
              Remove from Inventory
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default RemoveInventoryPopup;
