import { useEffect, useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import "../components/Navbar.css";
import logo from '../assets/logo.png';
import { NavDropdown } from "../components/NavDropdown.jsx";
import { useAuth } from "../AuthContext.jsx";
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from "firebase/auth";
import Login from "./Login.jsx";

function Navbar({ currentGym, onGymChange }) {
    const auth = getAuth();

    const handleSignOut = () => {
        signOut(auth)
        then(() => {
            console.log("User signed out successfully");
            navigate(Login);
        })
            .catch((error) => {
                console.error("Error signing out: ", error);
            });
    }
    const { isAdmin } = useAuth();
    const [role, setRole] = useState("");
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname === '/';

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
        <nav className="navbar">
            <div className="nav-content">
                <div className="logo">
                    <img src={logo} alt="Logo" width={60} height={60} />
                    <h1>Augustana Campus Recreation</h1>
                </div>
                {!isLoginPage && (
                    <>
                        <div className="nav-links">
            <NavDropdown 
              options={["Pepsi-Co Center", "Westerlin Gym"]} 
              defaultOption={currentGym} 
              onChange={onGymChange} 
            />
                            <Link to="/dashboard" className="nav-item">
                                Swipe In
                            </Link>
                            <Link to="/equipment" className="nav-item">
                                Equipment Checkout
                            </Link>
                            {isAdmin && (
                                <Link to="/analytics">
                                    Analytics
                                </Link>
                            )}
                        </div>
                        <button className="sign-out-button" onClick={handleSignOut}>
                            Sign Out
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Navbar;