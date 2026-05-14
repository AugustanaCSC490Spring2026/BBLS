// Everything pertaining to importing csv files in this file was generated with help from ChatGPT

import React, { useState, useEffect, useRef, useCallback } from "react";
// PapaParse is used to read and convert CSV into JavaScript objects
import Papa from "papaparse";

// Navigation component
import Navbar from "./Navigation.jsx";

// Firebase setup
import { db } from "../Firebase.js";

// Firestore tools
import { doc, writeBatch, collection, serverTimestamp, getDoc, deleteDoc, setDoc, getDocs, addDoc, updateDoc } from "firebase/firestore";

import "../components/Settings.css";

import ToastContainer from "../components/ToastContainer.jsx";
import AddInventoryPopup from "../components/AddInventoryPopup.jsx";
import RemoveInventoryPopup from "../components/RemoveInventoryPopup.jsx";
import NavDropdown from "../components/NavDropdown.jsx";


const bannedStudentsRef = collection(db, "bannedStudents");
const currentStudentsRef = collection(db, "currentStudents");
const adminListRef = collection(db, "authorized_users");

import { add } from "firebase/firestore/pipelines";
import { getAdditionalUserInfo } from "firebase/auth";




const Settings = () => {
  const [toasts, setToasts] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = (type, title, message) => {
    const newToast = {
      id: toastIdRef.current++,
      type,
      title,
      message,
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      return updated.slice(-7);
    });
    setTimeout(() => {
      removeToast(newToast.id);
    }, 4000);
  };

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, [setToasts]);

  const [equipmentGym, setEquipmentGym] = useState("Pepsi-Co Center");
  const [bannedStudents, setBannedStudents] = useState([]);
  const [possibleStudents, updatePossibleStudents] = useState([]);
  const [isAdminPopupOpen, setIsAdminPopupOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [isRemoveInventoryOpen, setIsRemoveInventoryOpen] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState([]);

  const pepsicoInventoryRef = collection(db, "pepsicoEquipmentInventory");
  const westerlinInventoryRef = collection(db, "westerlinEquipmentInventory");

  const getInventoryCollection = () => {
    if (equipmentGym === "Pepsi-Co Center") return pepsicoInventoryRef;
    if (equipmentGym === "Westerlin Gym") return westerlinInventoryRef;
    return null;
  };

  const fetchInventory = async () => {
    const inventoryRef = getInventoryCollection();
    if (!inventoryRef) return;
    const snapshot = await getDocs(inventoryRef);
    const equipmentList = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    setAvailableEquipment(equipmentList);
  };

  useEffect(() => {
    updateBannedStudentsList();
    createListOfPossibleStudents();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [equipmentGym]);

  const updateBannedStudentsList = async () => {
    const docSnap = await getDocs(bannedStudentsRef);
    const bannedList = docSnap.docs.map((d) => ({
      id: d.data().ID,
      name: d.data().FirstName + " " + d.data().LastName,
      unbanDate: d.data().dateToBeUnbanned,
    }));
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
  ;
  const unbanStudentById = async (studentId, studentName) => {
    const ref = doc(db, "bannedStudents", studentId);
    await deleteDoc(ref);
    addToast("success", "Student Unbanned", studentName + " has been unbanned.");
    updateBannedStudentsList();
  };

  const handleRemoveInventory = async ({ itemName, quantity: qty }) => {
    const inventoryRef = getInventoryCollection();
    if (!inventoryRef) return;

    try {
      const snapshot = await getDocs(inventoryRef);
      const existingDoc = snapshot.docs.find(
        (d) => d.data().name?.toLowerCase() === itemName.toLowerCase()
      );

      if (!existingDoc) {
        addToast("error", "Item Not Found", `${itemName} was not found in inventory`);
        return;
      }

      const data = existingDoc.data();
      const newAvailable = data.available - qty;
      const newTotal = data.total - qty;

      if (newTotal <= 0) {
        await deleteDoc(doc(inventoryRef, existingDoc.id));
        addToast("success", "Item Removed", `${itemName} removed from inventory`);
      } else {
        await updateDoc(doc(inventoryRef, existingDoc.id), {
          available: newAvailable,
          total: newTotal,
        });
        addToast("success", "Inventory Updated", `Removed ${qty} ${itemName}(s)`);
      }

      fetchInventory();
    } catch (error) {
      console.error(error);
      addToast("error", "Update Failed", "Could not update inventory");
    }
  };

  const handleAddInventory = async ({ itemName, quantity: qty }) => {
    const inventoryRef = getInventoryCollection();
    if (!inventoryRef) return;

    try {
      const snapshot = await getDocs(inventoryRef);
      const existingDoc = snapshot.docs.find(
        (d) => d.data().name?.toLowerCase() === itemName.toLowerCase()
      );

      if (existingDoc) {
        const data = existingDoc.data();
        await updateDoc(doc(inventoryRef, existingDoc.id), {
          available: data.available + qty,
          total: data.total + qty,
        });
        addToast("success", "Inventory Updated", `Added ${qty} more ${itemName}(s)`);
      } else {
        await addDoc(inventoryRef, {
          name: itemName,
          available: qty,
          total: qty,
        });
        addToast("success", "New Item Added", `${itemName} added to inventory`);
      }

      fetchInventory();
    } catch (error) {
      console.error(error);
      addToast("error", "Update Failed", "Could not update inventory");
    }
  };

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

        // Removes the upload file after upload
        event.target.value = null;
      },

      // Runs if CSV parsing fails
      error: (err) => {
        console.error("CSV Parse Error:", err);
        addToast("error", "CSV Parse Error", "There was an error parsing the CSV file. Please check the file format and try again.");
      }
    });
  };

  

  const handleEquipmentImport = (event) => {

    const file = event.target.files[0];

    if (!file || !equipmentGym) return;
    if (
      file.type !== "text/csv" &&
      !file.name.toLowerCase().endsWith(".csv")
    ) {
      addToast("error", "Invalid File", "Please upload a valid .csv file.");
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
          equipmentGym === "Westerlin Gym"
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

        addToast("success", "Equipment Upload Complete", `Gym: ${equipmentGym} \nFailed: ${failCount}`);

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

  const handleKeyDown = (input) => {
    if (input.key === "enter") {
      input.preventDefault();
      handleSubmission();
    }
  }
  function updateStudentIdentifier(input) {
    studentEmail = input;
  }
  const handleSubmission = async (event) => {
    event.preventDefault();

    updateStudentIdentifier(studentEmail);

    let isbanned;
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
      addToast("error", "ID Not Found", "No student has the entered id or username.");
      // displayIdEntryError("No student has the entered id or username");
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
          displayPopup(isbanned, docSnap);
        }
        else {
          isbanned = true;
          differentReasonBanned = docSnap.data().reasonBanned;
          displayPopup(isbanned, docSnap);
          console.log(docSnap.data().reasonBanned);
        }
      })
    }
    updateStudentIdentifier("");
    setStudentId(studentEnteredID);

  }

  let dateStudentIsUnbanned;
  function setUnbanDate(input) {
    dateStudentIsUnbanned = input;
  }

  // function displayIdEntryError(swipeOutput) {
  //   const customAlert = document.getElementById("customAlert");
  //   const alertText = document.getElementById("alertText");
  //   alertText.textContent = swipeOutput;
  //   customAlert.style.display = "flex";
  //   setTimeout(() => { customAlert.style.display = "none"; }, 1000);

  // }

  function displayPopup(isbanned, enteredStudent) {
    const banStudentsPopupContainer = document.getElementById("banStudentsPopupContainer");
    const banStudentButton = document.getElementById("banStudentButton");
    const unbanStudentButton = document.getElementById("unbanStudentButton");
    const banStudentsPopupHeader = document.getElementById("banStudentsPopupHeader");
    const banStudentsPopupText = document.getElementById("banStudentsPopupText");
    const banStudentReasonStatememnt = document.getElementById("banStudentReasonStatememnt");
    const banStudentReasonForm = document.getElementById("banStudentReasonForm");
    const unbanDateStatement = document.getElementById("unbanDateStatement");
    const unbanDateInput = document.getElementById("unbaneDateInput");

    /*if the student is banned displays only the unban and cancel buttons
      if the student is not banned displays only the ban and cancel buttons as well
      as why the student is being banned and the date the student is to be unbanned
      */
    
    if (isbanned) {
      banStudentsPopupHeader.textContent = studentName + " is currently banned.";
      banStudentsPopupText.textContent = "Would you like to unban this student or edit information?";
      unbanStudentButton.style.display = "flex";
      let date = enteredStudent.data().dateToBeUnbanned;
      setUnbanDate(date);
      unbanDateInput.value = date;
      let reasonBanned = enteredStudent.data().reasonBanned;
      banStudentReasonForm.value = reasonBanned;
      banStudentButton.textContent = "edit ban"
    }
    else {
      banStudentsPopupHeader.textContent = studentName + " is currently not banned.";
      banStudentsPopupText.textContent = "Would you like to ban this student?";
      unbanStudentButton.style.display = "none";
      banStudentButton.textContent = "ban"
      let date = new Date();
      date.setDate(date.getDate() + 1);
      date = date.toLocaleDateString('en-CA');
      setUnbanDate(date);
      unbanDateInput.value = date;
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

  const fetchAdminList = async () => {
    const snapshot = await getDocs(adminListRef);
    const admins = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    setAdminList(admins);
  };

  const banStudent = async (event) => {
    event.preventDefault();
    if (reasonStudentBanned == undefined) {
      reasonStudentBanned = "no reason given";
    }
    docRef = await doc(db, "currentStudents", studentId);
    await getDoc(docRef).then((docSnap) => {
      if (docSnap.exists()) {
        setDoc(doc(db, "bannedStudents", docSnap.data().ID), {
          ID: docSnap.data().ID,
          Email: docSnap.data().Email,
          FirstName: docSnap.data().FirstName,
          LastName: docSnap.data().LastName,
          reasonBanned: reasonStudentBanned,
          dateBanned: new Date().toLocaleDateString('en-CA'),
          dateToBeUnbanned: dateStudentIsUnbanned
        })
        addToast("success", "Student Banned", studentName + " has been banned.");
      } else {
        addToast("error", "Database Error", "Error retrieving data from database. Please try again or contact support if error persists.");
        // displayIdEntryError("error retrieving data from database. Please try again or contact support if error persists");
      }
      cancelOperation(event);
    })
    cancelOperation(event);
  }

  const unbanStudent = async (event) => {
    event.preventDefault();
    docRef = await doc(db, "bannedStudents", studentEnteredID);
    if (docRef) {
      deleteDoc(docRef);
      addToast("success", "Student Unbanned", studentName + " has been unbanned.");
    }
    else {
      displayIdEntryError("error retrieving data from database. Please try again or contact support if error persists");

    }
    cancelOperation(event);
  }

  const cancelOperation = async (event) => {
    event.preventDefault();
    const banStudentsPopupContainer = document.getElementById("banStudentsPopupContainer");
    banStudentsPopupContainer.style.display = "none";
    updateBannedStudentsList();
    document.getElementById("studentInputForm").value = "";
    document.getElementById("banStudentReasonForm").value = "";
    updateReasonBanned("no reason given");
    updateStudentIdentifier("")
  }



  return (
    <>
      <div className="settings-page">
        <div className="settings-cards">

          {/* Left Card: Students */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Students</h2>
            </div>

            <div className="settings-section">
              <h3 className="settings-section-title">Import Student Body</h3>
              <p className="settings-section-desc">Replace the current student list with a new CSV file.</p>
              <button onClick={() => document.getElementById("studentFileInput").click()}>
                Import Student CSV
              </button>
              <input
                id="studentFileInput"
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            <div className="settings-section">
              <h3 className="settings-section-title">Ban / Unban Students</h3>
              <form className="IDSearchForm" onSubmit={handleSubmission}>
                <input
                  id="studentInputForm"
                  className="studentInputForm"
                  type="text"
                  list="studentList"
                  ref={null}
                  value={studentEmail}
                  placeholder="Enter Student username"
                  onChange={(e) => updateStudentIdentifier(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="selectStudentButton">Search username</button>
              </form>
              <datalist id="studentList">
                {possibleStudents.map((name, i) => (
                  <option key={i} value={name}></option>
                ))
                }
              </datalist>

              <div className="bannedStudentsHeader">
                <h3 className="bannedStudentsListHeader">Currently Banned Students</h3>
              </div>
              <div className="bannedStudentsList" id="bannedStudentsList">
                {bannedStudents.map((student, i) => (
                  <div key={i} className="bannedStudentRow">
                    <p className="bannedStudentName">{student.name}</p>
                    <p className="bannedStudentDate">Unban: {student.unbanDate}</p>
                    <button
                      className="unbanListButton"
                      onClick={() => unbanStudentById(student.id, student.name)}
                    >Unban</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Equipment + Administrative stacked */}
        <div className="settings-column">

          {/* Equipment Card */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Equipment</h2>
              <NavDropdown
                options={["Pepsi-Co Center", "Westerlin Gym"]}
                defaultOption={equipmentGym}
                onChange={setEquipmentGym}
              />
            </div>

            <div className="settings-section">
              <h3 className="settings-section-title">Import Equipment CSV</h3>
              <p className="settings-section-desc">Upload a CSV to set the full inventory for a gym.</p>
              <button onClick={() => document.getElementById("equipmentFileInput").click()}>
                Import Equipment CSV
              </button>
            </div>

            <div className="settings-section">
              <h3 className="settings-section-title">Add Inventory</h3>
              <p className="settings-section-desc">Add individual items to the selected gym's inventory.</p>
              <button onClick={() => setIsAddInventoryOpen(true)}>
                Add Inventory
              </button>
            </div>

            <div className="settings-section">
              <h3 className="settings-section-title">Remove from Inventory</h3>
              <p className="settings-section-desc">Remove individual items from the selected gym's inventory.</p>
              <button onClick={() => setIsRemoveInventoryOpen(true)}>
                Remove from Inventory
              </button>
            </div>
          </div>

          {/* Administrative Card */}
          <div className="settings-card administrative-card">
            <div className="settings-card-header">
              <h2>Administrative</h2>
            </div>
            <div className="settings-section">
              <h3 className="settings-section-title">Manage Administrators</h3>
              <p className="settings-section-desc">Manage system access and roles.</p>
              <button
                className="add-admin-button"
                onClick={() => { setIsAdminPopupOpen(true); fetchAdminList(); }}
              >
                Edit Administrators
              </button>
            </div>
          </div>

        </div>

        </div>

        {/* Hidden file inputs */}
        <input
          id="equipmentFileInput"
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleEquipmentImport}
        />

        {/* ID entry error alert */}
        <div className="customAlert" id="customAlert">
          <div className="alertContent" id="alertContent">
            <h2 className="alertHeading">ID entry error</h2>
            <p id="alertText"></p>
          </div>
        </div>

        {/* Ban/Unban popup */}
        <div id="banStudentsPopupContainer" className="banStudentsPopupContainer">
          <div className="banStudentsPopupBackground">
            <div className="banStudentsPopup">
              <h2 id="banStudentsPopupHeader">If you see this there is a bug</h2>
              <p id="banStudentsPopupText" className="banStudentsPopupText"></p>
              <p
                id="banStudentReasonStatememnt"
                className="banStudentReasonStatememnt">reason student is to be banned</p>
              <input
                className="banStudentReasonForm"
                id="banStudentReasonForm"
                type="text"
                value={reasonStudentBanned}
                placeholder="Enter reason Student is to be banned"
                onChange={(e) => updateReasonBanned(e.target.value)}
              />
              <p
                id="unbanDateStatement"
                className="unbanDateStatement"> Date Student is to be Unbanned</p>
              <input
                id="unbaneDateInput"
                className="unbaneDateInput"
                type="Date"
                onChange={(e) => setUnbanDate(e.target.value)}
              />
              <div className="popup-button-group">
                <button
                  className="banStudentButton"
                  id="banStudentButton"
                  onClick={banStudent}
                >Ban</button>
                <button
                  className="cancelOperationButton"
                  id="cancelOperationButton"
                  onClick={cancelOperation}
                >Cancel</button>
                <button
                  className="unbanStudentButton"
                  id="unbanStudentButton"
                  onClick={unbanStudent}
                >Unban</button>
                
              </div>
            </div>
          </div>
        </div>

        {/* ── Admin Popup ── */}
        {isAdminPopupOpen && (
          <div className="adminPopupOverlay" onClick={() => setIsAdminPopupOpen(false)}>
            <div className="adminPopup" onClick={(e) => e.stopPropagation()}>
              <button className="adminPopupClose" onClick={() => setIsAdminPopupOpen(false)}>✕</button>
              <h2>Manage Administrators</h2>
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {adminList.length === 0
                    ? <tr><td colSpan="2">No administrators found.</td></tr>
                    : [...adminList].sort((a, b) => b.isAdmin - a.isAdmin).map((admin, i) => (
                        <tr key={i}>
                          <td>{admin.email || admin.Email || admin.id}</td>
                          <td>{admin.isAdmin ? "Admin" : "Desk Worker"}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <AddInventoryPopup
        isOpen={isAddInventoryOpen}
        onClose={() => setIsAddInventoryOpen(false)}
        onSubmit={handleAddInventory}
        availableEquipment={availableEquipment}
      />

      <RemoveInventoryPopup
        isOpen={isRemoveInventoryOpen}
        onClose={() => setIsRemoveInventoryOpen(false)}
        onSubmit={handleRemoveInventory}
        availableEquipment={availableEquipment}
      />

      <ToastContainer
        toasts={toasts}
        removeToast={removeToast}
      />
    </>
  );
};

export default Settings;