// THIS CODE WAS CODED WITH HELP FROM GEMINI

import Navbar from "./Navigation.jsx";
import { useState, useEffect, useRef, useCallback } from "react"; // Added useRef
import "../components/Equipment.css";
import ValidateSwipe from "../components/ValidateSwipe.js";
import Papa from "papaparse";
import ToastContainer from "../components/ToastContainer";
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
    const [toasts, setToasts] = useState([]);

    const [studentId, setStudentId] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [availableEquipment, setAvailableEquipment] = useState([]);
    const [activeCheckouts, setActiveCheckouts] = useState([]);

    // 1. Create the Ref for the Student ID input
    const idInputRef = useRef(null);
    const toastIdRef = useRef(0);


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

    const addToast = (type, title, message) => {
        const newToast = {
            id: toastIdRef.current++,
            type,
            title,
            message,
        };

        setToasts((prev) => {
            const updated = [...prev, newToast];
            if (updated.length > 7) {
                // This keeps the 7 newest items. 
                // The "oldest" of these 7 stays at index 0 (the top).
                return updated.slice(-7); 
            }
            return updated;
        });
    };

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);


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

    // 2. Set up the Auto-Focus Interval (runs every 5 seconds)
    useEffect(() => {
        const focusInterval = setInterval(() => {
            // Only grab focus if the user isn't currently using a different input field
            if (
                document.activeElement.tagName !== "INPUT" &&
                document.activeElement.tagName !== "SELECT"
            ) {
                idInputRef.current?.focus();
            }
        }, 5000);

        // Focus immediately on page load
        idInputRef.current?.focus();

        return () => clearInterval(focusInterval); // Cleanup when leaving page
    }, []);


    useEffect(() => {
        if (gym) {
            fetchInventory();
            fetchCheckouts();
        }
    }, [gym]);


    const handleCheckout = async () => {
        if (isProcessing) return;
        if (!studentId || !selectedEquipment || quantity <= 0) {
            addToast("error", "Form Error", "Please fill in all fields");
            return;
        }
        setIsProcessing(true);
        const validation = await ValidateSwipe(studentId, getDoc, doc, db);
        if (!validation.isValid) {
            addToast("error", "ID Denied", validation.reasonDenied);
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
                addToast("error", "Equipment Unavailable", "Not enough equipment available");
                return;
            }

            await updateDoc(equipmentDocRef, {
                available: equipmentData.available - quantity
            });

            addToast("success", "Checkout Successful", `${studentName} checked out ${quantity} ${selectedEquipment}(s)`);

            await addDoc(checkoutRef, {
                studentId,
                studentName,
                equipment: selectedEquipment,
                quantity,
                checkoutTime: serverTimestamp(),
                returned: false
            });

            fetchInventory();
            fetchCheckouts();
            setStudentId("");
            setSelectedEquipment("");
            setQuantity(1);

            // Refocus ID box after checkout
            idInputRef.current?.focus();

        } catch (error) {
            console.error(error);
            addToast("error", "Checkout Failed", "An error occurred during checkout");
        } finally {
        setIsProcessing(false); // 3. Re-enable the button
        }
    };

    const handleReturn = async (id) => {
        if (returningId) return;

        try {
            setReturningId(id);
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
            setReturningId(null);
        }
    };

    const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.9rem", textAlign: "left" };
    const inputStyle = { borderRadius: "8px", width: "100%", padding: "10px", marginBottom: "15px", border: "1px solid #ccc", boxSizing: "border-box" };


    return (
        <>
            <div className="page">

                <div className="layout" style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px" }}>

                    <div style={{ display: "flex", gap: "20px", width: "100%", alignItems: "stretch" }}>

                        {/* Left: New Checkout Form */}
                        <div className="card" style={{ flex: 1, minHeight: "450px", display: "flex", flexDirection: "column" }}>
                            <div className="card-header">
                                <h2>New Checkout</h2>
                            </div>

                            <div>
                                <label style={labelStyle}>Student ID</label>
                                <input
                                    ref={idInputRef} // 3. Attached the Ref here
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

                            <button 
                                onClick={handleCheckout} 
                                disabled={isProcessing} // Disable while processing
                                style={{ 
                                    borderRadius: "8px", 
                                    marginTop: "auto", 
                                    padding: "12px", 
                                    cursor: isProcessing ? "not-allowed" : "pointer",
                                    opacity: isProcessing ? 0.6 : 1, // Visual feedback
                                    backgroundColor: isProcessing ? "#ccc" : "" // Optional: change color
                                }}
                            >
                                {isProcessing ? "Processing..." : "Checkout"}
                            </button>
                        </div>

                        {/* Right: Modern Inventory with Progress Bars */}
                        <div className="card" style={{ flex: 1, minHeight: "450px" }}>
                            <div className="card-header">
                                <h2 style={{ marginBottom: "20px" }}>Inventory Status</h2>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                                {availableEquipment.map(item => {
                                    const percentage = item.total > 0 ? (item.available / item.total) * 100 : 0;
                                    const barWidth = Math.min(percentage, 100);

                                    let barColor = "#52b788";
                                    if (percentage < 25 || item.available === 0) {
                                        barColor = "#ff4d4d";
                                    } else if (percentage < 50) {
                                        barColor = "#ffd166";
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
                            <div className="checkout-grid">
                                {activeCheckouts.map(item => (
                                    <div key={item.id} className="checkout">
                                        <div>
                                            <strong>{item.studentName}</strong>
                                            <p>{item.equipment} {" x"}{item.quantity}</p>
                                        </div>
                                        <button
                                            onClick={() => handleReturn(item.id)}
                                            disabled={returningId !== null}
                                            style={{
                                                opacity: returningId !== null ? 0.6 : 1,
                                                cursor: returningId !== null ? "not-allowed" : "pointer",
                                                minWidth: "100px"
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
            <ToastContainer
                toasts={toasts}
                removeToast={removeToast}
            />
        </>
    );
}