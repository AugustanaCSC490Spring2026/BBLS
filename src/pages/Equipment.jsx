// THIS CODE WAS CODED WITH HELP FROM GEMINI

import Navbar from "./Navigation.jsx";
import { useState, useEffect, useRef, useCallback } from "react";
import "../components/Equipment.css";
import ValidateSwipe from "../components/ValidateSwipe.js";
import Papa from "papaparse";
import ToastContainer from "../components/ToastContainer";
import NavDropdown from "../components/NavDropdown.jsx";
import AddInventoryPopup from "../components/AddInventoryPopup.jsx"; // ← NEW

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

    // ← NEW: controls the Add Inventory popup
    const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);

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

            idInputRef.current?.focus();

        } catch (error) {
            console.error(error);
            addToast("error", "Checkout Failed", "An error occurred during checkout");
        } finally {
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

    // ← NEW: handles submission from the Add Inventory popup
    const handleAddInventory = async ({ itemName, quantity: qty }) => {
        const inventoryRef = getInventoryCollection();
        if (!inventoryRef) return;

        try {
            // Check if the item already exists in the current gym's DB
            const snapshot = await getDocs(inventoryRef);
            const existingDoc = snapshot.docs.find(
                (d) => d.data().name?.toLowerCase() === itemName.toLowerCase()
            );

            if (existingDoc) {
                // Item exists — add to both available and total
                const data = existingDoc.data();
                await updateDoc(doc(inventoryRef, existingDoc.id), {
                    available: data.available + qty,
                    total: data.total + qty,
                });
                addToast("success", "Inventory Updated", `Added ${qty} more ${itemName}(s)`);
            } else {
                // Brand-new item — create a new document
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
                                <NavDropdown
                                    options={["Pepsi-Co Center", "Westerlin Gym"]}
                                    defaultOption={gym}
                                    onChange={updateGym}
                                />
                            </div>

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
                                disabled={isProcessing}
                                style={{
                                    borderRadius: "8px",
                                    marginTop: "auto",
                                    padding: "12px",
                                    cursor: isProcessing ? "not-allowed" : "pointer",
                                    opacity: isProcessing ? 0.6 : 1,
                                    backgroundColor: isProcessing ? "#ccc" : ""
                                }}
                            >
                                {isProcessing ? "Processing..." : "Checkout"}
                            </button>
                        </div>

                        {/* Right: Inventory with Progress Bars */}
                        <div className="card" style={{ flex: 1, minHeight: "450px" }}>
                            <div className="card-header">
                                <h2 style={{ marginBottom: "20px" }}>Inventory Status</h2>
                                {/* ← WIRED UP: opens the popup */}
                                <button onClick={() => setIsAddInventoryOpen(true)}>
                                    Add Inventory
                                </button>
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

            {/* ← NEW: Add Inventory Popup */}
            <AddInventoryPopup
                isOpen={isAddInventoryOpen}
                onClose={() => setIsAddInventoryOpen(false)}
                onSubmit={handleAddInventory}
                availableEquipment={availableEquipment}
            />

            <ToastContainer
                toasts={toasts}
                removeToast={removeToast}
            />
        </>
    );
}
