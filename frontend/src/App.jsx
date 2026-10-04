import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import DatasetUpload from './pages/DatasetUpload';
import DatasetInspection from './pages/DatasetInspection';
import AuditConfiguration from './pages/AuditConfiguration';
import AuditResults from './pages/AuditResults';

function App() {
  const [backendConnected, setBackendConnected] = useState(false);
  const [mlConnected, setMlConnected] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Global Navbar */}
        <Navbar backendConnected={backendConnected} mlConnected={mlConnected} />

        <div className="flex-1 flex">
          {/* Global Sidebar */}
          <Sidebar />

          {/* Main View Area */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    backendConnected={backendConnected}
                    setBackendConnected={setBackendConnected}
                    mlConnected={mlConnected}
                    setMlConnected={setMlConnected}
                  />
                }
              />
              <Route
                path="/datasets"
                element={
                  <Dashboard
                    backendConnected={backendConnected}
                    setBackendConnected={setBackendConnected}
                    mlConnected={mlConnected}
                    setMlConnected={setMlConnected}
                  />
                }
              />
              <Route path="/upload" element={<DatasetUpload />} />
              <Route path="/datasets/upload" element={<DatasetUpload />} />
              <Route path="/datasets/:id" element={<DatasetInspection />} />
              <Route path="/audit/new" element={<AuditConfiguration />} />
              <Route path="/audit/results" element={<AuditResults />} />
              <Route path="/audit/latest/results" element={<AuditResults />} />
              <Route path="/audit/:id/results" element={<AuditResults />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
