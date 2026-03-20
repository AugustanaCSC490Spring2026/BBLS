import { useEffect, useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import "../components/Navbar.css";
import logo from '../assets/logo.png';

function Navbar() {
  const [role, setRole] = useState("");
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="logo">
          <img src={logo} alt="Logo" width={60} height={60}/>
          <h1>Augustana Campus Recreation</h1>
        </div>
        {!isLoginPage && (
          <div className="nav-links">
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
        )}
      </div>
    </nav>
  );
}

export default Navbar;