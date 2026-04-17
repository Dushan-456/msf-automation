import { useState, useEffect } from 'react';
import api from '../utils/api';


/**
 * Self-contained survey detail modal — shows collectors, email tracking,
 * filter pills, copy-table, and send-reminder functionality.
 *
 * Props:
 *   survey   – the survey object ({ id, title, response_count, … })
 *   isOpen   – boolean controlling visibility
 *   onClose  – callback to close the modal
 */
export default function SurveyDetailModal({ survey, isOpen, onClose }) {
  // Collectors
  const [collectors, setCollectors] = useState([]);
  const [collectorsLoading, setCollectorsLoading] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState(null);

  // Tracking
  const [recipients, setRecipients] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [trackingPage, setTrackingPage] = useState(1);

  // Copy
  const [copied, setCopied] = useState(false);

  // Reminder
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  // ── Fetch collectors when modal opens ──
  useEffect(() => {
    if (!isOpen || !survey) {
      setCollectors([]);
      setSelectedCollector(null);
      setRecipients([]);
      return;
    }
    setCollectorsLoading(true);
    setCollectors([]);
    setSelectedCollector(null);
    setRecipients([]);
    api.get(`/surveys/${survey.id}/collectors`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setCollectors(list);
        if (list.length > 0) setSelectedCollector(list[0]);
      })
      .catch(err => {
        console.error('Collectors fetch error:', err);
        const isRateLimit = err.response?.status === 429 || err.response?.data?.error === 'RateLimit';
        if (isRateLimit) showToast('🚫 SurveyMonkey API daily limit reached. Please try again tomorrow.', 'error');
      })
      .finally(() => setCollectorsLoading(false));
  }, [isOpen, survey]);

  // ── Fetch tracking when collector changes ──
  useEffect(() => {
    if (!selectedCollector) return;
    setTrackingLoading(true);
    setRecipients([]);
    setFilterStatus('all');
    setTrackingPage(1);
    api.get(`/collectors/${selectedCollector.id}/tracking`)
      .then(res => setRecipients(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        console.error('Tracking fetch error:', err);
        const isRateLimit = err.response?.status === 429 || err.response?.data?.error === 'RateLimit';
        if (isRateLimit) showToast('🚫 SurveyMonkey API daily limit reached. Please try again tomorrow.', 'error');
      })
      .finally(() => setTrackingLoading(false));
  }, [selectedCollector]);

  // Reset tracking page on filter change
  useEffect(() => { setTrackingPage(1); }, [filterStatus]);

  // ── Derived data ──
  const filteredRecipients = recipients.filter(r => {
    if (filterStatus === 'responded') return r.response_status === 'completely_responded';
    if (filterStatus === 'not_responded') return r.response_status !== 'completely_responded';
    return true;
  });

  const TRACKING_PER_PAGE = 8;
  const isTrackingPaginating = filterStatus === 'all';
  const trackingTotalPages = isTrackingPaginating ? Math.max(1, Math.ceil(filteredRecipients.length / TRACKING_PER_PAGE)) : 1;
  const pagedRecipients = isTrackingPaginating
    ? filteredRecipients.slice((trackingPage - 1) * TRACKING_PER_PAGE, trackingPage * TRACKING_PER_PAGE)
    : filteredRecipients;

  // ── Send reminder ──
  const handleSendReminder = async () => {
    if (!survey) return;
    setIsSending(true);
    try {
      await api.post(`/surveys/${survey.id}/reminders`);
      showToast('Reminders successfully sent to non-respondents!', 'success');
      setIsConfirmOpen(false);
      onClose();
    } catch (err) {
      const isRateLimit = err.response?.status === 429 || err.response?.data?.error === 'RateLimit';
      if (isRateLimit) {
        showToast('🚫 SurveyMonkey API daily limit reached. Please try again tomorrow.', 'error');
      } else {
        const errorMsg = err.response?.data?.error || err.message;
        showToast(`Failed to send reminders: ${errorMsg}`, 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  // ── Copy Table as Rich HTML ──
  const handleCopyTable = async () => {
    const getEmailStatusColor = (status) => {
      if (status === 'bounced' || status === 'opted_out') return '#dc2626';
      if (status === 'sent' || status === 'responded') return '#15803d';
      if (status === 'not_responded') return '#b45309';
      return '#475569';
    };
    const getResponseStatusColor = (status) => {
      if (status === 'completely_responded') return '#15803d';
      if (status === 'partial' || status === 'partially_completed') return '#b45309';
      return '#dc2626';
    };
    const formatLabel = (s) => (s || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const rows = filteredRecipients.map(r => {
      const emailLabel = formatLabel(r.email_status);
      const responseLabel = formatLabel(r.response_status || 'not responded');
      return `<tr>
        <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:13px;color:#334155;word-break:break-all;">${r.email}</td>
        <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:13px;color:${getEmailStatusColor(r.email_status)};font-weight:600;white-space:nowrap;">${emailLabel}</td>
        <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:13px;color:${getResponseStatusColor(r.response_status)};font-weight:600;white-space:nowrap;">${responseLabel}</td>
      </tr>`;
    }).join('');

    const htmlString = `<div style="max-width:600px;overflow-x:auto;">
      <table style="border-collapse:collapse;width:auto;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
      <thead>
        <tr style="background-color:#f1f5f9;">
          <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">Email</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">Email Status</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">Response Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table></div>`;

    const plainText = filteredRecipients.map(r =>
      `${r.email}\t${formatLabel(r.email_status)}\t${formatLabel(r.response_status || 'not responded')}`
    ).join('\n');

    // Method 1: Selection API + execCommand (most reliable for rich HTML in modals)
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.opacity = '0';
      document.body.appendChild(tempDiv);

      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      const success = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(tempDiv);

      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.warn('execCommand copy failed, trying Clipboard API:', err);
    }

    // Method 2: Clipboard API with ClipboardItem (fallback)
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([htmlString], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard API failed:', err);
      // Method 3: Plain text fallback
      try {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('All clipboard methods failed:', e);
      }
    }
  };

  // ── Don't render when closed ──
  if (!isOpen || !survey) return null;

  const closeModal = () => {
    if (!isSending) {
      setIsConfirmOpen(false);
      onClose();
    }
  };

  return (
    <>
      {/* ── Main Modal ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          onClick={closeModal}
        ></div>

        {/* Dialog */}
        <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col justify-between overflow-hidden transform transition-all border border-gray-100 dark:border-gray-800 transition-colors duration-300">
          {/* Close */}
          <button
            onClick={closeModal}
            disabled={isSending}
            className="absolute top-6 right-6 z-10 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors bg-slate-50/80 dark:bg-gray-800/80 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full p-2 backdrop-blur-sm"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="flex items-start justify-between gap-6 px-8 pt-8">
            <div className="shrink-0 text-center bg-slate-300 dark:bg-gray-800 p-2 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-0.5">Current Responses</p>
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{survey.response_count}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight flex-1">{survey.title}</h2>
          </div>

          {/* Scrollable body */}
          <div className="px-8 pb-4 flex-1 overflow-y-auto">
            <p className="mt-6 text-slate-600 dark:text-gray-300 text-sm leading-relaxed">
              You are about to automate sending an email reminder to all
              recipients who have{' '}
              <span className="font-bold text-slate-800 dark:text-white">not yet responded</span>{' '}
              to this survey. This action will be processed by SurveyMonkey immediately.
            </p>

            {/* Collector Tabs + Email Tracking */}
            <div className="mt-6 max-w-4xl mx-auto w-full">
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Email Tracking</h3>
                {!collectorsLoading && !trackingLoading && selectedCollector && (
                  <span className="text-xs font-semibold bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-gray-700">
                    {filteredRecipients.length} / {recipients.length} shown
                  </span>
                )}
              </div>

              {/* Collector picker */}
              {collectorsLoading ? (
                <div className="flex items-center gap-2 mb-3 text-slate-400 dark:text-gray-500 text-sm">
                  <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading collectors...
                </div>
              ) : collectors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-gray-500 border border-slate-100 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-gray-800/20">
                  <svg className="w-8 h-8 mb-2 text-slate-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium">No Email Collectors Found</p>
                  <p className="text-xs mt-0.5">No email collectors are linked to this survey.</p>
                </div>
              ) : (
                <>
                  {/* Collector tab pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {collectors.map((c) => {
                      const isActive = selectedCollector?.id === c.id;
                      const statusDot =
                        c.status === 'open' ? 'bg-emerald-400'
                        : c.status === 'closed' ? 'bg-red-400'
                        : c.status === 'paused' ? 'bg-amber-400'
                        : 'bg-slate-400';
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCollector(c)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white' : statusDot}`}></span>
                          {c.name ?? 'Unnamed Collector'}
                          <span className={`ml-0.5 capitalize opacity-75 ${isActive ? 'text-blue-200' : 'text-slate-400 dark:text-gray-500'}`}>
                            · {c.type ?? 'email'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Filter Pills */}
                  {!trackingLoading && recipients.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {[
                        ['all', 'All'],
                        ['responded', 'Responded'],
                        ['not_responded', 'Not Responded'],
                      ].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setFilterStatus(val)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                            filterStatus === val
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-gray-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm'
                          
                            }` 
                        
                        }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Copy Table Button */}
                  {!trackingLoading && filteredRecipients.length > 0 && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={handleCopyTable}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                          copied
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md'
                        }`}
                        title="Copy table as formatted HTML for email"
                      >
                        {copied ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy Table
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Tracking Table */}
                  <div className="border border-slate-100 dark:border-gray-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-gray-900/50">
                    {trackingLoading ? (
                      <div className="flex items-center justify-center gap-3 py-8 text-slate-500 dark:text-gray-400">
                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium">Loading tracking data...</span>
                      </div>
                    ) : filteredRecipients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-gray-500">
                        <svg className="w-8 h-8 mb-2 text-slate-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-sm font-medium">No recipients found</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-gray-800/50 border-b border-slate-200 dark:border-gray-700">
                            <th className="text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2.5">Email</th>
                            <th className="text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2.5">Email Status</th>
                            <th className="text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2.5">Response Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                          {pagedRecipients.map((r, idx) => {
                            const emailStatusColor =
                              r.email_status === 'bounced' || r.email_status === 'opted_out'
                                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                                : r.email_status === 'sent' || r.email_status === 'responded'
                                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                  : r.email_status === 'not_responded'
                                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                    : r.email_status === 'survey_not_sent'
                                      ? 'text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800'
                                      : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-800';
                            const responseStatusColor =
                              r.response_status === 'completely_responded'
                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                : r.response_status === 'partial' || r.response_status === 'partially_completed'
                                  ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                  : r.response_status === 'not_responded' || !r.response_status
                                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                                    : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-800';
                            const emailLabel = (r.email_status || 'unknown').replace(/_/g, ' ');
                            const responseLabel = (r.response_status || 'not responded').replace(/_/g, ' ');
                            return (
                              <tr key={idx} className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors group">
                                <td className={`px-4 ${isTrackingPaginating ? 'py-2.5' : 'py-1.5'} text-slate-700 dark:text-gray-300 font-medium truncate max-w-[180px]`} title={r.email}>
                                  {r.email}
                                </td>
                                <td className={`px-4 ${isTrackingPaginating ? 'py-2.5' : 'py-1.5'}`}>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${emailStatusColor}`}>
                                    {emailLabel}
                                  </span>
                                </td>
                                <td className={`px-4 ${isTrackingPaginating ? 'py-2.5' : 'py-1.5'}`}>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${responseStatusColor}`}>
                                    {responseLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Tracking Pagination */}
                  {!trackingLoading && isTrackingPaginating && trackingTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-xs text-slate-500 dark:text-gray-400">
                        Page <span className="font-bold text-slate-700 dark:text-white">{trackingPage}</span> of {trackingTotalPages}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setTrackingPage(p => Math.max(1, p - 1))}
                          disabled={trackingPage === 1}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                            trackingPage === 1
                              ? 'bg-slate-50 dark:bg-gray-800 text-slate-300 dark:text-gray-600 border-slate-100 dark:border-gray-800 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600 shadow-sm'
                          }`}
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => setTrackingPage(p => Math.min(trackingTotalPages, p + 1))}
                          disabled={trackingPage === trackingTotalPages}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                            trackingPage === trackingTotalPages
                              ? 'bg-slate-50 dark:bg-gray-800 text-slate-300 dark:text-gray-600 border-slate-100 dark:border-gray-800 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600 shadow-sm'
                          }`}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 pt-4 border-t border-slate-50 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] transition-colors">
            <div className="flex justify-center gap-4 max-w-xl mx-auto w-full">
              <button
                onClick={closeModal}
                className="flex-1 py-3 px-6 rounded-xl text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md font-bold transition-all"
              >
                Send Reminders Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={!isSending ? () => setIsConfirmOpen(false) : undefined}
          ></div>

          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all p-8 flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 p-4 rounded-full mb-6 transition-colors">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Confirm Action</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-8 leading-relaxed">
              Are you exactly sure you want to send reminders for{' '}
              <span className="font-bold text-slate-800 dark:text-white">"{survey.title}"</span>?
              This action will email all non-respondents immediately.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSending}
                className="flex-1 py-3 px-4 rounded-xl text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 font-bold transition-colors disabled:opacity-50"
              >
                No, Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={isSending}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-red-600 hover:bg-red-700 shadow-md font-bold transition-all disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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

      {/* ── Toast ── */}
      {toast.show && (
        <div
          className={`fixed bottom-8 right-8 z-[70] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-medium text-white max-w-sm animate-[bounce_0.5s_ease-out]
            ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
        >
          {toast.type === 'success' ? (
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <p className="leading-tight">{toast.message}</p>
        </div>
      )}
    </>
  );
}
