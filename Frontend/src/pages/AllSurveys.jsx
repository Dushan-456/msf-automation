import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const AllSurveys = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Modal State
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchSurveys(page, activeSearch);
  }, [page, activeSearch]);

  const fetchSurveys = async (pageNum, searchStr = '') => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pageNum, perPage };
      if (searchStr.trim() !== '') {
        params.search = searchStr.trim();
      }
      
      const res = await axios.get(`${API_URL}/surveys`, { params });
      if (res.data && res.data.data) {
        setSurveys(res.data.data);
      } else {
        setSurveys([]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch surveys. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (surveys.length === perPage) {
      setPage(page + 1);
    }
  };

  const openModal = (survey) => {
    setSelectedSurvey(survey);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsConfirmModalOpen(false);
    setSelectedSurvey(null);
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 5000);
  };

  const triggerSendReminder = () => {
    if (!selectedSurvey) return;
    setIsConfirmModalOpen(true);
  };

  const handleSendReminder = async () => {
    if (!selectedSurvey) return;
    
    setIsSendingReminder(true);
    try {
      await axios.post(`${API_URL}/surveys/${selectedSurvey.id}/reminders`);
      showToast('Reminders successfully sent to non-respondents!', 'success');
      closeModal();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      showToast(`Failed to send reminders: ${errorMsg}`, 'error');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    setActiveSearch(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh)] flex flex-col pt-12">
      {/* Header and Search */}
      <div className="mb-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage all your surveys, monitor responses, and send reminders.</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full md:w-96 flex items-center group">
          <input
            type="text"
            className="block w-full pl-5 pr-24 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm group-hover:shadow"
            placeholder="Search surveys by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="absolute right-1 flex items-center gap-1">
            {activeSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-full bg-opacity-80"
                title="Clear Search"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
              title="Search"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="text-slate-500 font-medium text-lg">Loading surveys...</p>
             </div>
          </div>
        ) : error ? (
           <div className="flex-1 flex items-center justify-center">
             <div className="bg-red-50 text-red-600 p-6 rounded-xl flex items-center gap-4 border border-red-100 shadow-sm max-w-lg">
               <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
               <span className="text-lg font-medium">{error}</span>
             </div>
          </div>
        ) : surveys.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
             <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             <p className="text-xl font-medium text-slate-600">No surveys found</p>
             <p className="mt-1 text-slate-400">
                {activeSearch ? `No results for "${activeSearch}". Try adjusting your search.` : "No surveys found. Check back later."}
             </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 pb-6">
            <div className="flex flex-col gap-4">
              {surveys.map((survey) => (
                <div 
                  key={survey.id} 
                  onClick={() => openModal(survey)}
                  className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-center gap-4 flex-1 pr-6">
                    <div className="bg-slate-50 p-3 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors truncate max-w-lg lg:max-w-2xl" title={survey.title}>
                        {survey.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">ID: {survey.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right">
                       <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Responses</p>
                       <div className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-sm">
                         {survey.response_count}
                       </div>
                    </div>
                    
                    <div className="text-slate-300 group-hover:text-blue-500 transition-colors pr-2 hidden sm:block">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Pagination controls */}
      {!loading && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-4 mt-6 flex items-center justify-between shrink-0">
           <div className="text-sm font-medium text-slate-500">
             Page <span className="text-slate-900 font-bold">{page}</span>
           </div>
           <div className="flex gap-3">
             <button
               onClick={handlePrevious}
               disabled={page === 1}
               className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all
                 ${page === 1 
                   ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                   : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                 }`}
             >
               Previous
             </button>
             <button
               onClick={handleNext}
               disabled={surveys.length < perPage}
               className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all
                 ${surveys.length < perPage 
                   ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                   : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                 }`}
             >
               Next
             </button>
           </div>
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={!isSendingReminder ? closeModal : undefined}></div>
           
           {/* Modal Dialog */}
           <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
             <div className="p-8">
               <div className="flex justify-between items-start mb-6">
                 <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                 </div>
                 <button 
                   onClick={closeModal} 
                   disabled={isSendingReminder}
                   className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full p-2"
                 >
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
               
               <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-2">
                 {selectedSurvey.title}
               </h2>
               
               <div className="mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-slate-700 text-sm">
                    <p className="text-slate-500 mb-1">Current Responses</p>
                    <span className="text-3xl font-extrabold text-blue-600">{selectedSurvey.response_count}</span>
                  </div>
               </div>

               <p className="mt-8 text-slate-600 text-sm leading-relaxed">
                 You are about to automate sending an email reminder to all recipients who have <span className="font-bold text-slate-800">not yet responded</span> to this survey. This action will be processed by SurveyMonkey immediately.
               </p>

                <div className="mt-8 flex gap-3">
                 <button
                   onClick={closeModal}
                   className="flex-1 py-3 px-4 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={triggerSendReminder}
                   className="flex-[2] flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md font-bold transition-all"
                 >
                   Send Reminders Now
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && selectedSurvey && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={!isSendingReminder ? () => setIsConfirmModalOpen(false) : undefined}></div>
           
           {/* Modal Dialog */}
           <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all p-8 flex flex-col items-center text-center">
              <div className="bg-red-50 text-red-500 p-4 rounded-full mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Action</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Are you exactly sure you want to send reminders for <span className="font-bold text-slate-800">"{selectedSurvey.title}"</span>? This action will email all non-respondents immediately.
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                   onClick={() => setIsConfirmModalOpen(false)}
                   disabled={isSendingReminder}
                   className="flex-1 py-3 px-4 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold transition-colors disabled:opacity-50"
                 >
                   No, Cancel
                 </button>
                 <button
                   onClick={handleSendReminder}
                   disabled={isSendingReminder}
                   className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-red-600 hover:bg-red-700 shadow-md font-bold transition-all disabled:opacity-80 disabled:cursor-not-allowed"
                 >
                   {isSendingReminder ? (
                     <>
                       <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       Sending...
                     </>
                   ) : (
                     'Yes, Send'
                   )}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-medium text-white max-w-sm animate-[bounce_0.5s_ease-out]
            ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
        >
           {toast.type === 'success' ? (
             <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
           ) : (
             <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           )}
           <p className="leading-tight">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default AllSurveys;
