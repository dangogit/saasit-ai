import React, { useState } from "react";
import "./App.css";
import LandingPage from "./components/LandingPage";
import WorkflowDesigner from "./components/WorkflowDesigner";

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' or 'designer'

  const handleGetStarted = () => {
    setCurrentView('designer');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  return (
    <div className="App">
      {currentView === 'landing' ? (
        <LandingPage onGetStarted={handleGetStarted} />
      ) : (
        <WorkflowDesigner onBackToLanding={handleBackToLanding} />
      )}
    </div>
  );
}

export default App;