// THIS CODE WAS CODED WITH HELP FROM GEMINI

import Navbar from "./Navigation.jsx";
import { useState, useEffect, useRef, useCallback } from "react";
import "../components/Equipment.css";
import ValidateSwipe from "../components/ValidateSwipe.js";
import ToastContainer from "../components/ToastContainer";
import NavDropdown from "../components/NavDropdown.jsx";

// IMPORT HASH UTILITY: Reusing the hashing function from your settings configuration
import { hashId } from "../components/HashId.js";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    addDoc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";
import { db } from "../Firebase.js";
const currentStudentsRef = collection(db, "currentStudents");
const checkoutHistoryRef = collection(db, "checkoutHistory");


export default function Equipment({ gym, updateGym }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [returningId, setReturningId] = useState(null);
    const [toasts, setToasts] = useState([]);

    const [studentId, setStudentId] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [availableEquipment, setAvailableEquipment] = useState([]);
    const [activeCheckouts, setActiveCheckouts] = useState([]);

    const idInputRef = useRef(null);
    const toastIdRef = useRef(0);


    const pepsicoInventoryRef = collection(db, "pepsicoEquipmentInventory");
    const westerlinInventoryRef = collection(db, "westerlinEquipmentInventory");
    const pepsicoCheckoutRef = collection(db, "pepsicoCheckouts");
    const westerlinCheckoutRef = collection(db, "westerlinCheckouts");


    const getInventoryCollection = () => {
        if (gym === "PepsiCo Center") return pepsicoInventoryRef;
        if (gym === "Westerlin Gym") return westerlinInventoryRef;
        return null;
    };


    const getCheckoutCollection = () => {
        if (gym === "PepsiCo Center") return pepsicoCheckoutRef;
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

    useEffect(() => {
        const focusInterval = setInterval(() => {
            if (
                document.activeElement.tagName !== "INPUT" &&
                document.activeElement.tagName !== "SELECT"
            ) {
                idInputRef.current?.focus();
            }
        }, 5000);

        idInputRef.current?.focus();

        return () => clearInterval(focusInterval);
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

        try {
            // Validate the swipe card first inside the catch block
            const validation = await ValidateSwipe(studentId);
            if (!validation.isValid) {
                addToast("error", "ID Denied", validation.reasonDenied);
                setStudentId("");
                setSelectedEquipment("");
                idInputRef.current?.focus();
                return;
            }

            const studentName = validation.name;
            const verifiedData = validation.studentId; 
            const inventoryRef = getInventoryCollection();
            const checkoutRef = getCheckoutCollection();

            // Generate the hashed ID safely
            const hashedId = verifiedData ? await hashId(String(verifiedData).trim()) : "";

            // Target doc using the selected strict document ID instead of the item name string
            const equipmentDocRef = doc(inventoryRef, selectedEquipment);
            const equipmentSnap = await getDoc(equipmentDocRef);
            
            if (!equipmentSnap.exists()) {
                addToast("error", "Database Error", "Selected equipment item could not be found.");
                return;
            }

            const equipmentData = equipmentSnap.data();
            if (equipmentData.available < quantity) {
                addToast("error", "Equipment Unavailable", "Not enough equipment available");
                return;
            }

            // Decrement availability count
            await updateDoc(equipmentDocRef, {
                available: equipmentData.available - quantity
            });

            // Write into checkouts collection
            const newCheckoutDocRef = await addDoc(checkoutRef, {
                studentId: hashedId,
                studentName,
                equipment: equipmentData.name, // Save human-readable name for logging lists
                quantity,
                checkoutTime: serverTimestamp(),
                returned: false
            });

            // Write into checkoutHistory collection, keyed by the same doc ID
            // so handleReturn can find and update this record later
            await setDoc(doc(checkoutHistoryRef, newCheckoutDocRef.id), {
                name: studentName,
                item: equipmentData.name,
                location: gym,
                time: serverTimestamp(),
                ifReturned: false
            });

            addToast("success", "Checkout Successful", `${studentName} checked out ${quantity} ${equipmentData.name}(s)`);

            // Clear states and re-fetch UI data arrays
            fetchInventory();
            fetchCheckouts();
            setStudentId("");
            setSelectedEquipment("");
            setQuantity(1);

            idInputRef.current?.focus();

        } catch (error) {
            console.error("Checkout process encountered an error: ", error);
            addToast("error", "Checkout Failed", "An error occurred during checkout execution.");
        } finally {
            // Unlocks processing screen regardless of failures or successes above
            setIsProcessing(false);
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

            // Find item by mapping the name back or using matching systems
            // If your checkouts map by name strings, we search through the array to locate the exact Doc ID
            const exactEquipmentDoc = availableEquipment.find(item => item.name === checkoutData.equipment);
            
            if (!exactEquipmentDoc) {
                console.error("Could not trace back inventory item ID by name.");
                return;
            }

            const equipmentDocRef = doc(inventoryRef, exactEquipmentDoc.id);
            const equipmentSnap = await getDoc(equipmentDocRef);
            const equipmentData = equipmentSnap.data();

            await updateDoc(equipmentDocRef, {
                available: equipmentData.available + checkoutData.quantity
            });
            await updateDoc(checkoutDocRef, {
                returned: true,
                returnTime: serverTimestamp()
            });
            await updateDoc(doc(checkoutHistoryRef, id), {
                ifReturned: true
            });

            await fetchInventory();
            await fetchCheckouts();
        } catch (error) {
            console.error(error);
        } finally {
            setReturningId(null);
        }
    };

    const labelStyle = { display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "0.875rem", color: "#444" };
    const inputStyle = { borderRadius: "10px", width: "100%", padding: "12px 16px", border: "1px solid #e2e8f0", boxSizing: "border-box", fontSize: "0.95rem", outline: "none", background: "white" };


    return (
        <>
            <div className="page">

                <div className="layout" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", height: "calc(100vh - 102px)", boxSizing: "border-box" }}>

                    <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>

                        {/* Left: New Checkout Form */}
                        <div className="card" style={{ flex: 1, minHeight: 0 }}>
                            <div className="card-header">
                                <h2>New Checkout</h2>
                                <NavDropdown
                                    options={["PepsiCo Center", "Westerlin Gym"]}
                                    defaultOption={gym}
                                    onChange={updateGym}
                                />
                            </div>

                            <div className="card-body" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <div>
                                    <label style={labelStyle}>Student ID</label>
                                    <input
                                        ref={idInputRef}
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
                                            <option key={item.id} value={item.id}>{item.name}</option>
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
                                    disabled={isProcessing}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: isProcessing ? "#ccc" : "#002F6C",
                                        color: "white",
                                        fontSize: "0.9375rem",
                                        fontWeight: "600",
                                        cursor: isProcessing ? "not-allowed" : "pointer",
                                        opacity: isProcessing ? 0.6 : 1,
                                        transition: "background 0.2s",
                                    }}
                                >
                                    {isProcessing ? "Processing..." : "Checkout"}
                                </button>
                            </div>
                        </div>

                        {/* Right: Inventory with Progress Bars */}
                        <div className="card" style={{ flex: 1, minHeight: 0 }}>
                            <div className="card-header">
                                <h2>Inventory Status</h2>
                            </div>
                            <div className="card-body">
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
                                            <div key={item.id}>
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
                    </div>

                    {/* Bottom: Full Width Active Checkouts */}
                    <div className="card active-checkouts-card" style={{ flex: "0 0 210px" }}>
                        <div className="card-header">
                            <h2>Active Checkouts</h2>
                        </div>

                        <div className="card-body">
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
            </div>

            <ToastContainer
                toasts={toasts}
                removeToast={removeToast}
            />
        </>
    );
}