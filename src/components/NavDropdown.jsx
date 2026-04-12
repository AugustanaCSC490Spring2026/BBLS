import React, { useState, useEffect } from 'react';
import './NavDropdown.css';

export function NavDropdown({ options, defaultOption, onChange }) {
  const [selectedOption, setSelectedOption] = useState(defaultOption || options[0]);
  const [isOpen, setIsOpen] = useState(false);

 useEffect(() => {
  if (defaultOption && defaultOption !== selectedOption) {
    setSelectedOption(defaultOption);
  }
}, [defaultOption]);

  // Determine the option not currently selected
  const otherOption = selectedOption === options[0] ? options[1] : options[0];

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
    if (onChange) onChange(option);
  };

  // Helper to identify which "theme" to apply (Yellow vs Blue/White)
  const getTheme = (option) => (option === options[0] ? "primary" : "secondary");

  return (
    <div 
      className="nav-dropdown-container"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="nav-dropdown-trigger"
        data-theme={getTheme(selectedOption)}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption}</span>
        
        <span className={`nav-dropdown-arrow ${isOpen ? 'open' : ''}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      
      {isOpen && (
        <div className="nav-dropdown-menu">
          <button
            type="button"
            className="nav-dropdown-item"
            data-theme={getTheme(otherOption)}
            onClick={() => handleOptionClick(otherOption)}
          >
            {otherOption}
          </button>
        </div>
      )}
    </div>
  );
}

export default NavDropdown;