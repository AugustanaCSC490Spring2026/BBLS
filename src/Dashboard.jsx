import React from "react";
import { useNavigate } from "react-router-dom"; // React Router v6
import Analytics from "./Analytics";


function Dashboard() {
  const navigate = useNavigate();

  const goToAnalytics = () => {
    navigate("/analytics"); // route path to Analytics.jsx
  };

  return (
    <div>
      <h1>Dashboard Page</h1>
      <button onClick={goToAnalytics}>Go to Analytics</button>
    </div>
  );
}

export default Dashboard;