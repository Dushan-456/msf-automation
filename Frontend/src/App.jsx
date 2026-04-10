import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AutomatedCreation from './pages/AutomatedCreation';
import AllSurveys from './pages/AllSurveys';
import ReadyForAnalysis from './pages/ReadyForAnalysis';
import ToBeAnalyzed from './pages/ToBeAnalyzed';
import AnalyzedCompleted from './pages/AnalyzedCompleted';
import SubjectUpload from './pages/SubjectUpload';
import SubjectSettings from './pages/SubjectSettings';
import Login from './pages/Login';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
        <Sidebar onLogout={() => {
          localStorage.removeItem('isLoggedIn');
          setIsLoggedIn(false);
        }} />
        
        {/* Main Content Area - pushed right by sidebar's fixed width (w-64 = 16rem) */}
        <div className="flex-1 ml-64 min-h-screen overflow-x-hidden">
          <main className="w-full">
            <Routes>
              <Route path="/" element={<AutomatedCreation />} />
              <Route path="/all-surveys" element={<AllSurveys />} />
              <Route path="/ready-for-analysis" element={<ReadyForAnalysis />} />
              <Route path="/to-be-analyzed" element={<ToBeAnalyzed />} />
              <Route path="/analyzed-completed" element={<AnalyzedCompleted />} />
              <Route path="/subject-upload" element={<SubjectUpload />} />
              <Route path="/subject-settings" element={<SubjectSettings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;