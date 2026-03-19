import React, { useState, useRef, useEffect } from "react";
import {db} from '../Firebase.js'
import { addDoc, collection } from "firebase/firestore";
import Navbar from "./Navigation.jsx";
import "../components/Dashboard.css";
import { FunnelChart } from "recharts";

const validSwipeInRef = collection(db, 'swipeIns')
const invalidSwipeInRef = collection(db, 'invalidSwipeIns')

function Dashboard() {
  const [studentId, setStudentId] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    
  }, []);

  

useEffect(() => {

    const focusInterval = setInterval(() => {
      // If the current focused element is NOT our input, focus it!
      if (document.activeElement !== inputRef.current) {
        console.log("Refocusing input...");
        inputRef.current?.focus();
      }
    }, 5000); // 5000ms = 5 seconds

    // Cleanup: Stop the interval if the user navigates away from this page
    return () => clearInterval(focusInterval);
  }, []);

  const handleKeyDown = (input) => {
    if (input.key === "Enter") {
      input.preventDefault(); // Prevent form submission
      handleSubmission();
    }
  };

  const handleSubmission = (event) => { 
    // to not let the page refresh
    if (event) {
      event.preventDefault();
    }
    let swipeValid = false;

    const temp_input = studentId.trim();
    setStudentId(temp_input);

        // vars for data entry
    let timeStamp = new Date();
    timeStamp = timeStamp.toLocaleString();

    
    console.log(temp_input.length);
    let verified_data;
    if (temp_input.length != 7 && temp_input.length != 16) {
      alert("Invalid ID: " + temp_input);
      console.log("Invalid ID: " + temp_input);
      verified_data = temp_input;
      swipeValid = false;
    } else if (temp_input.length == 7) {
      verified_data = temp_input;
      console.log("Accepted, Entered ID: " + verified_data);
      swipeValid = true;
    } else {
      verified_data = temp_input.slice(3, 10);
      console.log("Accepted, Entered ID: " + verified_data);
      swipeValid = true;
    }
    
    storeSwipeIn(swipeValid, verified_data, timeStamp);

    // resets data of student ID and the textField
    setStudentId('');
    //focuses the text field
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

  }
    //saves data to firebase
  function storeSwipeIn(swipeValid, verified_data, timeStamp){
    if (swipeValid){
    console.log("this is true");
    addDoc(validSwipeInRef, {
      ID: verified_data,
      swipeInTime: timeStamp,
    })
  }
    if (!swipeValid){
          console.log("This is false");
          console.log(verified_data, timeStamp);
      addDoc(invalidSwipeInRef, {
      ID: verified_data,
      swipeInTime: timeStamp,
    })
    }
  }


  return (
    <>
      <Navbar />
      <div className="Dashboard">
          <div className="swipe-card">
            <h2>Swipe In</h2>

            <form>

              <label>Student ID</label>
              <input
                type="password"
                ref={inputRef}
                placeholder="Enter Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />

              <button type="submit" onClick={handleSubmission} className="swipe-button">
                Check In
              </button>

            </form>
          </div>
        </div>
    </>
  );
}

export default Dashboard;