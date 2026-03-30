import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
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
    <>
      <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link
            href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
            rel="stylesheet"
            />
        </head>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/Location" element={<Location onSelectGym={handleGymChange} />} />
          <Route path="/dashboard" element={<Dashboard gym={selectedGym} updateGym={handleGymChange} />} />
          <Route path="/analytics" element={<Analytics gym={selectedGym} updateGym={handleGymChange} />} />
        </Routes>
      </BrowserRouter>
  </>
  );
}

export default App;