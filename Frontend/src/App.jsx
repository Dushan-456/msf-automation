import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
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
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">Loading...</div>;
  }

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Sidebar onLogout={handleLogout} />
        
        {/* Main Content Area */}
        <div className="flex-1 ml-64 h-screen flex flex-col overflow-y-auto overflow-x-hidden">
          <TopHeader theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
          
          <main className="flex-1 w-full p-6">
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