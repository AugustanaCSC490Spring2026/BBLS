import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./Login.jsx";
import Analytics from "./Analytics.jsx";
import Dashboard from "./Dashboard.jsx";

function App() {
  return (
    <Router>
        <Link to = "/Analytics">Analytics</Link>
        <Link to = "/Dashboard">Dashboard</Link>
        <Link to = "/Login">Login</Link>
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route path="/Analytics" element={<Analytics />} />
        <Route path="/Dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;