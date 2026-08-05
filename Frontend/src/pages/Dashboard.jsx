import { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
    BarChart2 as ChartBarIcon, 
    FileCheck as DocumentCheckIcon, 
    ClipboardList as ClipboardDocumentListIcon,
    TrendingUp as ArrowTrendingUpIcon 
} from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
            <div className="w-full space-y-8 animate-pulse pb-8">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="space-y-3">
                        <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                        <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                    </div>
                    <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>

                {/* Full Summary Cards Skeleton */}
                <div>
                    <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 ml-1"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[104px] flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                </div>
                                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Summary Cards Skeleton */}
                <div>
                    <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 ml-1"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 h-[88px]">
                                <div className="h-11 w-11 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                    <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
                    {/* Main Chart Skeleton */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2 h-[410px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
                    </div>
                    {/* Donut Chart Skeleton */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[410px] flex flex-col">
                        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6"></div>
                        <div className="flex-1 flex items-center justify-center">
                            <div className="h-48 w-48 rounded-full border-[12px] border-slate-100 dark:border-slate-700/50"></div>
                        </div>
                    </div>
                </div>
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

    const pieData = [
        { name: 'To Be Analyzed', value: stats?.fullSummary?.toBeAnalyzed || 0, color: '#f97316' },
        { name: 'Ready for Analysis', value: stats?.fullSummary?.readyForAnalysis || 0, color: '#3b82f6' },
        { name: 'Analyzed & Completed', value: stats?.fullSummary?.analyzedCompleted || 0, color: '#10b981' }
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-white mb-1">{label || payload[0].name}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name === 'surveys' ? 'Active Surveys' : entry.name}: <span className="font-bold">{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full space-y-8 animate-fade-in-up pb-8">
            
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
                <div className="flex flex-col items-end">
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <ArrowTrendingUpIcon className="w-5 h-5" />
                        Avg Turnaround: {stats?.avgTurnaroundDays || 0} Days
                    </div>
                </div>
            </div>

            {/* Full Summary Cards */}
            <div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 px-1">All-Time Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Total Created Card */}
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-xl group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors"></div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Created</p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-white">
                                    {stats?.fullSummary?.totalCreated || 0}
                                </h3>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl z-10 relative">
                                <ClipboardDocumentListIcon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

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
                            <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.monthlySummary?.created || 0}</p>
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

            {/* Analytics Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
                
                {/* 1. Bar Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col hover:shadow-md transition-shadow lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">Creation vs Analysis Trend</h2>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">Last 6 Months</span>
                    </div>
                    <div className="flex-1 min-h-[300px] w-full">
                        {stats?.trendData && stats.trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 12 }} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 12 }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    <Bar dataKey="created" name="Created" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="analyzed" name="Analyzed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                                Not enough historical data yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Status Distribution Donut Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-6">Status Distribution</h2>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Custom Legend */}
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                        {pieData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Area Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col hover:shadow-md transition-shadow lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">Activity Velocity</h2>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">Last 6 Months</span>
                    </div>
                    <div className="flex-1 min-h-[300px] w-full">
                        {stats?.trendData && stats.trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorAnalyzed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 12 }} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 12 }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="created" 
                                        name="Created"
                                        stroke="#a855f7" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#colorCreated)" 
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#a855f7' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="analyzed" 
                                        name="Analyzed"
                                        stroke="#10b981" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#colorAnalyzed)" 
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                                Not enough historical data yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Level Distribution Donut */}
                {stats?.levelData && stats.levelData.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col hover:shadow-md transition-shadow">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-6">Surveys by Level</h2>
                        <div className="flex-1 min-h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={stats.levelData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={75}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {stats.levelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* 5. Specialty Breakdown */}
                {stats?.specialtyData && stats.specialtyData.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col hover:shadow-md transition-shadow lg:col-span-2 xl:col-span-3">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-6">Surveys by Specialty (Top 10)</h2>
                        <div className="flex-1 min-h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={stats.specialtyData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={110}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={true}
                                    >
                                        {stats.specialtyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9'][index % 10]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Dashboard;
