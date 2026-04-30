import Navbar from "./Navigation.jsx";
import { useState, useEffect } from "react";
import "../components/Equipment.css";
import ValidateSwipe from "../components/ValidateSwipe.js";
import Papa from "papaparse";
import {
   collection,
   doc,
   setDoc,
   getDocs,
   getDoc,
   updateDoc,
   addDoc,
   serverTimestamp
} from "firebase/firestore";
import { db } from "../Firebase.js";
const currentStudentsRef = collection(db, "currentStudents");


export default function Equipment({ gym, updateGym }) {
    const [isProcessing, setIsProcessing] = useState(false);
   const [returningId, setReturningId] = useState(null);   
   const [studentId, setStudentId] = useState("");
   const [selectedEquipment, setSelectedEquipment] = useState("");
   const [quantity, setQuantity] = useState(1);
   const [availableEquipment, setAvailableEquipment] = useState([]);
   const [activeCheckouts, setActiveCheckouts] = useState([]);


   const pepsicoInventoryRef = collection(db, "pepsicoEquipmentInventory");
   const westerlinInventoryRef = collection(db, "westerlinEquipmentInventory");
   const pepsicoCheckoutRef = collection(db, "pepsicoCheckouts");
   const westerlinCheckoutRef = collection(db, "westerlinCheckouts");


   const getInventoryCollection = () => {
       if (gym === "Pepsi-Co Center") return pepsicoInventoryRef;
       if (gym === "Westerlin Gym") return westerlinInventoryRef;
       return null;
   };


   const getCheckoutCollection = () => {
       if (gym === "Pepsi-Co Center") return pepsicoCheckoutRef;
       if (gym === "Westerlin Gym") return westerlinCheckoutRef;
       return null;
   };


   const fetchInventory = async () => {
       const inventoryRef = getInventoryCollection();
       if (!inventoryRef) return;
       const snapshot = await getDocs(inventoryRef);
       const equipmentList = snapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
       }));
       setAvailableEquipment(equipmentList);
   };


   const fetchCheckouts = async () => {
       const checkoutRef = getCheckoutCollection();
       if (!checkoutRef) return;
       const snapshot = await getDocs(checkoutRef);
       const checkoutList = snapshot.docs
           .map(doc => ({
               id: doc.id,
               ...doc.data()
           }))
           .filter(item => !item.returned);
       setActiveCheckouts(checkoutList);
   };


   useEffect(() => {
       if (gym) {
           fetchInventory();
           fetchCheckouts();
       }
   }, [gym]);


   const handleCheckout = async () => {
       if (!studentId || !selectedEquipment || quantity <= 0) {
            alert("Please fill all fields");
           return;
       }
       const validation = await ValidateSwipe(studentId, getDoc, doc, db);
       if (!validation.isValid) {
           alert(validation.reasonDenied);
           return;
       }
       const studentName = validation.name;
       const inventoryRef = getInventoryCollection();
       const checkoutRef = getCheckoutCollection();

       try {
           const equipmentDocRef = doc(inventoryRef, selectedEquipment);
           const equipmentSnap = await getDoc(equipmentDocRef);
           if (!equipmentSnap.exists()) return;
           
           const equipmentData = equipmentSnap.data();
           if (equipmentData.available < quantity) {
               alert("Not enough equipment available");
               return;
           }

           await updateDoc(equipmentDocRef, {
               available: equipmentData.available - quantity
           });

           await addDoc(checkoutRef, {
               studentId,
               studentName,
               equipment: selectedEquipment,
               quantity,
               checkoutTime: serverTimestamp(),
               returned: false
           });

           //alert("Checkout successful");
           fetchInventory();
           fetchCheckouts();
           setStudentId("");
           setSelectedEquipment("");
           setQuantity(1);
       } catch (error) {
           console.error(error);
           alert("Checkout failed");
       }
   };

const handleReturn = async (id) => {
    if (returningId) return; // Prevent any other clicks while one is processing

    try {
        setReturningId(id); // Set the specific ID being processed
        const checkoutRef = getCheckoutCollection();
        const inventoryRef = getInventoryCollection();
        
        const checkoutDocRef = doc(checkoutRef, id);
        const checkoutSnap = await getDoc(checkoutDocRef);
        const checkoutData = checkoutSnap.data();

        if (checkoutData.returned) return;

        const equipmentDocRef = doc(inventoryRef, checkoutData.equipment);
        const equipmentSnap = await getDoc(equipmentDocRef);
        const equipmentData = equipmentSnap.data();

        await updateDoc(equipmentDocRef, {
            available: equipmentData.available + checkoutData.quantity
        });
        await updateDoc(checkoutDocRef, {
            returned: true,
            returnTime: serverTimestamp()
        });

        await fetchInventory();
        await fetchCheckouts();
    } catch (error) {
        console.error(error);
    } finally {
        setReturningId(null); // Reset to null so buttons are active again
    }
};


//    const handleReturn = async (id) => {
//        const checkoutRef = getCheckoutCollection();
//        const inventoryRef = getInventoryCollection();
//        try {
//            const checkoutDocRef = doc(checkoutRef, id);
//            const checkoutSnap = await getDoc(checkoutDocRef);
//            const checkoutData = checkoutSnap.data();
//            const equipmentDocRef = doc(inventoryRef, checkoutData.equipment);
//            const equipmentSnap = await getDoc(equipmentDocRef);
//            const equipmentData = equipmentSnap.data();

//            await updateDoc(equipmentDocRef, {
//                available: equipmentData.available + checkoutData.quantity
//            });
//            await updateDoc(checkoutDocRef, {
//                returned: true,
//                returnTime: serverTimestamp()
//            });
//            fetchInventory();
//            fetchCheckouts();
//        } catch (error) {
//            console.error(error);
//        }
//    };

   // Shared styles for form labels and inputs
   const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.9rem", textAlign: "left" };
   const inputStyle = { borderRadius: "8px", width: "100%", padding: "10px", marginBottom: "15px", border: "1px solid #ccc", boxSizing: "border-box" };


   return (
       <>
           <div className="page">

               <div className="layout" style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px" }}>
                   
                   {/* Top Row: Form and Inventory Side-by-Side */}
                   <div style={{ display: "flex", gap: "20px", width: "100%", alignItems: "stretch" }}>
                       
                       {/* Left: New Checkout Form */}
                       <div className="card" style={{ flex: 1, minHeight: "450px", display: "flex", flexDirection: "column" }}>
                           <div className="card-header">
                               <h2>New Checkout</h2>
                           </div>
                           
                           <div>
                               <label style={labelStyle}>Student ID</label>
                               <input
                                   type="password"
                                   placeholder="Scan or Enter ID"
                                   style={inputStyle}
                                   value={studentId}
                                   onChange={(e) => setStudentId(e.target.value)}
                               />
                           </div>

                           <div>
                               <label style={labelStyle}>Select Equipment</label>
                               <select 
                                   style={inputStyle}
                                   value={selectedEquipment}
                                   onChange={(e) => setSelectedEquipment(e.target.value)}
                               >
                                   <option value="">Choose item...</option>
                                   {availableEquipment.map(item => (
                                       <option key={item.name} value={item.name}>{item.name}</option>
                                   ))}
                               </select>
                           </div>

                           <div>
                               <label style={labelStyle}>Quantity</label>
                               <input
                                   type="number"
                                   min="1"
                                   style={inputStyle}
                                   value={quantity}
                                   onChange={(e) => setQuantity(Number(e.target.value))}
                               />
                           </div>

                           <button onClick={handleCheckout} style={{ borderRadius: "8px", marginTop: "auto", padding: "12px", cursor: "pointer" }}>
                               Checkout
                           </button>
                       </div>

                       {/* Right: Modern Inventory with Progress Bars */}
                       <div className="card" style={{ flex: 1, minHeight: "450px" }}>
                           <div className="card-header">
                               <h2 style={{ marginBottom: "20px" }}>Inventory Status</h2>
                           </div>
                           <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                                {availableEquipment.map(item => {
                                    // Calculate percentage
                                    const percentage = item.total > 0 ? (item.available / item.total) * 100 : 0;
                                    const barWidth = Math.min(percentage, 100);

                                    // Determine color based on inventory levels
                                    let barColor = "#52b788"; // Default Green (>= 50%)
                                    if (percentage < 25 || item.available === 0) {
                                        barColor = "#ff4d4d"; // Red (< 25%)
                                    } else if (percentage < 50) {
                                        barColor = "#ffd166"; // Yellow (< 50%)
                                    }

                                    return (
                                        <div key={item.name}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: "600" }}>
                                                <span>{item.name}</span>
                                                <span style={{ color: "#666", fontSize: "0.9rem" }}>
                                                    {item.available}/{item.total} available
                                                </span>
                                            </div>
                                            <div style={{ width: "100%", backgroundColor: "#e0e0e0", borderRadius: "10px", height: "10px", overflow: "hidden" }}>
                                                <div style={{ 
                                                    width: `${barWidth}%`, 
                                                    backgroundColor: barColor, 
                                                    height: "100%",
                                                    borderRadius: "10px",
                                                    transition: "width 0.5s ease-out, background-color 0.3s ease"
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                           </div>
                       </div>
                   </div>

                   {/* Bottom: Full Width Active Checkouts */}
                   <div className="card active-checkouts-card" style={{ width: "100%" }}>
                        <div className="card-header">
                            <h2>Active Checkouts</h2>
                        </div>

                        {activeCheckouts.length === 0 ? (
                            <p className="empty-message">No active checkouts</p>
                        ) : (
                            /* Add this wrapper class: checkout-grid */
                            <div className="checkout-grid">
                                {activeCheckouts.map(item => (
                                    <div key={item.id} className="checkout">
                                        <div>
                                            <strong>{item.studentName}</strong>
                                            <p>{item.equipment} {" x"}{item.quantity}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleReturn(item.id)}
                                            disabled={returningId !== null} // Disable all buttons if ANY return is happening
                                            style={{
                                                opacity: returningId !== null ? 0.6 : 1,
                                                cursor: returningId !== null ? "not-allowed" : "pointer",
                                                minWidth: "100px" // Keeps the button size stable when text changes
                                            }}
                                        >
                                            {returningId === item.id ? "Returning..." : "Return"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
               </div>
           </div>
       </>
   );
}