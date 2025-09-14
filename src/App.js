import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import PrivateRoute from "./components/PrivateRoute";
import NeonCursor from "./components/NeonCursor";

function App() {
  return (
    
    <Router>
      <div className="relative">
      <NeonCursor />
      {/* Các component khác */}
    </div>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} /> {/* Chuyển hướng */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
