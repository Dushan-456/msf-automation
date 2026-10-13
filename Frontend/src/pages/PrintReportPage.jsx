import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PrintableReport from '../components/PrintableReport';

// Generates the PDF filename: "DoctorName - SLMC - {number} - Specialty (Level)"
export function getDocumentTitle(surveyTitle) {
  if (!surveyTitle) return 'MSF_Report';
  
  let text = surveyTitle.replace(/Multisource Feedback Form \(MSF\)/i, '').trim();
  let doctorName = 'Doctor';
  let specialty = '';
  let level = '';
  
  // 1. Extract level from the last parentheses, e.g., "( Pre MD )" → "Pre MD"
  const levelMatch = text.match(/\(\s*([^)]+?)\s*\)\s*$/);
  if (levelMatch) {
    level = levelMatch[1].trim();
    text = text.replace(levelMatch[0], '').trim();
  }
  
  // 2. Extract specialty from "Specialty - ..." (now without the level suffix)
  const specialtyMatch = text.match(/Specialty\s*[-:]?\s*(.+)$/i);
  if (specialtyMatch) {
    specialty = specialtyMatch[1].trim();
    text = text.replace(specialtyMatch[0], '').trim();
  }
  
  // 3. Strip "Trainer - ..." segment (not needed in filename)
  const trainerMatch = text.match(/Trainer\s*[-:]?\s*(.+)$/i);
  if (trainerMatch) {
    text = text.replace(trainerMatch[0], '').trim();
  }
  
  // 4. Remaining text is the doctor name (may include "- SLMC - {number}")
  if (text) {
    doctorName = text.replace(/[\s-]+$/, '').trim();
  }
  
  // 5. Sanitize characters (allow parentheses for level, & and _ for specialty names)
  const sanitize = (str) => str.replace(/[^a-zA-Z0-9.\s()&_-]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanDoc = sanitize(doctorName);
  const cleanSpec = sanitize(specialty);
  const cleanLevel = sanitize(level);
  
  // 6. Build filename: "DoctorName - SLMC - {number} - Specialty (Level)"
  let finalTitle = cleanDoc;
  if (cleanSpec) {
    finalTitle += ` - ${cleanSpec}`;
  }
  if (cleanLevel) {
    finalTitle += ` (${cleanLevel})`;
  }
  
  return finalTitle.substring(0, 120).trim() || 'MSF_Report';
}

export default function PrintReportPage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [surveyInfo, setSurveyInfo] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/reports/${surveyId}/data`);
        if (!isMounted) return;

        const data = res.data;
        setReportData(data);

        // Build survey metadata object from details
        const surveyObj = {
          id: data.details?.id || surveyId,
          title: data.details?.title || 'MSF Survey Report',
          response_count: data.details?.response_count || 0,
        };
        setSurveyInfo(surveyObj);
        setLoading(false);

        // Set document.title so the browser's "Save as PDF" suggests this exact filename
        const pdfFileName = getDocumentTitle(surveyObj.title);
        document.title = pdfFileName;

        // Auto trigger print dialog once charts have rendered
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        if (!isMounted) return;
        setLoading(false);
        if (err.response?.status === 429) {
          setError('SurveyMonkey API rate limit reached. Please try again later.');
        } else {
          setError(err.response?.data?.error || err.message || 'Failed to load report data');
        }
      }
    };

    if (surveyId) {
      fetchReport();
    }

    return () => {
      isMounted = false;
      document.title = 'MSF Automation';
    };
  }, [surveyId]);

  const handlePrint = () => {
    if (surveyInfo?.title) {
      document.title = getDocumentTitle(surveyInfo.title);
    }
    window.print();
  };

  const handleMarkComplete = async () => {
    if (isCompleted || isCompleting) return;
    try {
      setIsCompleting(true);
      await api.patch(`/reports/${surveyId}/complete`);
      setIsCompleted(true);
    } catch (err) {
      alert('Failed to mark survey as complete: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-sm w-full border border-slate-200 dark:border-gray-800">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
            Loading Report...
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Fetching SurveyMonkey responses and rendering print view.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-200 dark:border-red-900/50">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            Failed to Load Report
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all shadow-sm"
            >
              Retry
            </button>
            <button
              onClick={() => window.close()}
              className="flex-1 bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-bold py-2 px-4 rounded-lg text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-page-wrapper min-h-screen bg-slate-200 dark:bg-gray-950 flex flex-col">
      {/* ── Sticky Top Action Bar (Hidden in Print) ── */}
      <header
        data-no-print
        className="no-print print:hidden sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200 dark:border-gray-800 px-6 py-3 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Title & Info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  window.close();
                }
              }}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              title="Go Back / Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="truncate">
              <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-xl">
                {surveyInfo?.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Responses: {surveyInfo?.response_count} &nbsp;•&nbsp; SurveyMonkey Analyze Report View
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all shadow-md active:scale-95"
              title="Open browser print dialog (Ctrl+P) to print or Save as PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={handleMarkComplete}
              disabled={isCompleting || isCompleted}
              className={`flex items-center gap-1.5 font-bold py-2 px-3.5 rounded-lg text-sm transition-all shadow-sm ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white'
              }`}
              title="Move this survey into the Completed folder"
            >
              {isCompleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Moving...</span>
                </>
              ) : isCompleted ? (
                <>
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Completed</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mark as Completed</span>
                </>
              )}
            </button>

            <button
              onClick={() => window.close()}
              className="bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg text-sm transition-all"
              title="Close window"
            >
              Close
            </button>
          </div>
        </div>
      </header>

      {/* ── Document Preview Area ── */}
      <main className="print-main-area flex-1 py-8 px-4 flex justify-center overflow-auto">
        <div className="print-doc-container w-full max-w-[220mm]">
          <PrintableReport survey={surveyInfo} data={reportData} />
        </div>
      </main>

      {/* ── Explicit Print Styles ── */}
      <style type="text/css">
        {`
          @media print {
            .no-print,
            header,
            [data-no-print] {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-page-wrapper {
              background: #ffffff !important;
              background-color: #ffffff !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
            }
            .print-main-area {
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              overflow: visible !important;
              width: 100% !important;
              max-width: none !important;
            }
            .print-doc-container {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}
      </style>
    </div>
  );
}
