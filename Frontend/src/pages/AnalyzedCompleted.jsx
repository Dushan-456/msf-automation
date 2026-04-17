import { useState, useEffect } from 'react';
import api from '../utils/api';
import SurveyDetailModal from '../components/SurveyDetailModal';
import SurveyCardSkeleton from '../components/SurveyCardSkeleton';


export default function AnalyzedCompleted() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Detail modal state
  const [detailSurvey, setDetailSurvey] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchCompletedSurveys = async (pageNum) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/reports/completed`, {
        params: { page: pageNum, perPage },
      });
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
          : 'Failed to fetch completed surveys. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedSurveys(page);
  }, [page]);

  const handlePrevious = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (surveys.length === perPage) {
      setPage(page + 1);
    }
  };

  return (
    <div className="p-5 max-w-7xl mx-auto h-[calc(100vh)] flex flex-col pt-6 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="mb-4 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white border-b-4 border-violet-500 pb-2 inline-block">
            Analyzed & Completed Surveys
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Surveys that have been analyzed and completed, sorted by total responses.
          </p>
        </div>
        <button
          onClick={() => fetchCompletedSurveys(page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          )}
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={`p-4 rounded-lg mb-6 border flex items-center gap-3 ${
          error.includes('daily limit')
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800/30 text-amber-800 dark:text-amber-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400'
        }`}>
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 overflow-y-auto pr-2 pb-6">
          <div className="flex flex-col gap-4">
            {Array(perPage).fill(null).map((_, i) => (
              <SurveyCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm py-16">
          <svg className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p className="text-xl font-medium text-slate-600 dark:text-slate-300">No surveys found</p>
          <p className="mt-1 text-slate-400 dark:text-slate-500">There are currently no surveys in the completed folder.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 pb-6">
          <div className="flex flex-col gap-4">
            {surveys.map((survey, idx) => (
              <div
                key={survey.id}
                onClick={() => { setDetailSurvey(survey); setDetailOpen(true); }}
                className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-slate-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-500/50 transition-all flex items-center justify-between group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex items-center gap-4 flex-1 pr-6">
                  {/* Rank badge */}
                  <div className="bg-slate-100 dark:bg-gray-800 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors font-bold">
                    <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                      {(page - 1) * perPage + idx + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-lg font-bold text-slate-800 dark:text-white leading-tight group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors truncate max-w-lg lg:max-w-2xl"
                      title={survey.title}
                    >
                      {survey.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      ID: {survey.id}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Completed & Analyzed
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mb-1">
                      Total Responses
                    </p>
                    <div className="inline-flex items-center justify-center bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-bold px-3 py-1 rounded-full text-sm min-w-[3rem]">
                      {survey.response_count}
                    </div>
                  </div>
                  {/* Completed badge */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800 px-4 py-2.5 mt-3 flex items-center justify-between shrink-0">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Page <span className="text-slate-900 dark:text-white font-bold">{page}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={page === 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                page === 1
                  ? "bg-slate-50 dark:bg-gray-800 text-slate-300 dark:text-gray-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600 hover:shadow-sm shadow-sm"
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={surveys.length < perPage}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                surveys.length < perPage
                  ? "bg-slate-50 dark:bg-gray-800 text-slate-300 dark:text-gray-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600 hover:shadow-sm shadow-sm"
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
}
