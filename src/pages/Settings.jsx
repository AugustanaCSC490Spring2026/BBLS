// This entire file was generated with help from ChatGPT

import React from "react";

// PapaParse is used to read and convert CSV into JavaScript objects
import Papa from "papaparse";

// Navigation component
import Navbar from "./Navigation.jsx";

// Firebase setup
import { db } from "../Firebase.js";

// Firestore tools for batch writing
import { doc, writeBatch } from "firebase/firestore";

const Settings = () => {

  // Handles when a user selects a file
  const handleFileChange = (event) => {

    // Get the selected file
    const file = event.target.files[0];

    // If no file is selected, exit early
    if (!file) return;

    // Validate file type (must be CSV)
    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a valid .csv file.");
      event.target.value = null; // Reset file input
      return;
    }

    // Parse the CSV file into usable data
    Papa.parse(file, {
      header: true,           // First row becomes column headers (keys)
      skipEmptyLines: true,   // Ignore empty rows

      // Runs when parsing is complete
      complete: async (results) => {

        const data = results.data; // Array of row objects

        console.log("Parsed CSV:", data);

        // Counters for reporting results
        let successCount = 0;
        let failCount = 0;

        // Create a Firestore batch (groups multiple writes together)
        let batch = writeBatch(db);

        // Tracks how many operations are in the current batch
        let operationCount = 0;

        // Loop through each row in the CSV
        for (const row of data) {
          try {

            // Extract and clean student ID
            let studentId = row.ID?.trim();

            // Skip invalid IDs (must be 7 characters)
            if (!studentId || studentId.length !== 7) {
              failCount++;
              continue;
            }

            // Build the student object to store in Firestore
            const studentData = {
              ID: studentId,
              Email: row.AUGIE_EMAIL || "",
              LastName: row.LastName || "",
              FirstName: row.Pref_FirstName || "",
              PersonType: row.PersonType || "",
              Class: row.Class || "",
              Transfer: row.Transfer || "",
              Residence: row["Residence Hall"] || "",
              Gender: row.Gender || "",
              Race: row.Race || "",
              RaceDesc: row.Race_Desc || "",
              International: row.International || "",
            };

            // Create a document reference using student ID as the document ID
            const docRef = doc(db, "currentStudents", studentId);

            // Add this write operation to the batch
            batch.set(docRef, studentData);

            // Update counters
            operationCount++;
            successCount++;

            // Firestore allows a maximum of 500 operations per batch
            // When limit is reached, commit the batch and start a new one
            if (operationCount === 500) {
              await batch.commit();
              batch = writeBatch(db);
              operationCount = 0;
            }

          } catch (err) {
            console.error("Error processing row:", err);
            failCount++;
          }
        }

        // Commit any remaining operations after the loop
        if (operationCount > 0) {
          await batch.commit();
        }

        // Notify user of upload results
        alert(
          `Upload complete!\nSuccess: ${successCount}\nFailed: ${failCount}`
        );
      },

      // Runs if CSV parsing fails
      error: (err) => {
        console.error("CSV Parse Error:", err);
        alert("Error parsing CSV file.");
      }
    });
  };

  return (
    <>
      <Navbar />

      <div className="settings-container">
        <h1>Settings</h1>

        <section className="modify-student-body">
          <h2>Modify Student Body</h2>

          {/* File input triggers CSV upload */}
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