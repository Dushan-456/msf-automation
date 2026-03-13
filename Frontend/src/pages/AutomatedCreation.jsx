import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FileUploadZone from '../components/FileUploadZone';
import StatusBanner from '../components/StatusBanner';
import ProgressBar from '../components/ProgressBar';
import RowStatusList from '../components/RowStatusList';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const AutomatedCreation = () => {
  const [file, setFile] = useState(null);
  
  // Job State
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // the whole job object from backend
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'info', 'success', 'error'
  
  // Manual Entry State
  const [doctorName, setDoctorName] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [level, setLevel] = useState('');
  const [emails, setEmails] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [manualStatusMessage, setManualStatusMessage] = useState('');
  const [manualStatusType, setManualStatusType] = useState(''); // 'info', 'success', 'error'
  
  // Ref for the polling interval so we can clear it
  const pollIntervalRef = useRef(null);

  // Clear states when a new file is dropped
  const handleFileDrop = (newFile) => {
    setFile(newFile);
    if (!jobId) {
      setStatusMessage('');
      setStatusType('');
      setJobStatus(null);
    }
  };

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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setIsManualSubmitting(true);
    setManualStatusMessage('Processing manual entry...');
    setManualStatusType('info');

    try {
      const response = await axios.post(`${API_URL}/automate-manual`, {
        doctorName,
        trainerName,
        specialty,
        level,
        emails
      });
      setManualStatusMessage(response.data.message || 'Success! Survey processed.');
      setManualStatusType('success');
      // Clear form
      setDoctorName('');
      setTrainerName('');
      setSpecialty('');
      setLevel('');
      setEmails('');
    } catch (error) {
      console.error(error);
      setManualStatusMessage(error.response?.data?.error || "An error occurred while processing manual entry.");
      setManualStatusType('error');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const isUploadingOrProcessing = jobId !== null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Automated Creation</h1>
        <p className="text-gray-500 mt-2">Upload your doctor list to generate surveys and send invitations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Uploader and Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <form onSubmit={handleUpload} className="space-y-6">
            <FileUploadZone 
              file={file} 
              setFile={handleFileDrop} 
              disabled={isUploadingOrProcessing} 
            />

            <StatusBanner 
              message={statusMessage} 
              type={statusType} 
            />

            {jobStatus && (
               <ProgressBar 
                 progress={jobStatus.progress} 
                 total={jobStatus.total} 
                 status={jobStatus.status} 
                 currentActivity={jobStatus.currentActivity}
               />
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

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-4 text-gray-400 font-medium">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Manual Entry Form */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Manual Entry</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
                  <input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Dr. John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Name</label>
                  <input type="text" value={trainerName} onChange={e => setTrainerName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Dr. Jane Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                  <input type="text" value={specialty} onChange={e => setSpecialty(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Cardiology" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pre MD / Post MD / MSc</label>
                  <input type="text" value={level} onChange={e => setLevel(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Post MD" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emails (comma separated)</label>
                <textarea value={emails} onChange={e => setEmails(e.target.value)} required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="email1@example.com, email2@example.com"></textarea>
              </div>

              {manualStatusMessage && (
                <StatusBanner message={manualStatusMessage} type={manualStatusType} />
              )}

              <button 
                type="submit" 
                disabled={isManualSubmitting || isUploadingOrProcessing}
                className={`w-full py-3 px-4 rounded-md text-white font-bold text-lg transition-colors
                  ${isManualSubmitting || isUploadingOrProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'}`}
              >
                {isManualSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing Entry...
                  </span>
                ) : (
                  "Submit Manual Entry"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Row by Row Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[calc(100vh-200px)]">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 shrink-0">Detailed Status (Row by Row)</h3>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {jobStatus ? (
              <RowStatusList rows={jobStatus.rows} />
            ) : (
               <div className="text-gray-400 flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                  <p>Upload a file to see row status</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomatedCreation;
