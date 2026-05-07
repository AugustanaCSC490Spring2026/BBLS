// Everything pertaining to importing csv files in this file was generated with help from ChatGPT

import React, { useState, useEffect, useRef, useCallback } from "react";
// PapaParse is used to read and convert CSV into JavaScript objects
import Papa from "papaparse";

// Navigation component
import Navbar from "./Navigation.jsx";

// Firebase setup
import { db } from "../Firebase.js";

// Firestore tools 
import { doc, writeBatch, collection, serverTimestamp, getDoc, deleteDoc, setDoc, getDocs } from "firebase/firestore";

import "../components/Settings.css";

import ToastContainer from "../components/ToastContainer.jsx";


const bannedStudentsRef = collection(db, "bannedStudents");
const currentStudentsRef = collection(db, "currentStudents");

import { add } from "firebase/firestore/pipelines";




const Settings = () => {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0); // Add this to track unique IDs

  const addToast = (type, title, message) => {
    const newToast = {
      id: toastIdRef.current++,
      type,
      title,
      message,
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      return updated.slice(-7); // Keep only the 7 newest toasts
    });
    setTimeout(() => {
      removeToast(newToast.id);
    }, 4000);
  };

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, [setToasts]);

  const [showGymPopup, setShowGymPopup] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [bannedStudents, setBannedStudents] = useState([]);
  let [possibleStudents, updatePossibleStudents] = useState([]);

  useEffect(() => {
    updateBannedStudentsList();
    createListOfPossibleStudents();
  }, []);

  const updateBannedStudentsList = async () => {
    const docSnap = await getDocs(bannedStudentsRef);
    const bannedList = docSnap.docs.map(
      (doc) => doc.data().FirstName + " " + doc.data().LastName + "  | unban Date: " + doc.data().dateToBeUnbanned
    );
    setBannedStudents(bannedList); // use state instead of direct DOM manipulation
    //updatePossibleStudents(bannedList)
  };

  const createListOfPossibleStudents = async (input) =>{
    const docSnap = await getDocs(currentStudentsRef);
    let listOfPossibleStudents = [];
    const studentList = docSnap.docs.map(
      (doc) => doc.data().Email
    );
    updatePossibleStudents(studentList);
  }

  // Helper function to clear the currentStudents collection within firestore when a CSV is uploaded
  const clearCollection = async (collectionName) => {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);

    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
      count++;

      // Firestore batch limit
      if (count === 500) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  };

  // Handles when a user selects a file for updating current students
  const handleFileChange = (event) => {

    // Get the selected file
    const file = event.target.files[0];

    // If no file is selected, exit early
    if (!file) return;

    // Validate file type (must be CSV)
    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      addToast("error", "Invalid File", "Please upload a valid .csv file.");
      // alert("Please upload a valid .csv file.");
      event.target.value = null; // Reset file input
      return;
    }

    // Parse the CSV file into usable data
    Papa.parse(file, {
      header: true,           // First row becomes column headers (keys)
      skipEmptyLines: true,   // Ignore empty rows

      // Runs when parsing is complete
      complete: async (results) => {
        const data = results.data;

        //  Confirmation before wiping database
        const confirmUpload = window.confirm(
          "This will DELETE all existing students and replace them with the uploaded CSV.\n\nAre you sure you want to continue?"
        );

        if (!confirmUpload) {
          addToast("error", "Upload Cancelled", "The student body upload has been cancelled.");
          // alert("Upload cancelled.");
          event.target.value = null; // Removes selected file if cancelled
          return;
        }

        // Clear existing collection
        await clearCollection("currentStudents");

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
        addToast("success", "Upload Complete", `Success: ${successCount}, Failed: ${failCount}`);
        // alert(
        //   `Upload complete!\nSuccess: ${successCount}\nFailed: ${failCount}`
        // );

        // Removes the upload file after upload
        event.target.value = null;
      },

      // Runs if CSV parsing fails
      error: (err) => {
        console.error("CSV Parse Error:", err);
        addToast("error", "CSV Parse Error", "There was an error parsing the CSV file. Please check the file format and try again.");
        // alert("Error parsing CSV file.");
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
      addToast("error", "Invalid File", "Please upload a valid .csv file.");
      // alert("Please upload a valid .csv file.");
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

        addToast("success", "Equipment Upload Complete", `Gym: ${selectedGym} \nFailed: ${failCount}`);
        // alert(
        //   `Equipment Upload Complete!\nGym: ${selectedGym} \nFailed: ${failCount}`
        // );

        event.target.value = null;

      }
    });
  };
  let studentEmail;
  let studentName;
  let verified_data;
  let studentEntered;
  let studentEnteredID;
  let swipeOutput;
  let docRef;
  let differentReasonBanned;
  //verify ID
  const handleKeyDown = (input) => {
    if (input.key === "enter") {
      //addToast("error", "Enter Key Pressed", "Please click the 'Search ID' button to submit the student ID.");
      // window.alert("enter key");
      input.preventDefault();
      handleSubmission();
    }
  }
  function updateStudentIdentifier(input) {
    studentEmail = input;
  }
  const handleSubmission = async (event) => {
    event.preventDefault();

    /*
    try {
      studentEmail = studentEmail.trim();
    } catch {
      console.log("error");
      swipeOutput = "no ID entered";
      displayIdEntryError(swipeOutput);
      return;
    }
      */


    updateStudentIdentifier(studentEmail);

    let isbanned;
    // checks ID to ensure it has the right number of characters
    verified_data = studentEmail;
    let studentList = await getDocs(currentStudentsRef);
    //loops through all the current students to find one that matches
    let foundStudent = false;
    studentList.forEach((student) => {
      if (student.data().Email == studentEmail) {
        studentEntered = student;
        foundStudent = true;
      }
    })
    //displays error if student is not found
    if (studentEntered == null) {
      displayIdEntryError("No student has the entered id or username");
      document.getElementById("studentInputForm").value = "";
      updateStudentIdentifier("");
      return;
    }
    else {
      //collects student name and ID to use later
      studentName = studentEntered.data().FirstName + " " + studentEntered.data().LastName;
      studentEnteredID = studentEntered.data().ID;
      //checks to see if the student is banned
      docRef = doc(db, "bannedStudents", studentEnteredID);
      getDoc(docRef).then((docSnap) => {
        //if student is banned gives only option to unban
        //if student is not banned only gives option to ban
        if (!docSnap.exists()) {
          isbanned = false;
          displayPopup(isbanned);
        }
        else {
          isbanned = true;
          differentReasonBanned = docSnap.data().reasonBanned;
          displayPopup(isbanned);
          console.log(docSnap.data().reasonBanned);
        }
      })
    }
    updateStudentIdentifier("");
    setStudentId(studentEnteredID);

  }

  function displayIdEntryError(swipeOutput) {
    const customAlert = document.getElementById("customAlert");
    const alertText = document.getElementById("alertText");
    alertText.textContent = swipeOutput;
    customAlert.style.display = "flex";
    setTimeout(() => { customAlert.style.display = "none"; }, 1400);

  }

  let dateStudentIsUnbanned;
  function setUnbanDate(input) {
    dateStudentIsUnbanned = input;
  }

  function displayPopup(isbanned) {
    const banStudentsPopupContainer = document.getElementById("banStudentsPopupContainer");
    const banStudentButton = document.getElementById("banStudentButton");
    const unbanStudentButton = document.getElementById("unbanStudentButton");
    const banStudentsPopupHeader = document.getElementById("banStudentsPopupHeader");
    const banStudentsPopupText = document.getElementById("banStudentsPopupText");
    const banStudentReasonStatememnt = document.getElementById("banStudentReasonStatememnt");
    const banStudentReasonForm = document.getElementById("banStudentReasonForm");
    const unbanDateStatement = document.getElementById("unbanDateStatement");
    const unbanDateInput = document.getElementById("unbaneDateInput");
    const banStudentReason = document.getElementById("banStudentReason");

    /*if the student is banned displays only the unban and cancel buttons
      if the student is not banned displays only the ban and cancel buttons as well
      as why the student is being banned and the date the student is to be unbanned
      */
    
    if (isbanned) {
      banStudentsPopupHeader.textContent = studentName + " is currently banned.";
      banStudentsPopupText.textContent = "Would you like to unban this student?";
      banStudentReason.textContent = "reason Banned: " + differentReasonBanned;
      banStudentReason.style.display = "flex";
      unbanStudentButton.style.display = "flex";
      banStudentButton.style.display = "none";
      banStudentReasonStatememnt.style.display = "none";
      banStudentReasonForm.style.display = "none";
      unbanDateStatement.style.display = "none";
      unbanDateInput.style.display = "none";


    }
    else {
      banStudentsPopupHeader.textContent = studentName + " is currently not banned.";
      banStudentsPopupText.textContent = "Would you like to ban this student?";
      unbanStudentButton.style.display = "none";
      banStudentReason.style.display = "none";
      banStudentButton.style.display = "flex";
      banStudentReasonStatememnt.style.display = "flex";
      banStudentReasonForm.style.display = "flex";
      unbanDateStatement.style.display = "flex";
      unbanDateInput.style.display = "flex";
      setUnbanDate(new Date().toLocaleDateString('en-CA'));
      unbanDateInput.value = new Date().toLocaleDateString('en-CA');
    }
    banStudentsPopupContainer.style.display = "flex";
  }

  //sets a second studentID variable that is in scope

  let studentId

  function setStudentId(input) {
    studentId = input;
  }

  //functions to store the reason why the student was banned and when they are to be unbanned
  let reasonStudentBanned;
  function updateReasonBanned(input) {
    reasonStudentBanned = input;
  }

  function setUnbanDate(input) {
    dateStudentIsUnbanned = input;
    console.log(input);
  }

  //bans student
  const banStudent = async (event) => {
    event.preventDefault();
    //grabs student info from the students database
    if (reasonStudentBanned == undefined) {
      reasonStudentBanned = "no reason given";
    }
    docRef = await doc(db, "currentStudents", studentId);
    await getDoc(docRef).then((docSnap) => {
      if (docSnap.exists()) {
        //stores relevent info into the banned students database
        setDoc(doc(db, "bannedStudents", docSnap.data().ID), {
          ID: docSnap.data().ID,
          Email: docSnap.data().Email,
          FirstName: docSnap.data().FirstName,
          LastName: docSnap.data().LastName,
          reasonBanned: reasonStudentBanned,
          dateBanned: new Date().toLocaleDateString('en-CA'),
          dateToBeUnbanned: dateStudentIsUnbanned
        })
      } else {
        displayIdEntryError("error retrieving data from database. Please try again or contact support if error persists");
      }
      //runs the cancel operation function to remove the popup
      cancelOperation(event);
    })
    cancelOperation(event);

  }
  //unbans student
  const unbanStudent = async (event) => {
    event.preventDefault();
    //checks to see if student is in the banned students database
    docRef = await doc(db, "bannedStudents", studentEnteredID);
    if (docRef) {
      //deletes student from database
      deleteDoc(docRef);
    }
    else {
      displayIdEntryError("error retrieving data from database. Please try again or contact support if error persists");

    }
    //runs the cancel operation function to remove the popup
    cancelOperation(event);
  }


  const cancelOperation = async (event) => {
    //removes the popup that displays option to ban/unban student
    event.preventDefault();
    const banStudentsPopupContainer = document.getElementById("banStudentsPopupContainer");
    event.preventDefault();
    banStudentsPopupContainer.style.display = "none";
    //refresh the list of banned students
    updateBannedStudentsList();
    //clear input forms and set values default
    document.getElementById("studentInputForm").value = "";
    document.getElementById("banStudentReasonForm").value = "";
    updateReasonBanned("no reason given");
    updateStudentIdentifier("")
  }



  return (
    <>
      <div className="settings-container">
        <section className="modify-student-body">
          <h1>Settings</h1>
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
        <div className="customAlert" id="customAlert">
          <div className="alertContent" id="alertContent">
            <h2 className="alertHeading">ID entry error</h2>
            <p id="alertText"></p>
          </div>
        </div>
        <section className="banStudentsButtonContainer">
          <h2 className="banStudentsHeader"> Ban/Unban students </h2>
          <form className="IDSearchForm" onSubmit={handleSubmission}>
            <input
              id="studentInputForm"
              className="studentInputForm"
              type="text"
              list="possibleStudents"
              value={studentEmail}
              placeholder="Enter Student username"
              onChange={(e) => updateStudentIdentifier(e.target.value)}
              onKeyDown={handleKeyDown}

            />
            <datalist id="possibleStudents">
              {possibleStudents.map((name, i) => (
                  <option key={i} value={name}></option>
              ))}
            </datalist>
            <button
              className="selectStudentButton">Search username</button>
          </form>

          <div id="banStudentsPopupContainer" className="banStudentsPopupContainer">
            <div className="banStudentsPopupBackground">
              <div className="banStudentsPopup">
                <h2 id="banStudentsPopupHeader">If you see this there is a bug</h2>
                <p id="banStudentReason"> Reason stuydent was banned</p>
                <p
                  id="banStudentReasonStatememnt"
                  className="banStudentReasonStatememnt">Why would you like to ban this student?</p>
                <input
                  className="banStudentReasonForm"
                  id="banStudentReasonForm"
                  type="text"
                  value={reasonStudentBanned}
                  placeholder="Enter reason Student is to be banned"
                  onChange={(e) => updateReasonBanned(e.target.value)}
                ></input>
                <p
                  id="unbanDateStatement"
                  className="unbanDateStatement"> Enter Date Student should be Unbanned</p>
                <input
                  id="unbaneDateInput"
                  className="unbaneDateInput"
                  type="Date"
                  onChange={(e) => setUnbanDate(e.target.value)}
                ></input>
                <p id="banStudentsPopupText"></p>
                {/* Wrap buttons in this new div */}
                <div className="popup-button-group">
                  <button
                    className="banStudentButton"
                    id="banStudentButton"
                    onClick={banStudent}
                  >Ban</button>

                  <button
                    className="unbanStudentButton"
                    id="unbanStudentButton"
                    onClick={unbanStudent}
                  >Unban</button>

                  <button
                    className="cancelOperationButton"
                    id="cancelOperationButton"
                    onClick={cancelOperation}
                  >Cancel</button>
                </div>

              </div>
            </div>
          </div>
          <div className="bannedStudentsListContainer">
            <div className="bannedStudentsHeader">
              <h2 className="bannedStudentsListHeader">Currently Banned Students</h2>
              <button className="bannedStudentsListRefreshButton" onClick={updateBannedStudentsList}>Refresh</button>
            </div>

            <div className="bannedStudentsList" id="bannedStudentsList">
              {bannedStudents.map((name, i) => (
                <p key={i}>{name}</p>
              ))}
            </div>
          </div>
        </section>
      </div>
      <ToastContainer
        toasts={toasts}
        removeToast={removeToast}
      />
    </>
  );
};

export default Settings;