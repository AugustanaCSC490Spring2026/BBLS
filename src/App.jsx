import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Equipment from "./pages/Equipment";
import Settings from "./pages/Settings";
import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Location from "./pages/Location";
import logo from './assets/logo.png';
import Navbar from "./pages/Navigation.jsx";



function App() {
  // Add this inside App(), before the useState
  const stored = localStorage.getItem("selectedGym");
  if (stored === "Pepsi-Co Center") localStorage.setItem("selectedGym", "PepsiCo Center");
  
  const [selectedGym, setSelectedGym] = useState(
    localStorage.getItem("selectedGym") || "PepsiCo Center"
  );
  const handleGymChange = (newGym) => {
    setSelectedGym(newGym);
    localStorage.setItem("selectedGym", newGym);
  };

  const overlaySwipeRef = useRef(null);
  return (
    <>
      <title>Augustana Recreation</title>
      <link rel="icon" type="image/x-icon" href={logo}></link>
      <AuthProvider>
        <BrowserRouter>
          <Navbar
            currentGym={selectedGym}
            onGymChange={handleGymChange}
          />


          <Routes>
            <Route path="/" element={<Login />} />

            <Route
              path="/location"
              element={
                <ProtectedRoute>
                  <Location onSelectGym={handleGymChange} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard
                    gym={selectedGym}
                    updateGym={handleGymChange}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Analytics gym={selectedGym} updateGym={handleGymChange} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/equipment"
              element={
                <ProtectedRoute>
                  <Equipment gym={selectedGym} updateGym={handleGymChange} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}
export default App;