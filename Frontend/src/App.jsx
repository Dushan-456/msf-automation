import { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage(''); // Clear previous messages
    setIsError(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a CSV file first.");
      setIsError(true);
      return;
    }

    // We must use FormData to send a file via HTTP POST
    const formData = new FormData();
    formData.append('csvFile', file); // This key must match upload.single('csvFile') in Express

    setLoading(true);
    setMessage("Processing MSF surveys... This may take a minute depending on the list size.");
    setIsError(false);

    try {
      // Connects to your Express backend
      const response = await axios.post('http://localhost:5000/api/v1/automate-surveys', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setMessage(response.data.message || "Success! All emails have been sent.");
      setFile(null); // Clear the file input
      
    } catch (error) {
      console.error(error);
      setIsError(true);
      setMessage(error.response?.data?.error || "An error occurred while processing the file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white max-w-lg w-full rounded-xl shadow-lg p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">MSF Automation</h1>
          <p className="text-gray-500 mt-2">Upload your doctor list to generate surveys and send invitations.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          
          {/* Drag and Drop / File Input Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {/* Feedback Messages */}
          {message && (
            <div className={`p-4 rounded-md text-sm font-medium ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || !file}
            className={`w-full py-3 px-4 rounded-md text-white font-bold text-lg transition-colors
              ${loading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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