import React, { useState, useRef, useEffect } from "react";
import { Download } from "lucide-react";
import "./ChartExportMenu.css";

export default function ChartExportMenu({ onExportPng, onExportCsv, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (action) => {
    setIsOpen(false);
    if (action) action();
  };

  return (
    <div className="chart-export-menu" ref={menuRef}>
      <button
        type="button"
        className="chart-export-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-label="Export chart"
        aria-expanded={isOpen}
      >
        <Download size={14} strokeWidth={2} />
      </button>

      {isOpen && (
        <div className="chart-export-dropdown">
          <button type="button" className="chart-export-item" onClick={() => handleSelect(onExportPng)}>
            Export to PNG
          </button>
          <button type="button" className="chart-export-item" onClick={() => handleSelect(onExportCsv)}>
            Export to CSV
          </button>
        </div>
      )}
    </div>
  );
}
