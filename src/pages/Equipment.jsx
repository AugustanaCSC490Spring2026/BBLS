// THIS CODE WAS CODED WITH HELP FROM GEMINI

import Navbar from "./Navigation.jsx";
import { useState, useEffect, useRef, useCallback } from "react";
import "../components/Equipment.css";
import ValidateSwipe from "../components/ValidateSwipe.js";
import ToastContainer from "../components/ToastContainer";
import NavDropdown from "../components/NavDropdown.jsx";

// IMPORT HASH UTILITY: Reusing the hashing function from your settings configuration

import {
    collection,
    doc,
    getDocs,
    runTransaction,
    serverTimestamp,
    updateDoc
} from "firebase/firestore";
import { db } from "../Firebase.js";
const checkoutHistoryRef = collection(db, "checkoutHistory");

const NOTE_MAX_LENGTH = 200;

// SAFETY: a card scanned while a note field has focus types the raw student ID
// into it and presses Enter. IDs must never be stored in plaintext.
function noteContainsId(note) {
    return /\d{7}/.test(note);
}

function capitalizeFirst(str) {
    if (!str) return str;
    return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}


export default function Equipment({ gym, updateGym }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [returningId, setReturningId] = useState(null);
    const [toasts, setToasts] = useState([]);

    const [studentId, setStudentId] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState("");
    const [editingNote, setEditingNote] = useState(null);
    const [isSavingNote, setIsSavingNote] = useState(false);
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
        if (noteContainsId(note)) {
            setNote("");
            addToast("error", "Note Not Saved", "Notes cannot contain a student ID. Scan IDs into the Student ID field.");
            idInputRef.current?.focus();
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
            const inventoryRef = getInventoryCollection();
            const checkoutRef = getCheckoutCollection();

            const hashedId = validation.hashedId;

            // Target doc using the selected strict document ID instead of the item name string
            const equipmentDocRef = doc(inventoryRef, selectedEquipment);
            // History shares this ID so handleReturn can find the record later
            const checkoutDocRef = doc(checkoutRef);
            let equipmentName;

            const failure = await runTransaction(db, async (tx) => {
                const equipmentSnap = await tx.get(equipmentDocRef);
                if (!equipmentSnap.exists()) {
                    return { title: "Database Error", message: "Selected equipment item could not be found." };
                }

                const equipmentData = equipmentSnap.data();
                if (equipmentData.available < quantity) {
                    return { title: "Equipment Unavailable", message: "Not enough equipment available" };
                }
                equipmentName = equipmentData.name;

                tx.update(equipmentDocRef, { available: equipmentData.available - quantity });
                tx.set(checkoutDocRef, {
                    studentId: hashedId,
                    studentName,
                    equipment: equipmentData.name, // Save human-readable name for logging lists
                    quantity,
                    note: note.trim(),
                    checkoutTime: serverTimestamp(),
                    returned: false
                });
                tx.set(doc(checkoutHistoryRef, checkoutDocRef.id), {
                    name: studentName,
                    item: equipmentData.name,
                    location: gym,
                    time: serverTimestamp(),
                    ifReturned: false
                });
                return null;
            });

            if (failure) {
                addToast("error", failure.title, failure.message);
                fetchInventory();
                return;
            }

            addToast("success", "Checkout Successful", `${studentName} checked out ${quantity} ${equipmentName}(s)`);

            // Clear states and re-fetch UI data arrays
            fetchInventory();
            fetchCheckouts();
            setStudentId("");
            setSelectedEquipment("");
            setQuantity(1);
            setNote("");

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

            const failure = await runTransaction(db, async (tx) => {
                const checkoutSnap = await tx.get(checkoutDocRef);
                if (!checkoutSnap.exists()) {
                    return { title: "Not Found", message: "Checkout record not found." };
                }

                const checkoutData = checkoutSnap.data();
                if (checkoutData.returned) {
                    return { title: "Already Returned", message: "This checkout was already returned." };
                }

                // Checkouts store the item name, so map it back to the inventory doc ID
                const exactEquipmentDoc = availableEquipment.find(item => item.name === checkoutData.equipment);
                if (!exactEquipmentDoc) {
                    return { title: "Not Found", message: `${checkoutData.equipment} is not in this gym's inventory.` };
                }

                const equipmentDocRef = doc(inventoryRef, exactEquipmentDoc.id);
                const equipmentSnap = await tx.get(equipmentDocRef);
                if (!equipmentSnap.exists()) {
                    return { title: "Not Found", message: "Equipment item could not be found." };
                }

                tx.update(equipmentDocRef, { available: equipmentSnap.data().available + checkoutData.quantity });
                tx.update(checkoutDocRef, { returned: true, returnTime: serverTimestamp() });
                // Clients cannot read checkoutHistory, and older checkouts may have no
                // history doc, so merge instead of update to avoid aborting the return.
                tx.set(doc(checkoutHistoryRef, id), { ifReturned: true }, { merge: true });
                return null;
            });

            if (failure) addToast("error", failure.title, failure.message);

            await fetchInventory();
            await fetchCheckouts();
        } catch (error) {
            console.error(error);
            addToast("error", "Return Failed", "An error occurred while returning this item.");
        } finally {
            setReturningId(null);
        }
    };

    const saveNote = async () => {
        if (isSavingNote || !editingNote) return;
        if (noteContainsId(editingNote.text)) {
            setEditingNote({ ...editingNote, text: "" });
            addToast("error", "Note Not Saved", "Notes cannot contain a student ID.");
            return;
        }

        setIsSavingNote(true);
        try {
            await updateDoc(doc(getCheckoutCollection(), editingNote.id), { note: editingNote.text.trim() });
            setEditingNote(null);
            await fetchCheckouts();
        } catch (error) {
            console.error(error);
            addToast("error", "Note Not Saved", "An error occurred while saving this note.");
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleNoteKeyDown = (event) => {
        if (event.key === "Enter") saveNote();
        if (event.key === "Escape") setEditingNote(null);
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

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <div style={{ flex: "0 0 100px" }}>
                                        <label style={labelStyle}>Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            style={inputStyle}
                                            value={quantity}
                                            onChange={(e) => setQuantity(Number(e.target.value))}
                                        />
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <label style={labelStyle}>Note (optional)</label>
                                        <input
                                            type="text"
                                            maxLength={NOTE_MAX_LENGTH}
                                            placeholder="e.g. Taken with paddles"
                                            style={inputStyle}
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                        />
                                    </div>
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
                                                    <span>{capitalizeFirst(item.name)}</span>
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
                                            <div className="checkout-info">
                                                <strong>{item.studentName}</strong>
                                                <p>{item.equipment} {" x"}{item.quantity}</p>
                                                {editingNote?.id === item.id ? (
                                                    <div className="checkout-note-edit">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            aria-label={`Note for ${item.studentName}`}
                                                            maxLength={NOTE_MAX_LENGTH}
                                                            value={editingNote.text}
                                                            onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })}
                                                            onKeyDown={handleNoteKeyDown}
                                                        />
                                                        <button className="checkout-note-button" onClick={saveNote} disabled={isSavingNote}>
                                                            {isSavingNote ? "Saving..." : "Save"}
                                                        </button>
                                                        <button className="checkout-note-button" onClick={() => setEditingNote(null)} disabled={isSavingNote}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    item.note && <p className="checkout-note">{item.note}</p>
                                                )}
                                            </div>
                                            <div className="checkout-actions">
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
                                                {editingNote?.id !== item.id && (
                                                    <button
                                                        className="checkout-note-button"
                                                        onClick={() => setEditingNote({ id: item.id, text: item.note || "" })}
                                                    >
                                                        {item.note ? "Edit note" : "Add note"}
                                                    </button>
                                                )}
                                            </div>
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