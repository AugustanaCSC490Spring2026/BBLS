import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Equipment from "./pages/Equipment";
import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Location from "./pages/Location";

function App() {
  const [selectedGym, setSelectedGym] = useState(
    localStorage.getItem("selectedGym") || "Pepsi-Co Center"
  );
  const handleGymChange = (newGym) => {
    setSelectedGym(newGym);
    localStorage.setItem("selectedGym", newGym);
  };
  return (
  <AuthProvider>
    <BrowserRouter>
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
              <Dashboard gym={selectedGym} updateGym={handleGymChange} />
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
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
}
export default App;