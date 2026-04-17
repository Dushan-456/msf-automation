import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Key, Plus, Trash2, CheckCircle, Circle, Loader2, Link as LinkIcon } from 'lucide-react';

export default function TokenSettings() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [tokenStatuses, setTokenStatuses] = useState({});
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tokens');
      setTokens(res.data);
      // Automatically validate after fetching
      validateTokens();
    } catch (err) {
      showStatus('Failed to fetch tokens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateTokens = async () => {
    setValidating(true);
    try {
      const res = await api.get('/tokens/validate-all');
      setTokenStatuses(res.data);
    } catch (err) {
      console.error('Validation failed', err);
    } finally {
      setValidating(false);
    }
  };

  const handleAddToken = async (e) => {
    e.preventDefault();
    if (!newName || !newToken) return;
    
    setAdding(true);
    try {
      await api.post('/tokens', { name: newName, token: newToken });
      showStatus('Token added successfully', 'success');
      setNewName('');
      setNewToken('');
      fetchTokens();
    } catch (err) {
      showStatus(err.response?.data?.message || 'Failed to add token', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.patch(`/tokens/${id}/activate`);
      showStatus('Token activated', 'success');
      fetchTokens();
    } catch (err) {
      showStatus('Failed to activate token', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this token?')) return;
    try {
      await api.delete(`/tokens/${id}`);
      showStatus('Token deleted', 'success');
      fetchTokens();
    } catch (err) {
      showStatus('Failed to delete token', 'error');
    }
  };

  const showStatus = (message, type) => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: '', type: '' }), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <Key className="w-10 h-10 text-blue-600" />
          API Token Management
        </h1>
        <p className="mt-2 text-slate-500 dark:text-gray-400 text-lg">
          Configure multiple SurveyMonkey Access Tokens and switch between them seamlessly.
        </p>
      </div>

      {status.message && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
          <span className="font-medium">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Token Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-gray-800 p-6 sticky top-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Add New Token
            </h2>
            <form onSubmit={handleAddToken} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">Token Name / Label</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Main Production Token"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">Access Token</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    placeholder="paste SM_ACCESS_TOKEN here"
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-900 dark:text-white"
                    required
                  />
                  <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Add API Token
              </button>
            </form>
          </div>
        </div>

        {/* Tokens List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Active & Saved Tokens</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={validateTokens}
                disabled={validating || tokens.length === 0}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify All"}
              </button>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                {tokens.length} Saved
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <p className="font-medium">Loading tokens...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="bg-slate-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-800 py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Key className="w-16 h-16 opacity-20" />
              <p className="text-lg font-medium">No custom tokens found in database</p>
              <p className="text-sm">The system will fallback to SM_ACCESS_TOKEN from .env</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div
                  key={token._id}
                  className={`relative group bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all duration-300 ${
                    token.isActive 
                      ? 'border-blue-500 shadow-xl shadow-blue-500/5 ring-1 ring-blue-500/20' 
                      : 'border-slate-100 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-colors ${
                        token.isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-gray-800 text-slate-400'
                      }`}>
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          {token.name}
                          {token.isActive && (
                            <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] uppercase font-black px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              Active
                            </span>
                          )}
                          {tokenStatuses[token._id] && (
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border flex items-center gap-1 ${
                              tokenStatuses[token._id].isValid 
                                ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                : 'bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tokenStatuses[token._id].isValid ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              {tokenStatuses[token._id].isValid ? 'Valid' : tokenStatuses[token._id].message || 'Invalid'}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm font-mono text-slate-400 mt-1">
                          ••••••••{token.token.slice(-6)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!token.isActive && (
                        <button
                          onClick={() => handleActivate(token._id)}
                          className="px-4 py-2 bg-slate-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-sm font-bold transition-all border border-slate-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(token._id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        title="Delete Token"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {token.isActive && (
                    <div className="absolute -top-px -right-px w-3 h-3 bg-blue-500 rounded-bl-lg rounded-tr-lg"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
