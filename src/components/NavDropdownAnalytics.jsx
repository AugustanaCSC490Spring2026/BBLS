
import React, { useState, useEffect, useRef } from 'react';
import './NavDropdownAnalytics.css';

export function NavDropdownAnalytics({ options, defaultOption, onChange }) {
  const [selectedOption, setSelectedOption] = useState(defaultOption || options[0]);
  const [isOpen, setIsOpen] = useState(false);

  // Use a ref to detect clicks outside the component
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (defaultOption && defaultOption !== selectedOption) {
      setSelectedOption(defaultOption);
    }
  }, [defaultOption]);

  // Handle clicking outside to close the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const otherOptions = options.filter((option) => option !== selectedOption);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
    if (onChange) onChange(option);
  };

  const getTheme = (option) => (option === options[0] ? "primary" : "secondary");

  return (
    <div className="nav-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className="nav-dropdown-trigger"
        data-theme={getTheme(selectedOption)}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
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
          {otherOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="nav-dropdown-item"
              data-theme={getTheme(option)}
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NavDropdownAnalytics;
