import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import SurveyDetailModal from '../components/SurveyDetailModal';
import SurveyCardSkeleton from '../components/SurveyCardSkeleton';


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

  // Detail modal state
  const [detailSurvey, setDetailSurvey] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
      
      const res = await api.get(`/surveys`, { params });
      const payload = res.data.data || res.data;
      if (payload && Array.isArray(payload)) {
        setSurveys(payload);
      } else {
        setSurveys([]);
      }
    } catch (err) {
      console.error(err);
      const isRateLimit = err.response?.status === 429 || err.response?.data?.error === 'RateLimit';
      setError(
        isRateLimit
          ? '🚫 SurveyMonkey API daily limit reached. Please try again tomorrow.'
          : 'Failed to fetch surveys. Please try again later.'
      );
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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
  };

  return (
    <div className="p-5 max-w-7xl mx-auto h-[calc(100vh)] flex flex-col pt-6 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header and Search */}
      <div className="mb-4 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            All MSF Surveys
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2 text-lg">
            Manage all your surveys, monitor responses, and send reminders.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="relative w-full md:w-96 flex items-center group"
        >
          <input
            type="text"
            className="block w-full pl-5 pr-24 py-3 border border-slate-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm group-hover:shadow"
            placeholder="Search surveys by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="absolute right-1 flex items-center gap-1">
            {activeSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-gray-800 rounded-full bg-opacity-80 dark:bg-opacity-40"
                title="Clear Search"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
              title="Search"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 overflow-y-auto pr-2 pb-6">
            <div className="flex flex-col gap-4">
              {Array(perPage).fill(null).map((_, i) => (
                <SurveyCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl flex items-center gap-4 border border-red-100 dark:border-red-900/30 shadow-sm max-w-lg transition-colors">
              <svg
                className="w-8 h-8 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                ></path>
              </svg>
              <span className="text-lg font-medium">{error}</span>
            </div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm transition-colors">
            <svg
              className="w-16 h-16 text-slate-300 dark:text-gray-700 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
            <p className="text-xl font-medium text-slate-600 dark:text-gray-300">
              No surveys found
            </p>
            <p className="mt-1 text-slate-400 dark:text-gray-500">
              {activeSearch
                ? `No results for "${activeSearch}". Try adjusting your search.`
                : "No surveys found. Check back later."}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 pb-6">
            <div className="flex flex-col gap-4">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  onClick={() => { setDetailSurvey(survey); setDetailOpen(true); }}
                  className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-slate-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/30 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="flex items-center gap-4 flex-1 pr-6">
                    <div className="bg-slate-50 dark:bg-gray-800 p-3 rounded-lg text-slate-400 dark:text-gray-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold text-slate-800 dark:text-white leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors  "
                        title={survey.title}
                      >
                        {survey.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        ID: {survey.id}
                        {survey.folder_id === "2451474" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Completed & Analyzed
                          </span>
                        )}
                        {survey.folder_id === "2452482" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            To Be Analyzed
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 dark:text-gray-500 font-medium uppercase tracking-wider mb-1">
                        Responses
                      </p>
                      <div className="inline-flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-1 rounded-full text-sm">
                        {survey.response_count}
                      </div>
                    </div>

                    <div className="text-slate-300 group-hover:text-blue-500 transition-colors pr-2 hidden sm:block">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
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
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800 px-4 py-2.5 mt-3 flex items-center justify-between shrink-0 transition-colors">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Page <span className="text-slate-900 dark:text-white font-bold">{page}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={page === 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                 ${
                   page === 1
                     ? "bg-slate-50 dark:bg-gray-800 text-slate-300 dark:text-gray-600 cursor-not-allowed"
                     : "bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600 hover:shadow-sm"
                 }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={surveys.length < perPage}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                 ${
                   surveys.length < perPage
                     ? "bg-slate-50 dark:bg-gray-800 text-slate-300 dark:text-gray-600 cursor-not-allowed"
                     : "bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600 hover:shadow-sm"
                 }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Survey Detail / Tracking Modal */}
      <SurveyDetailModal
        survey={detailSurvey}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
};

export default AllSurveys;
