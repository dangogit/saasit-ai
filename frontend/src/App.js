import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LandingPage from "./components/LandingPage";
import WorkflowDesigner from "./components/WorkflowDesigner";
import ProjectSetupFlow from "./components/ProjectSetupFlow";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import ClerkAuthProvider from "./components/providers/ClerkAuthProvider";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";

function App() {
  return (
    <ClerkAuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route 
              path="/onboarding" 
              element={
                <>
                  <SignedIn>
                    <OnboardingFlow />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              } 
            />
            <Route 
              path="/app/setup" 
              element={
                <>
                  <SignedIn>
                    <ProjectSetupFlow />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              } 
            />
            <Route 
              path="/app" 
              element={
                <>
                  <SignedIn>
                    <WorkflowDesigner />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ClerkAuthProvider>
  );
}

export default App;