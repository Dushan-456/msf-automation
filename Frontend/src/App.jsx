import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FileUploadZone from './components/FileUploadZone';
import StatusBanner from './components/StatusBanner';
import ProgressBar from './components/ProgressBar';
import RowStatusList from './components/RowStatusList';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

function App() {
  const [file, setFile] = useState(null);
  
  // Job State
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // the whole job object from backend
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'info', 'success', 'error'
  
  // Ref for the polling interval so we can clear it
  const pollIntervalRef = useRef(null);

  // Clear states when a new file is dropped
  useEffect(() => {
    if (file && !jobId) {
      setStatusMessage('');
      setStatusType('');
      setJobStatus(null);
    }
  }, [file, jobId]);

  // The actual polling function
  const pollJobStatus = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/status/${id}`);
      const job = res.data;
      setJobStatus(job);

      if (job.status === 'completed') {
        clearInterval(pollIntervalRef.current);
        setStatusMessage(`Success! Successfully processed ${job.successCount} of ${job.total} surveys.`);
        setStatusType('success');
        setJobId(null);
        setFile(null); // Reset for next run
      } else if (job.status === 'failed') {
        clearInterval(pollIntervalRef.current);
        setStatusMessage(`Job Failed. Processed ${job.successCount}, Failed ${job.failedCount}. Check terminal manually.`);
        setStatusType('error');
        setJobId(null);
      }
    } catch (err) {
      console.error('Polling error', err);
      // Don't stop polling on a single network blip, but let's log it
    }
  };

  // Setup interval when jobId changes
  useEffect(() => {
    if (jobId) {
      // Poll every 2 seconds
      pollIntervalRef.current = setInterval(() => pollJobStatus(jobId), 2000);
      
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [jobId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('csvFile', file);

    setStatusMessage('Uploading CSV and configuring job...');
    setStatusType('info');
    setJobStatus(null);
    
    try {
      const response = await axios.post(`${API_URL}/automate-surveys`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const newJobId = response.data.jobId;
      setJobId(newJobId);
      setStatusMessage(`Automation started! Processing in background...`);
      setStatusType('info');
      
    } catch (error) {
      console.error(error);
      setStatusType('error');
      setStatusMessage(error.response?.data?.error || "An error occurred while uploading the file.");
      setJobId(null);
    }
  };

  const isUploadingOrProcessing = jobId !== null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white max-w-lg w-full rounded-xl shadow-lg p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">MSF Automation</h1>
          <p className="text-gray-500 mt-2">Upload your doctor list to generate surveys and send invitations.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          
          <FileUploadZone 
            file={file} 
            setFile={setFile} 
            disabled={isUploadingOrProcessing} 
          />

          <StatusBanner 
            message={statusMessage} 
            type={statusType} 
          />

          {jobStatus && (
             <>
               <ProgressBar 
                  progress={jobStatus.progress} 
                  total={jobStatus.total} 
                  status={jobStatus.status} 
                  currentActivity={jobStatus.currentActivity}
               />
               <RowStatusList rows={jobStatus.rows} />
             </>
          )}

          <button 
            type="submit" 
            disabled={isUploadingOrProcessing || !file}
            className={`w-full py-3 px-4 rounded-md text-white font-bold text-lg transition-colors
              ${isUploadingOrProcessing || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
          >
            {isUploadingOrProcessing ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing...
              </span>
            ) : (
              "Run Automation"
            )}
          </button>
          
        </form>
      </div>
    </div>
  );
}

export default App;