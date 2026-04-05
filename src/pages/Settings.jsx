// This entire file was generated with help from ChatGPT

import React, { useState, useEffect } from "react";
import Navbar from "./Navigation.jsx";


const Settings = () => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a valid .csv file.");
      event.target.value = null; // reset input
      return;
    }

    console.log("Selected CSV file:", file);

    // TODO: Add CSV parsing or upload logic here
  };

  return (
    <>
    <Navbar />
        <div className="settings-container">
        <h1>Settings</h1>

        <section className="modify-student-body">
            <h2>Modify Student Body</h2>

            <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            />
        </section>
        </div>
    </>
  );
};

export default Settings;