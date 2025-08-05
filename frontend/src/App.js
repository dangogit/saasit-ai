import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LandingPage from "./components/LandingPage";
import WorkflowDesigner from "./components/WorkflowDesigner";
import GoogleOAuthProvider from "./components/providers/GoogleOAuthProvider";
import AuthProvider from "./components/providers/AuthProvider";

function App() {
  return (
    <GoogleOAuthProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route 
                path="/app" 
                element={<WorkflowDesigner />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;