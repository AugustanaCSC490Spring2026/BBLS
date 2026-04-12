import Navbar from "./Navigation.jsx";
import { useState } from "react";
import "../components/Equipment.css";
import Papa from "papaparse";
import { collection, doc, setDoc } from "firebase/firestore";
import { getDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "../Firebase.js";


export default function Equipment({ gym, updateGym }) {
    const [studentId, setStudentId] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [activeCheckouts, setActiveCheckouts] = useState([]);

    const pepsicoInventoryRef = collection(db, "pepsicoEquipmentInventory");
    const westerlinInventoryRef = collection(db, "westerlinEquipmentInventory");

    const pepsicoCheckoutRef = collection(db, "pepsicoCheckouts");
    const westerlinCheckoutRef = collection(db, "westerlinCheckouts");
    useEffect(() => {

        if (gym && gym !== "None Selected") {
            fetchInventory();
        }

    }, [gym]);
    const getInventoryCollection = () => {

        if (gym === "Pepsi-Co Center") {
            return pepsicoInventoryRef;
        }
        else if (gym === "Westerlin Gym") {
            return westerlinInventoryRef;
        }
        else {
            alert("No gym selected");
            return null;
        }

    };

    const getCheckoutCollection = () => {

        if (gym === "Pepsi-Co Center") {
            return pepsicoCheckoutRef;
        }
        else if (gym === "Westerlin Gym") {
            return westerlinCheckoutRef;
        }
        else {
            alert("No gym selected");
            return null;
        }

    };
    const [availableEquipment, setAvailableEquipment] = useState([]);
    //handleCheckout will validate the input and create a new checkout record in Firestore
    const handleCheckout = async () => {

        if (!studentId || !selectedEquipment || quantity <= 0) {
            alert("Please fill all fields");
            return;
        }

        const inventoryRef = getInventoryCollection();
        const checkoutRef = getCheckoutCollection();

        if (!inventoryRef || !checkoutRef) return;

        try {

            // Get equipment doc
            const equipmentDocRef = doc(
                inventoryRef,
                selectedEquipment
            );

            const equipmentSnap = await getDoc(equipmentDocRef);

            if (!equipmentSnap.exists()) {
                alert("Equipment not found");
                return;
            }

            const equipmentData = equipmentSnap.data();

            if (equipmentData.available < quantity) {
                alert("Not enough equipment available");
                return;
            }

            // Update inventory
            await updateDoc(equipmentDocRef, {
                available:
                    equipmentData.available - quantity
            });

            // Create checkout record
            await addDoc(checkoutRef, {
                studentId,
                equipment: selectedEquipment,
                quantity,
                checkoutTime: serverTimestamp(),
                returned: false
            });

            alert("Checkout successful");

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
    //handleReturn will mark a checkout as returned in Firestore
    const handleReturn = (id) => {
        alert(`Feature to be Added`);
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
    //handleImportCSV will allow the user to import checkout data from a CSV file
    const handleImportCSV = (event) => {

        const file = event.target.files[0];

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {

                const inventoryRef = getInventoryCollection();

                if (!inventoryRef) return;

                for (const row of results.data) {

                    const docRef = doc(
                        inventoryRef,
                        row.name
                    );

                    await setDoc(docRef, {
                        name: row.name,
                        total: Number(row.total),
                        available: Number(row.available)
                    });

                }

                alert("Inventory Imported Successfully");

                fetchInventory();

            }
        });

    };
    //handleExportCSV will allow the user to export checkout data to a CSV file
    const handleExportCSV = () => {

    }

    return (
        <>
            <Navbar
                currentGym={gym}
                onGymChange={updateGym}
            />
            <div className="page">
                <div className="page-header">
                    <div className="left"><h2>Equipment Checkout</h2></div>

                    <div className="right">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleImportCSV}
                        />
                        <button>Export CSV</button>
                    </div>
                </div>

                <div className="layout">
                    <div className="card">
                        <div className="card-header">
                            <h2>New Checkout</h2>
                        </div>

                        <input
                            placeholder="Student ID"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                        />

                        <select
                            value={selectedEquipment}
                            onChange={(e) => setSelectedEquipment(e.target.value)}
                        >
                            <option value="">Select Equipment</option>
                            {availableEquipment.map((item) => (
                                <option key={item.name}>{item.name}</option>
                            ))}
                        </select>

                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                        />

                        <button onClick={handleCheckout}>Checkout</button>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <h2>Inventory Status</h2>
                        </div>

                        {availableEquipment.map((item) => (
                            <div key={item.name} className="inventory-item">
                                <span>{item.name}</span>
                                <span>
                                    {item.available}/{item.total}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <h2>Active Checkouts</h2>
                        </div>

                        {activeCheckouts.map((item) => (
                            <div key={item.id} className="checkout">
                                <div>
                                    <strong>{item.studentId}</strong>
                                    <p>{item.equipment} x{item.quantity}</p>
                                    <p>{item.checkoutTime} → {item.dueTime}</p>
                                </div>

                                <button onClick={() => handleReturn(item.id)}>
                                    Return
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}