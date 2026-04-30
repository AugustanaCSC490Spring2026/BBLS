import { useEffect, useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import "../components/Navbar.css";
import logo from '../assets/logo.png';
import { NavDropdown } from "../components/NavDropdown.jsx";
import { useAuth } from "../AuthContext.jsx";
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from "firebase/auth";

import signOutIcon from "../assets/signout.png";

function Navbar({ currentGym, onGymChange}) {
    const auth = getAuth();
    // handleSignOut will sign the user out and navigate them back to the login page
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
    // isAdmin is a boolean that indicates whether the current user is an admin or not
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

    return (
        <>
        { shouldShowNavbar && (
            <nav className="navbar">
                <div className="nav-content">
                    <div className="logo">
                        <img src={logo} alt="Logo" width={60} height={60} />
                        <h1>Augie Campus Rec</h1>
                    </div>
                    {shouldShowNavbarRoutes && (
                        <>
                            <div className="nav-links">
                                {location.pathname !== "/analytics" && location.pathname !== "/settings" && (
                                    <NavDropdown
                                        options={["Pepsi-Co Center", "Westerlin Gym"]}
                                        defaultOption={currentGym}
                                        onChange={onGymChange} 
                                    />
                                )}
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
                                {isAdmin && (
                                    <Link to="/settings">
                                        Settings
                                    </Link>
                                )}
                            </div>
                            <button className="sign-out-button" onClick={handleSignOut}>
                                Sign Out  <img src={signOutIcon} alt="Sign Out" />
                            </button>
                        </>
                    )}
                </div>
            </nav>
            
        )}
        </>
    );
}

export default Navbar;