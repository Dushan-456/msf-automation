import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';


export default function SubjectUpload() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadToDrive, setUploadToDrive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [arEmail, setArEmail] = useState('');
  const [uploadProgress, setUploadProgress] = useState([]); // Per-file SSE progress
  const [emailStatus, setEmailStatus] = useState(''); // Email step status
  const abortRef = useRef(null);

  useEffect(() => {
    fetchSubjects();
    fetchGlobalSettings();
  }, []);

  const fetchGlobalSettings = async () => {
    try {
      const res = await api.get(`/subjects/settings`);
      const email = res.data.data?.assistantRegistrarEmail || '';
      setArEmail(email);
    } catch (err) {
      console.error('Failed to fetch global settings:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      setFetchingSubjects(true);
      const res = await api.get(`/subjects`);
      const payload = res.data.data || res.data;
      setSubjects(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      showToast('Failed to load subjects.', 'error');
    } finally {
      setFetchingSubjects(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(f => f.type === 'application/pdf');
    if (validFiles.length !== selectedFiles.length) {
      showToast('Some files were skipped. Only PDF files are allowed.', 'error');
    }
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(f => f.type === 'application/pdf');
    if (validFiles.length !== droppedFiles.length) {
      showToast('Some files were skipped. Only PDF files are allowed.', 'error');
    }
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleCopy = async (link, fileId) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = link;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); } catch (error) { throw new Error("Fallback copy failed."); } finally { textArea.remove(); }
      }
      setCopiedId(fileId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      showToast('Failed to copy link.', 'error');
    }
  };

  /** SSE streaming upload (when Drive is ON) */
  const handleStreamUpload = async (formData) => {
    // Init progress for each file
    setUploadProgress(files.map((f) => ({ filename: f.name, status: 'Pending', sheetStatus: '', link: '' })));
    setEmailStatus('');

    const token = localStorage.getItem('token');
    const baseURL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${baseURL}/subjects/upload-stream`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
        signal: controller.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));

            if (evt.fileIndex !== undefined) {
              setUploadProgress(prev => {
                const next = [...prev];
                next[evt.fileIndex] = { filename: evt.filename, status: evt.status, sheetStatus: evt.sheetStatus || '', link: evt.link || '', message: evt.message || '' };
                return next;
              });
              // Add completed files to session list
              if (evt.status === 'Completed' && evt.link) {
                setUploadedFiles(prev => [{ id: `stream-${Date.now()}-${evt.fileIndex}`, name: evt.filename, link: evt.link, sheetStatus: evt.sheetStatus, uploadedAt: new Date().toLocaleTimeString() }, ...prev]);
              }
            } else if (evt.status === 'Sending Email...' || evt.status === 'Email Sent' || evt.status === 'Email Error') {
              setEmailStatus(evt.status);
            } else if (evt.status === 'Done') {
              showToast('All files processed successfully!', 'success');
            } else if (evt.status === 'Error' && evt.fileIndex === undefined) {
              showToast(evt.message || 'Upload failed.', 'error');
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Stream error:', err);
        showToast('Upload stream failed.', 'error');
      }
    }
  };

  /** Legacy non-SSE upload (when Drive is OFF) */
  const handleLegacyUpload = async (formData) => {
    try {
      const res = await api.post(`/subjects/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(res.data.message || 'Success!', 'success');
      const newDriveFiles = (res.data.driveFiles || []).map(f => ({ id: f.id, name: f.name, link: f.webViewLink, uploadedAt: new Date().toLocaleTimeString() }));
      if (newDriveFiles.length > 0) setUploadedFiles(prev => [...newDriveFiles, ...prev]);
    } catch (err) {
      console.error('Upload error:', err);
      showToast(err.response?.data?.error || 'Upload failed. Please try again.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubjectId || files.length === 0) return;

    setLoading(true);
    setUploadProgress([]);

    const formData = new FormData();
    formData.append('subjectId', selectedSubjectId);
    formData.append('uploadToDrive', uploadToDrive.toString());
    files.forEach(file => formData.append('pdfFiles', file));

    if (uploadToDrive) {
      await handleStreamUpload(formData);
    } else {
      await handleLegacyUpload(formData);
    }

    setFiles([]);
    setSelectedSubjectId('');
    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) fileInput.value = '';
    setLoading(false);
  };

  const selectedSubject = subjects.find(s => s._id === selectedSubjectId);

  return (
    <div className="p-5 max-w-4xl mx-auto pt-6 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="mb-6">
        <div className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Assistant Registrar Email: <span className="font-semibold text-gray-800 dark:text-gray-200">{arEmail || 'Not configured'}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white border-b-4 border-violet-500 pb-2 inline-block">
          Subject Upload
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Upload PDF(s) and send them to the relevant registrar via email. Optionally save to Google Drive.
        </p>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className={`mb-6 p-4 rounded-lg border text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Select Subject
            </label>
            {fetchingSubjects ? (
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm py-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-sm">
                No subjects found. Please add subjects in{' '}
                <a href="/subject-settings" className="font-bold underline hover:text-amber-800 dark:hover:text-amber-300">Subject Settings</a> first.
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm"
              >
                <option value="" disabled>-- Choose a subject --</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Subject Info Card */}
          {selectedSubject && (
            <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
              <div className="text-sm">
                <div>
                  <span className="text-violet-500 dark:text-violet-400 font-medium">BOS Email (CC):</span>
                  <span className="text-gray-800 dark:text-gray-200 font-semibold ml-2">{selectedSubject.clerkEmail}</span>
                </div>
              </div>
            </div>
          )}

          {/* Drive Upload Toggle */}
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
             <input 
                type="checkbox" 
                id="uploadToDrive"
                checked={uploadToDrive}
                onChange={(e) => setUploadToDrive(e.target.checked)}
                className="w-5 h-5 text-violet-600 dark:text-violet-500 rounded border-gray-300 dark:border-gray-700 focus:ring-violet-500 cursor-pointer"
             />
             <label htmlFor="uploadToDrive" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                Upload to Google Drive <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(Files will be Upload into <i><b>MSF sent via TEAMS - Email</b></i> - Year → Month → Date → Subject)</span>
             </label>
          </div>

          {/* PDF Upload Zone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Upload PDF(s)
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-violet-400 dark:hover:border-violet-500/50"
              onClick={() => document.getElementById('pdf-file-input')?.click()}
            >
              <input
                id="pdf-file-input"
                type="file"
                multiple
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center text-center pointer-events-none">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Drag &amp; drop PDF files here</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
              </div>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Selected Files ({files.length}):</h4>
                    <ul className="space-y-2">
                        {files.map((f, i) => (
                            <li key={i} className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 px-4 py-2 rounded-lg text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <svg className="w-5 h-5 text-violet-500 dark:text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-gray-700 dark:text-gray-200 font-medium truncate">{f.name}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => removeFile(i)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Remove file"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedSubjectId || files.length === 0}
            className={`w-full py-3.5 px-4 rounded-lg text-white font-bold text-base transition-all ${
              loading || !selectedSubjectId || files.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Send {uploadToDrive ? '& Upload ' : ''}({files.length} {files.length === 1 ? 'file' : 'files'})
              </span>
            )}
          </button>
        </form>

        {/* ── SSE Upload Progress ── */}
        {uploadProgress.length > 0 && (
          <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Upload Progress
            </h3>
            <ul className="space-y-2">
              {uploadProgress.map((item, idx) => {
                const isPending = item.status === 'Pending';
                const isProcessing = item.status === 'Uploading to Drive...' || item.status === 'Updating Sheet...';
                const isCompleted = item.status === 'Completed';
                const isError = item.status === 'Error';

                return (
                  <li key={idx} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {isProcessing && (
                          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        )}
                        {isCompleted && (
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        )}
                        {isError && (
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                        <span className={`text-xs font-semibold ${
                          isPending ? 'text-gray-400 dark:text-gray-500' :
                          isProcessing ? 'text-blue-600 dark:text-blue-400' :
                          isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    {/* Sheet status + link row */}
                    {isCompleted && (
                      <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
                        <span className={`font-medium px-2 py-0.5 rounded-full ${
                          item.sheetStatus?.startsWith('Updated correctly')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : (item.sheetStatus === 'Row not found' || item.sheetStatus?.startsWith('Duplicate found'))
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          Sheet: {item.sheetStatus}
                        </span>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline truncate max-w-[200px]">
                            Open in Drive ↗
                          </a>
                        )}
                      </div>
                    )}
                    {isError && item.message && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{item.message}</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {/* Email status */}
            {emailStatus && (
              <div className={`mt-3 text-xs font-medium flex items-center gap-2 ${
                emailStatus === 'Sending Email...' ? 'text-blue-600 dark:text-blue-400' :
                emailStatus === 'Email Sent' ? 'text-emerald-600 dark:text-emerald-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {emailStatus === 'Sending Email...' && (
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                {emailStatus === 'Email Sent' && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                )}
                {emailStatus}
              </div>
            )}
          </div>
        )}

        {/* ── Uploaded Files List — persists across uploads ── */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Uploaded to Google Drive ({uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'})
              </h3>
              <button
                onClick={() => setUploadedFiles([])}
                className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-400 font-medium transition-colors"
                title="Clear list"
              >
                Clear all
              </button>
            </div>
            <ul className="space-y-2">
              {uploadedFiles.map((file) => (
                <li
                  key={file.id}
                  className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-800/30 rounded-lg px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{file.uploadedAt}</span>
                          {file.sheetStatus && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              file.sheetStatus?.startsWith('Updated correctly')
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : (file.sheetStatus === 'Row not found' || file.sheetStatus?.startsWith('Duplicate found'))
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {file.sheetStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {file.link && (
                        <a
                          href={file.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                          title="Open in Google Drive"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </a>
                      )}
                      {file.link && (
                        <button
                          onClick={() => handleCopy(file.link, file.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            copiedId === file.id
                              ? 'text-emerald-700 bg-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30'
                              : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={copiedId === file.id ? 'Copied!' : 'Copy link'}
                        >
                          {copiedId === file.id ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy Link
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
