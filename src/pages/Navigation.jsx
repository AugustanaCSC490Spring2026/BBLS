import { useEffect, useState } from "react";
import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import "../components/Navbar.css";
import logo from '../assets/logo.png';
import { useAuth } from "../AuthContext.jsx";
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from "firebase/auth";

import signOutIcon from "../assets/signout.png";

function Navbar({}) {
    const auth = getAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleSignOut = () => {
        signOut(auth)
            .then(() => {
                console.log("User signed out successfully");
                navigate("/");
            })
            .catch((error) => {
                console.error("Error signing out: ", error);
            });
    }

    const { isAdmin } = useAuth();
    const [role, setRole] = useState("");
    const location = useLocation();
    const navigate = useNavigate();
    const hideNavbarRoutes = ["/Location"];
    const hideNavbar = ['/'];
    const shouldShowNavbar = !hideNavbar.includes(location.pathname);
    const shouldShowNavbarRoutes = !hideNavbarRoutes.includes(location.pathname);

    useEffect(() => {
        const storedRole = localStorage.getItem("role");
        setRole(storedRole);
    }, []);

    // Close the mobile menu whenever the route changes
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    return (
        <>
        { shouldShowNavbar && (
            <nav className="navbar">
                <div className="nav-container">
                    <div className="logo">
                        <img src={logo} alt="Logo" width={44} height={44} />
                        <h1>Augie Campus Recreation</h1>
                    </div>

                    {shouldShowNavbarRoutes && (
                        <>
                            <button
                                className={`nav-toggle ${menuOpen ? "open" : ""}`}
                                onClick={() => setMenuOpen(!menuOpen)}
                                aria-label="Toggle navigation menu"
                                aria-expanded={menuOpen}
                            >
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>

                            <div className={`nav-menu ${menuOpen ? "open" : ""}`}>
                                <div className="nav-links">
                                    <NavLink to="/dashboard" className="nav-item">
                                        Swipe In
                                    </NavLink>
                                    <NavLink to="/equipment" className="nav-item">
                                        Equipment Checkout
                                    </NavLink>
                                    {isAdmin && (
                                        <NavLink to="/analytics" className="nav-item">
                                            Analytics
                                        </NavLink>
                                    )}
                                    {isAdmin && (
                                        <NavLink to="/settings" className="nav-item">
                                            Settings
                                        </NavLink>
                                    )}
                                </div>

                                <div className="nav-right">
                                    <button className="sign-out-button" onClick={handleSignOut}>
                                        Sign Out <img src={signOutIcon} alt="" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </nav>
        )}
        </>
    );
}

export default Navbar;;