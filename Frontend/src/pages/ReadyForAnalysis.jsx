import React, { useState, useEffect } from 'react';
import ReportActionModal from '../components/ReportActionModal';
import SurveyDetailModal from '../components/SurveyDetailModal';

const API_URL = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
  ? import.meta.env.VITE_API_URL
  : `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;

export default function ReadyForAnalysis() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const perPage = 10;
  
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Detail modal state (tracking / reminders)
  const [detailSurvey, setDetailSurvey] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchReadySurveys = async (pageNum) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/reports/ready?page=${pageNum}&perPage=${perPage}`);
      const data = await res.json();
      if (!res.ok) {
        // --- 429 Rate Limit Safety Net ---
        if (res.status === 429 || data?.error === 'RateLimit') {
          throw new Error('\ud83d\udeab SurveyMonkey API daily limit reached. Please try again tomorrow.');
        }
        throw new Error(data.error || 'Failed to fetch');
      }
      setSurveys(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadySurveys(page);
  }, [page]);

  const handlePrevious = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (surveys.length === perPage) {
      setPage(page + 1);
    }
  };

  const handleAnalyzeClick = (survey) => {
    setSelectedSurvey(survey);
    setModalOpen(true);
  };

  const handleAnalysisComplete = () => {
    // Remove the survey from the list locally after completion
    setSurveys(prev => prev.filter(s => s.id !== selectedSurvey.id));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh)] flex flex-col pt-12">
      <div className="mb-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-2 inline-block">
            Ready for Analysis
          </h1>
          <p className="text-gray-500 mt-2">
            Surveys with 12 or more responses ready for report generation.
          </p>
        </div>
        <button
          onClick={() => fetchReadySurveys(page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
          <strong>Error: </strong> {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <svg
                className="animate-spin h-10 w-10 text-blue-600 mb-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-slate-500 font-medium text-lg">
                Loading surveys...
              </p>
            </div>
          </div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm py-16">
          <svg
            className="w-16 h-16 text-slate-300 mb-4"
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
          <p className="text-xl font-medium text-slate-600">No surveys found</p>
          <p className="mt-1 text-slate-400">
            There are currently no surveys with 12 or more responses ready for
            analysis.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 pb-6">
          <div className="flex flex-col gap-4">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                onClick={() => { setDetailSurvey(survey); setDetailOpen(true); }}
                className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex items-center gap-4 flex-1 pr-6">
                  <div className="bg-slate-50 p-3 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
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
                      className="text-lg font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors truncate max-w-lg lg:max-w-2xl"
                      title={survey.title}
                    >
                      {survey.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      ID: {survey.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                      Responses
                    </p>
                    <div className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-sm">
                      {survey.response_count}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAnalyzeClick(survey); }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                      Analyze
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                page === 1
                  ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={surveys.length < perPage}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                surveys.length < perPage
                  ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {modalOpen && selectedSurvey && (
        <ReportActionModal
          survey={selectedSurvey}
          onClose={() => setModalOpen(false)}
          onComplete={handleAnalysisComplete}
        />
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
