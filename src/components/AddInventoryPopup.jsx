import React, { useState, useEffect } from "react";

function AddInventoryPopup({ isOpen, onClose, onSubmit, availableEquipment }) {
  const [selectedItem, setSelectedItem] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Reset form whenever popup closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedItem("");
      setCustomItem("");
      setQuantity(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const itemName =
      selectedItem === "Other" ? customItem.trim() : selectedItem;

    if (!itemName || quantity <= 0) return;

    onSubmit({ itemName, quantity: Number(quantity) });
    onClose();
  };

  return (
    <div className="guest-popup-container">
      <div className="guest-popup-header">
        <h3>Add Inventory</h3>
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
        {/* Equipment Selector */}
        <div className="input-group">
          <label>Equipment Item:</label>
          <select
            value={selectedItem}
            onChange={(e) => {
              setSelectedItem(e.target.value);
              setCustomItem(""); // clear custom name when switching
            }}
            required
          >
            <option value="" disabled>
              Select item
            </option>
            {availableEquipment.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
            <option value="Other">Other (new item)</option>
          </select>
        </div>

        {/* Animate in extra fields once a category is chosen */}
        {selectedItem && (
          <div className="guest-details-animation">
            {/* Custom name field — only shown for "Other" */}
            {selectedItem === "Other" && (
              <div className="input-group">
                <label>New Item Name:</label>
                <input
                  type="text"
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  placeholder="e.g. Resistance Bands"
                  required
                  autoFocus
                />
              </div>
            )}

            {/* Quantity — always shown once an item is selected */}
            <div className="input-group">
              <label>Quantity to Add:</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
                autoFocus={selectedItem !== "Other"}
              />
            </div>

            <button type="submit" className="guest-submit-btn">
              Add to Inventory
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default AddInventoryPopup;
