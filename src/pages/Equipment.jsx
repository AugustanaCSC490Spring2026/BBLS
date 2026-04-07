import Navbar from "./Navigation.jsx";
import { useState } from "react";
import "../components/Equipment.css";
import { db } from "../Firebase.js";

export default function Equipment() {
    const [studentId, setStudentId] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [quantity, setQuantity] = useState(1);

    const [activeCheckouts, setActiveCheckouts] = useState([]);

    const availableEquipment = [
        { name: "Basketball", available: 12, total: 15 },
        { name: "Volleyball", available: 8, total: 10 },
        { name: "Soccer Ball", available: 5, total: 8 },
    ];
    //handleCheckout will validate the input and create a new checkout record in Firestore
    const handleCheckout = () => {
        alert(`Feature to be Added`);
    };
    //handleReturn will mark a checkout as returned in Firestore
    const handleReturn = (id) => {
        alert(`Feature to be Added`);
    };
    //handleImportCSV will allow the user to import checkout data from a CSV file
    const handleImportCSV = () => {
        
    }
    //handleExportCSV will allow the user to export checkout data to a CSV file
    const handleExportCSV = () => {
        
    }

    return (
        <>
            <Navbar />
            <div className="page">
                <div className = "page-header">
                <div className = "left"><h2>Equipment Checkout</h2></div>
                
                <div className = "right">
                    <button>Import CSV</button>
                    <button>Export CSV</button>
                </div>
                </div>

                <div className="layout">
                    <div className="card">
                        <div className = "card-header">
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
                            onChange={(e) => setQuantity(e.target.value)}
                        />

                        <button onClick={handleCheckout}>Checkout</button>
                    </div>
                    <div className="card">
                        <div className = "card-header">
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
                    <div className = "card-header">    
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