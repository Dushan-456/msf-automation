import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AutomatedCreation from './pages/AutomatedCreation';
import AllSurveys from './pages/AllSurveys';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
        <Sidebar />
        
        {/* Main Content Area - pushed right by sidebar's fixed width (w-64 = 16rem) */}
        <div className="flex-1 ml-64 min-h-screen overflow-x-hidden">
          <main className="w-full">
            <Routes>
              <Route path="/" element={<AutomatedCreation />} />
              <Route path="/all-surveys" element={<AllSurveys />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;