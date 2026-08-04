import { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
    BarChart2 as ChartBarIcon, 
    FileCheck as DocumentCheckIcon, 
    ClipboardList as ClipboardDocumentListIcon,
    TrendingUp as ArrowTrendingUpIcon 
} from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                const res = await api.get('/surveys/dashboard-stats');
                setStats(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load dashboard stats:", err);
                const isRateLimit = err.response?.status === 429 || err.response?.data?.error === 'RateLimit';
                setError(isRateLimit ? 'SurveyMonkey API limit reached.' : (err.response?.data?.error || 'Failed to load dashboard statistics.'));
                setLoading(false);
            }
        };
        fetchDashboardStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <div className="text-red-500 bg-red-100 dark:bg-red-900/30 px-6 py-4 rounded-lg shadow-sm border border-red-200 dark:border-red-800">
                    {error}
                </div>
            </div>
        );
    }

    const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="w-full space-y-8 animate-fade-in-up">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-7 h-7 text-blue-500" />
                        Dashboard Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Overview of survey processing and analysis metrics
                    </p>
                </div>
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                    <ArrowTrendingUpIcon className="w-5 h-5" />
                    Live Metrics
                </div>
            </div>

            {/* Full Summary Cards */}
            <div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 px-1">All-Time Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* To Be Analyzed Card */}
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full blur-xl group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40 transition-colors"></div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">To Be Analyzed</p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-white">
                                    {stats?.fullSummary?.toBeAnalyzed || 0}
                                </h3>
                            </div>
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-xl z-10 relative">
                                <ClipboardDocumentListIcon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Ready for Analysis Card */}
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors"></div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ready for Analysis</p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-white">
                                    {stats?.fullSummary?.readyForAnalysis || 0}
                                </h3>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl z-10 relative">
                                <ChartBarIcon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Analyzed & Completed Card */}
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/40 transition-colors"></div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Analyzed & Completed</p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-white">
                                    {stats?.fullSummary?.analyzedCompleted || 0}
                                </h3>
                            </div>
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl z-10 relative">
                                <DocumentCheckIcon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Summary Cards */}
            <div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 px-1 flex items-center gap-2">
                    Summary for {currentMonthName}
                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">Recent</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Monthly To Be Analyzed Card */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-500 rounded-lg">
                            <ClipboardDocumentListIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">To Be Analyzed</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.monthlySummary?.toBeAnalyzed || 0}</p>
                        </div>
                    </div>

                    {/* Monthly Ready Card */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-lg">
                            <ChartBarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Ready for Analysis</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.monthlySummary?.readyForAnalysis || 0}</p>
                        </div>
                    </div>

                    {/* Monthly Analyzed Card */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-lg">
                            <DocumentCheckIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Analyzed & Completed</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.monthlySummary?.analyzedCompleted || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
