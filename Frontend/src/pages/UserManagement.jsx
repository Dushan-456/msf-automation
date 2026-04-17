import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Users, UserPlus, Trash2, Shield, User, Loader2, Mail, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username || !password || !role) return;

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/users', { username, password, role });
      setSuccess(`User "${username}" created successfully`);
      setUsername('');
      setPassword('');
      setRole('USER');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return;

    try {
      await api.delete(`/users/${id}`);
      setSuccess(`User "${name}" deleted`);
      fetchUsers();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="w-10 h-10 text-indigo-600" />
          Access Control
        </h1>
        <p className="mt-2 text-slate-500 dark:text-gray-400 text-lg">
          Manage system users and their permission levels.
        </p>
      </div>

      {(error || success) && (
        <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 transition-all ${
          success ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800'
        }`}>
          {success ? <ShieldCheck className="w-5 h-5 flex-shrink-0" /> : <ShieldAlert className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium text-sm">{success || error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Creation Section */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-800 p-8 sticky top-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              New Identity
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-2">Username</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 dark:text-white transition-all text-sm font-medium"
                    placeholder="e.g. jdoe_admin"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-2">Password</label>
                <div className="relative group">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 dark:text-white transition-all text-sm font-medium"
                    placeholder="Min 4 characters"
                    minLength={4}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-2">Authority Level</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('USER')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${
                      role === 'USER' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'border-slate-100 dark:border-gray-800 text-slate-400 bg-slate-50 dark:bg-transparent'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${
                      role === 'ADMIN' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'border-slate-100 dark:border-gray-800 text-slate-400 bg-slate-50 dark:bg-transparent'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                Register User
              </button>
            </form>
          </div>
        </div>

        {/* Directory Section */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Active Users</h2>
              <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-black px-3 py-1 rounded-full uppercase">
                {users.length} Identities
              </span>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="font-bold text-sm">Synchronizing directory...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-24 text-center text-slate-400 bg-slate-50 dark:bg-gray-900/50">
                <Users className="w-20 h-20 mx-auto opacity-10 mb-4" />
                <p className="text-lg font-bold">No other users found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-gray-800">
                {users.map((u) => (
                  <div key={u._id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all ${
                        u.role === 'ADMIN' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400'
                      }`}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 dark:text-white">{u.username}</h3>
                          <span className={`text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded-lg border transition-all ${
                            u.role === 'ADMIN' 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-400' 
                                : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteUser(u._id, u.username)}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                      title="Revoke Access"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
