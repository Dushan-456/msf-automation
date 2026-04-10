import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
  ? import.meta.env.VITE_API_URL
  : `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;

export default function SubjectSettings() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Form state
  const [name, setName] = useState('');
  const [clerkEmail, setClerkEmail] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);

  // Global settings state
  const [arEmail, setArEmail] = useState('');
  const [arEmailSaved, setArEmailSaved] = useState('');
  const [savingAr, setSavingAr] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchGlobalSettings();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/subjects`);
      setSubjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      showToast('Failed to load subjects.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/subjects/settings`);
      const email = res.data.data?.assistantRegistrarEmail || '';
      setArEmail(email);
      setArEmailSaved(email);
    } catch (err) {
      console.error('Failed to fetch global settings:', err);
    }
  };

  const handleSaveArEmail = async () => {
    setSavingAr(true);
    try {
      await axios.put(`${API_URL}/subjects/settings`, {
        assistantRegistrarEmail: arEmail
      });
      setArEmailSaved(arEmail);
      showToast('Assistant Registrar email updated.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update.', 'error');
    } finally {
      setSavingAr(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  const clearForm = () => {
    setName('');
    setClerkEmail('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        // Update
        await axios.put(`${API_URL}/subjects/${editingId}`, {
          name, clerkEmail
        });
        showToast(`Subject "${name}" updated successfully.`, 'success');
      } else {
        // Create
        await axios.post(`${API_URL}/subjects`, {
          name, clerkEmail
        });
        showToast(`Subject "${name}" added successfully.`, 'success');
      }
      clearForm();
      fetchSubjects();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save subject.';
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingId(subject._id);
    setName(subject.name);
    setClerkEmail(subject.clerkEmail);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete "${subjectName}"?`)) return;

    try {
      await axios.delete(`${API_URL}/subjects/${id}`);
      showToast(`Subject "${subjectName}" deleted.`, 'success');
      fetchSubjects();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete subject.', 'error');
    }
  };

  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.clerkEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-5 max-w-5xl mx-auto pt-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 border-b-4 border-violet-500 pb-2 inline-block">
          Subject Settings
        </h1>
        <p className="text-gray-500 mt-2">
          Manage subjects and their associated email contacts.
        </p>
      </div>

      {/* Global Assistant Registrar Email */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Assistant Registrar Email
              <span className="text-xs font-normal text-gray-400">(Global — applies to all subjects)</span>
            </label>
            <input
              type="email"
              value={arEmail}
              onChange={(e) => setArEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
              placeholder="registrar@pgim.cmb.ac.lk"
            />
          </div>
          <button
            onClick={handleSaveArEmail}
            disabled={savingAr || arEmail === arEmailSaved || !arEmail}
            className={`px-5 py-2.5 rounded-lg text-white font-bold text-sm transition-all whitespace-nowrap ${
              savingAr || arEmail === arEmailSaved || !arEmail
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 shadow-sm'
            }`}
          >
            {savingAr ? 'Saving...' : 'Save'}
          </button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add/Edit Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              {editingId ? (
                <>
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Subject
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Subject
                </>
              )}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
                  placeholder="e.g. Cardiology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clerk Email
                </label>
                <input
                  type="email"
                  value={clerkEmail}
                  onChange={(e) => setClerkEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
                  placeholder="clerk@pgim.cmb.ac.lk"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-white font-bold text-sm transition-all ${
                    saving
                      ? 'bg-gray-400 cursor-not-allowed'
                      : editingId
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-sm'
                        : 'bg-violet-600 hover:bg-violet-700 shadow-sm'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : editingId ? 'Update Subject' : 'Add Subject'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-4 py-2.5 rounded-lg text-gray-600 font-bold text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Subject List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 shrink-0">
                All Subjects
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredSubjects.length}{searchQuery ? ` of ${subjects.length}` : ''})
                </span>
              </h3>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subjects..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  onClick={fetchSubjects}
                  disabled={loading}
                  className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                  title="Refresh"
                >
                  <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                <svg className="animate-spin h-8 w-8 text-violet-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm">Loading subjects...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-14 h-14 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm font-medium text-gray-500">No subjects yet</p>
                <p className="text-xs text-gray-400 mt-1">Add your first subject using the form.</p>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-500">No subjects matched your search</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredSubjects.map((subject) => (
                  <div
                    key={subject._id}
                    className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group ${
                      editingId === subject._id ? 'bg-amber-50 border-l-4 border-amber-400' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-800 truncate">
                        {subject.name}
                      </h4>
                      <div className="flex flex-col sm:flex-row sm:gap-4 mt-1">
                        <p className="text-xs text-gray-500 truncate">
                          <span className="font-medium text-gray-600">Clerk:</span> {subject.clerkEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(subject._id, subject.name)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
