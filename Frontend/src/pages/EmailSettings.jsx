import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Mail, Code2, AlignLeft, Save, RotateCcw, CheckCircle,
  AlertTriangle, Info, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

const PLACEHOLDER_TAGS = [
  { tag: '[SurveyLink]', desc: 'Unique survey URL for each recipient (required)' },
  { tag: '[OptOutLink]', desc: 'Unsubscribe link (required)' },
  { tag: '[PrivacyLink]', desc: 'SurveyMonkey privacy policy link (required)' },
  { tag: '[FooterLink]', desc: 'SurveyMonkey footer link (required)' },
  { tag: '[DoctorName]', desc: "Doctor's name — auto-replaced per survey" },
];

export default function EmailSettings() {
  const [format, setFormat] = useState('text');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/email');
      setFormat(res.data.format);
      setBodyHtml(res.data.bodyHtml);
      setBodyText(res.data.bodyText);
    } catch (err) {
      showStatus('Failed to load email settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (message, type) => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: '', type: '' }), 4000);
  };

  const handleFormatChange = async (newFormat) => {
    if (newFormat === format) return;
    const prev = format;
    setFormat(newFormat);
    setSaving(true);
    try {
      await api.put('/settings/email', { format: newFormat, bodyHtml, bodyText });
      showStatus(`Switched to ${newFormat === 'html' ? 'Rich HTML' : 'Plain Text'} email format.`, 'success');
    } catch (err) {
      showStatus(err.response?.data?.error || 'Failed to save format.', 'error');
      setFormat(prev);
    } finally {
      setSaving(false);
    }
  };

  const handleTestHtmlSupport = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/email/test-html');
      setTestResult(res.data);
    } catch (err) {
      setTestResult({
        supported: false,
        message: 'Test failed to execute.',
        detail: err.response?.data?.error || err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveTemplates = async () => {
    setSaving(true);
    try {
      await api.put('/settings/email', { format, bodyHtml, bodyText });
      showStatus('Email templates saved successfully.', 'success');
    } catch (err) {
      showStatus(err.response?.data?.error || 'Failed to save templates.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (template) => {
    setResetting(template);
    try {
      await api.delete(`/settings/email/reset/${template}`);
      await fetchSettings();
      showStatus(`${template === 'all' ? 'All templates' : template.toUpperCase() + ' template'} reset to default.`, 'success');
    } catch (err) {
      showStatus('Failed to reset template.', 'error');
    } finally {
      setResetting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <Mail className="w-10 h-10 text-blue-600" />
          Email Settings
        </h1>
        <p className="mt-2 text-slate-500 dark:text-gray-400 text-lg">
          Configure how invitation and reminder emails are sent via SurveyMonkey.
        </p>
      </div>

      {/* Fixed Toast Notification */}
      {status.message && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl text-sm font-medium transition-all duration-300 animate-in slide-in-from-bottom-4 ${
          status.type === 'success'
            ? 'bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-emerald-100 dark:shadow-none'
            : 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 shadow-red-100 dark:shadow-none'
        }`}>
          {status.type === 'success'
            ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            : <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />}
          {status.message}
        </div>
      )}

      {/* ── Section 1: Email Format ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Email Format</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
          Choose how emails are delivered. Applies to CSV/Manual creation, Send Reminders, and Add Invitees.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* HTML Card */}
          <button
            id="format-html-btn"
            onClick={() => handleFormatChange('html')}
            disabled={saving}
            className={`relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all duration-200 ${
              format === 'html'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
                : 'border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 hover:border-slate-300 dark:hover:border-gray-600'
            }`}
          >
            {format === 'html' && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/15 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            )}
            <div className={`p-2.5 rounded-lg ${format === 'html' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-400'}`}>
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-gray-100">🎨 Rich HTML Email</p>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                Sends your fully-designed HTML template. Requires a SurveyMonkey plan that supports custom HTML via API. Returns 404 if plan does not support it.
              </p>
            </div>
          </button>

          {/* Plain Text Card */}
          <button
            id="format-text-btn"
            onClick={() => handleFormatChange('text')}
            disabled={saving}
            className={`relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all duration-200 ${
              format === 'text'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30'
                : 'border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 hover:border-slate-300 dark:hover:border-gray-600'
            }`}
          >
            {format === 'text' && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            )}
            <div className={`p-2.5 rounded-lg ${format === 'text' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-400'}`}>
              <AlignLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-gray-100">📄 Plain Text Email</p>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                Sends plain text only. Works on all SurveyMonkey plans. SurveyMonkey wraps it in their standard email layout automatically.
              </p>
            </div>
          </button>
        </div>

        {/* HTML Support Test Button & Status */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">Not sure if HTML is supported?</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Run a live test against your SurveyMonkey account (creates and deletes a temporary draft message — no email sent).
            </p>
          </div>
          <button
            id="test-html-btn"
            onClick={handleTestHtmlSupport}
            disabled={testing || saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-800 dark:text-gray-200 text-sm font-bold rounded-xl transition-all border border-slate-200 dark:border-gray-700 shrink-0 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Code2 className="w-4 h-4 text-blue-500" />}
            {testing ? 'Testing...' : 'Test HTML Support'}
          </button>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            testResult.supported
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
          }`}>
            {testResult.supported ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-bold text-sm">{testResult.message}</p>
              {testResult.detail && (
                <p className="text-xs opacity-90 mt-1 font-mono break-all">{testResult.detail}</p>
              )}
              {!testResult.supported && (
                <p className="text-xs mt-2 font-medium">
                  👉 Recommendation: Keep your Email Format set to <span className="underline">Plain Text Email</span> to avoid 404 errors when sending invites or reminders.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Template Editor ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Email Templates</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
          Customise the email body for both formats. Use{' '}
          <code className="text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-500/10 px-1 py-0.5 rounded">[DoctorName]</code>
          {' '}as a placeholder — it is replaced automatically per survey.
        </p>

        {/* Placeholder Reference (collapsible) */}
        <button
          id="toggle-placeholders-btn"
          onClick={() => setShowPlaceholders(prev => !prev)}
          className="flex items-center gap-2 mt-4 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          Required SurveyMonkey placeholders
          {showPlaceholders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showPlaceholders && (
          <div className="mt-3 p-4 bg-slate-50 dark:bg-gray-800/70 rounded-lg border border-slate-200 dark:border-gray-700 space-y-2">
            {PLACEHOLDER_TAGS.map(({ tag, desc }) => (
              <div key={tag} className="flex items-start gap-3">
                <code className="text-blue-600 dark:text-blue-300 text-xs bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded font-mono shrink-0">{tag}</code>
                <span className="text-xs text-slate-500 dark:text-gray-400">{desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-6 p-1 bg-slate-100 dark:bg-gray-800 rounded-lg w-fit">
          <button
            id="tab-text-btn"
            onClick={() => setActiveTab('text')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'text'
                ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            Plain Text
          </button>
          <button
            id="tab-html-btn"
            onClick={() => setActiveTab('html')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'html'
                ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            HTML
          </button>
        </div>

        {/* Editor */}
        <div className="mt-4 space-y-3">
          {activeTab === 'text' ? (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700 dark:text-gray-300 font-medium">Plain Text Body</label>
                <button
                  id="reset-text-btn"
                  onClick={() => handleReset('text')}
                  disabled={resetting !== null}
                  className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  {resetting === 'text' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Reset to default
                </button>
              </div>
              <textarea
                id="body-text-editor"
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                rows={16}
                spellCheck={false}
                className="w-full bg-slate-50 dark:bg-gray-800 text-slate-800 dark:text-gray-200 text-sm font-mono border border-slate-200 dark:border-gray-700 rounded-xl p-4 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                placeholder="Enter your plain text email body..."
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700 dark:text-gray-300 font-medium">HTML Body</label>
                <button
                  id="reset-html-btn"
                  onClick={() => handleReset('html')}
                  disabled={resetting !== null}
                  className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  {resetting === 'html' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Reset to default
                </button>
              </div>
              <textarea
                id="body-html-editor"
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                rows={20}
                spellCheck={false}
                className="w-full bg-slate-50 dark:bg-gray-800 text-slate-800 dark:text-gray-200 text-sm font-mono border border-slate-200 dark:border-gray-700 rounded-xl p-4 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                placeholder="Enter your HTML email body..."
              />
            </>
          )}
        </div>

        {/* Save + Reset All Row */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100 dark:border-gray-800">
          <button
            id="reset-all-btn"
            onClick={() => handleReset('all')}
            disabled={resetting !== null || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-500/40 rounded-xl transition-all disabled:opacity-50"
          >
            {resetting === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reset All to Default
          </button>
          <button
            id="save-templates-btn"
            onClick={handleSaveTemplates}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Templates
          </button>
        </div>
      </div>
    </div>
  );
}
