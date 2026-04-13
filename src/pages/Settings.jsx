// everything pertaining to importing csv files in this file was generated with help from ChatGPT

import React, { useState } from "react";

// PapaParse is used to read and convert CSV into JavaScript objects
import Papa from "papaparse";

// Navigation component
import Navbar from "./Navigation.jsx";

// Firebase setup
import { db } from "../Firebase.js";

// Firestore tools 
import { doc, writeBatch, collection, serverTimestamp, getDoc, deleteDoc, setDoc} from "firebase/firestore";

import "../components/Settings.css";
const Settings = () => {
  const [showGymPopup, setShowGymPopup] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
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

  const handleEquipmentImport = (event) => {

    const file = event.target.files[0];

    if (!file || !selectedGym) return;
    if (
      file.type !== "text/csv" &&
      !file.name.toLowerCase().endsWith(".csv")
    ) {
      alert("Please upload a valid .csv file.");
      event.target.value = null;
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: async (results) => {

        let batch = writeBatch(db);
        let operationCount = 0;

        let successCount = 0;
        let failCount = 0;

        // Choose collection
        const collectionName =
          selectedGym === "westerlin"
            ? "westerlinEquipmentInventory"
            : "pepsicoEquipmentInventory";

        for (const row of results.data) {

          try {

            if (!row.name) {
              failCount++;
              continue;
            }

            const equipmentData = {
              name: row.name.trim(),
              total: Number(row.total) || 0,
              available: Number(row.available) || 0
            };

            const docRef =
              doc(db, collectionName, equipmentData.name);

            batch.set(docRef, equipmentData);

            operationCount++;
            successCount++;

            if (operationCount === 500) {

              await batch.commit();

              batch = writeBatch(db);
              operationCount = 0;
            }

          } catch (err) {

            console.error(err);
            failCount++;

          }
        }

        if (operationCount > 0) {
          await batch.commit();
        }

        alert(
          `Equipment Upload Complete!\nGym: ${selectedGym} \nFailed: ${failCount}`
        );

        event.target.value = null;

      }
    });
  };
  const bannedStudentsRef = collection(db, "bannedStudents");
  let studentId;
  let studentName;
  let verified_data;
  let swipeOutput;
  let docRef;
  let popupTimer; 
  //verify ID
  const handleKeyDown = (input) =>{
    if (input.key === "enter"){
      window.alert("enter key");
      input.preventDefault();
      handleSubmission();
    }
  }
  function updateStudentID(input){
        studentId = input;
      }
  const handleSubmission = async (event) =>{
        event.preventDefault();

    let temp_input;
    try{
    temp_input = studentId.trim();
    } catch{
      console.log("error");
      swipeOutput = "no ID entered";
      displayIdEntryError(swipeOutput);
      return;
    }
    
    updateStudentID(temp_input);
    let isbanned;
        // checks ID to ensure it has the right number of characters
        if (temp_input.length !== 7 && temp_input.length !== 16) {
          verified_data = temp_input;
          swipeOutput = "invalid ID format";
          displayIdEntryError(swipeOutput);

        } else if (temp_input.length == 7) {
          verified_data = temp_input;
          docRef = await doc(db, "currentStudents", verified_data);
            await getDoc(docRef).then((docSnap) => {
            if (!docSnap.exists()) {
              swipeOutput = "Entered ID not in student Database"
              displayIdEntryError(swipeOutput);
            }
            else{
              studentName = docSnap.data().FirstName + " " + docSnap.data().LastName;
              docRef =  doc(db, "bannedStudents", verified_data);
              getDoc(docRef).then((docSnap) => {
              if (!docSnap.exists()) {
                isbanned = false;
                displayPopup(isbanned);
              }
              else{
                isbanned = true;
                displayPopup(isbanned);
              }
            })
            }
        })
        } else {
          verified_data = temp_input.slice(3, 10);
          //currently not supporting card swipes but can change if don wants
        }
        document.getElementById("studentInputForm").value = "";
        updateStudentID("");
  }

  function displayIdEntryError(swipeOutput){
    const customAlert = document.getElementById("customAlert");
    const alertText = document.getElementById("alertText");
    alertText.textContent = swipeOutput;
    customAlert.style.display = "flex";
    setTimeout (() => {customAlert.style.display = "none";}, 1000);

  }
  function displayPopup(isbanned) {
    const banStudentsPopupContainer = document.getElementById("banStudentsPopupContainer");
    const banStudentButton = document.getElementById("banStudentButton");
    const unbaneStudentButton = document.getElementById("unbaneStudentButton");
    const banStudentsPopupHeader = document.getElementById("banStudentsPopupHeader");
    const banStudentsPopupText = document.getElementById("banStudentsPopupText");

    banStudentsPopupContainer.style.display = "flex";
    if(isbanned){
      banStudentsPopupHeader.textContent = studentName + " is currently Banned";
      banStudentsPopupText.textContent = "would you like to unban?";
      unbaneStudentButton.style.display = "flex";
      banStudentButton.style.display = "none";
    }
    else{
      banStudentsPopupHeader.textContent = studentName + " is currently not Banned";
      banStudentsPopupText.textContent = "would you like to ban?";
      unbaneStudentButton.style.display = "none";
      banStudentButton.style.display = "flex";

    }
    clearTimeout(popupTimer);
    popupTimer = setTimeout (() => {banStudentsPopupContainer.style.display = "none";}, 30000);


  }

  const banStudent = async (event) =>{
    event.preventDefault();
    docRef = await doc(db, "currentStudents", verified_data);
      await getDoc(docRef).then((docSnap) => {
      if (docSnap.exists()) {
        setDoc(doc(db, "bannedStudents", docSnap.data().ID),{
          ID: docSnap.data().ID,
          Name: docSnap.data().FirstName + " " + docSnap.data().LastName,
          dateBanned: serverTimestamp()
        })
        
      } else{
        displayIdEntryError("error retrieving data from database. Please re-enter ID");
      }
      cancelOperation(event);
  })
    cancelOperation(event);

  }

  const unbanStudent = async (event) =>{
    event.preventDefault();
    docRef = await doc(db, "bannedStudents", verified_data);
    if (docRef){
      deleteDoc(docRef);
    }
    else{
      displayIdEntryError("error retrieving data from database. Please re-enter ID");

    }
      cancelOperation(event);
    }


  const cancelOperation = async (event) =>{
    event.preventDefault();
    const banStudentsPopupContainer = document.getElementById("banStudentsPopupContainer");
    event.preventDefault();
    banStudentsPopupContainer.style.display = "none";
  }

  return (
    <>
      <Navbar />

      <div className="settings-container">
        <h1>Settings</h1>

        <section className="modify-student-body">
          <h2 className="test">Modify Student Body</h2>
          <button
            onClick={() =>
              document.getElementById("studentFileInput").click()
            }
          >
            Import Student Body
          </button>
          <input
            id="studentFileInput"
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />


          <br /><br />
          <h2>Modify Equipment</h2>
          <button
            onClick={() => setShowGymPopup(true)}
          >
            Import Equipment CSV
          </button>
        </section>
        <input
          id="equipmentFileInput"
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleEquipmentImport}
        />
        {showGymPopup && (

          <div className="popup-overlay">

            <div className="popup-box">

              <h2>Select Gym</h2>

              <button
                onClick={() => {

                  setSelectedGym("westerlin");

                  setShowGymPopup(false);

                  document
                    .getElementById("equipmentFileInput")
                    .click();

                }}
              >
                Westerlin Gym
              </button>

              <button
                onClick={() => {

                  setSelectedGym("pepsico");

                  setShowGymPopup(false);

                  document
                    .getElementById("equipmentFileInput")
                    .click();

                }}
              >
                PepsiCo Center
              </button>

              <br /><br />

              <button
                onClick={() => setShowGymPopup(false)}
              >
                Cancel
              </button>

            </div>

          </div>

        )}
        <section className="banStudentsButtonContainer">
          <h2 className="banStudentsHeader"> Ban/Unban students </h2>
          <form className="IDSearchForm" onSubmit={handleSubmission}>
              <input
              id="studentInputForm"
              className="studentInputForm"
              type="password"
              ref={null}
              value={studentId}
              placeholder="Enter Student ID"
              onChange={(e) => updateStudentID(e.target.value)}
              onKeyDown={handleKeyDown}

            />
          <button 
          className="selectStudentButton">Search ID</button>
          </form>

        <div id="banStudentsPopupContainer" className="banStudentsPopupContainer">
          <div className="banStudentsPopupBackground">
          <div className="banStudentsPopup">
            <h2 id="banStudentsPopupHeader"></h2>
            <p id="banStudentsPopupText"></p>
            <button 
              className="banStudentButton" 
              id="banStudentButton"
              onClick={banStudent}
              >Ban</button>
            <button 
              className = "cancelOperationButton" 
              id="cancelOpertaionButton"
              onClick={cancelOperation}
              >cancel</button>
            <button 
              className="unbaneStudentButton" 
              id="unbaneStudentButton"
              onClick={unbanStudent}
              >Unban</button>

          </div>
        </div>
        </div>
        </section>
          <div className="customAlert" id="customAlert">
            <div className="alertContent" id="alertContent">
              <h2 className="alertHeading">ID entry error</h2>
              <p id="alertText"></p>
            </div>
          </div>

      </div>
    </>
  );
};

export default Settings;