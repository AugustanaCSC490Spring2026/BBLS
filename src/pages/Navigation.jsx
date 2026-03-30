import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "../components/Navbar.css";
import logo from '../assets/logo.png';
import { NavDropdown } from "../components/dropDown.jsx";

function Navbar({ currentGym, onGymChange }) {
  const [role, setRole] = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
  }, []);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    localStorage.setItem("role", newRole);
    console.log("Role changed to:", newRole);
  };

  return (
    <>
        <nav className="navbar">
        <div className="nav-content">
            <div className="logo">
                <img src={logo} alt="Logo" className="logo-image" width={60} height={60}/>
                <h1>Augustana Recreation</h1>
            </div>
           
            <div className="nav-links">
            <NavDropdown 
              options={["Pepsi-Co Center", "Westerlin Gym"]} 
              defaultOption={currentGym} 
              onChange={onGymChange} 
            />

            <Link to="/dashboard" className="nav-item">
                Swipe In
            </Link>

            <Link to="/dashboard" className="nav-item">
                Equipment Checkout
            </Link>
            
            <Link to="/analytics" className="nav-item">
                Analytics
            </Link>

            </div>

        </div>
        </nav>
    </>
  );
}

export default Navbar;
