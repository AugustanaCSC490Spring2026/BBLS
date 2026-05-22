import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Location.css';
import Navbar from './Navigation.jsx';



function Location( { onSelectGym } ) {
  // 1. We use 'useState' so React knows to "remember" this value
  const navigate = useNavigate();


  // 2. Logic must live BEFORE the return statement
  const handleSelection = (gymName) => {
    onSelectGym(gymName); // Update global state
    navigate("/dashboard"); // Navigate normally
  };

  return (
    <>
    <div className="selection-container">
      <button 
        onClick={() => handleSelection("PepsiCo Center")}
        className="gym-button pepsi-color"
        style={{ fontSize: "2rem" }}
      >
        PepsiCo
      </button>

      <button
        onClick={() => handleSelection("Westerlin Gym")}
        className="gym-button westerlin-color"
        style={{ fontSize: "2rem" }}
      >
        Westerlin Gym
        (WAC)
      </button>
    </div>
    </>
  );
}

export default Location;

