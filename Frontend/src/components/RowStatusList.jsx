import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

export default function RowStatusList({ rows }) {
    if (!rows || rows.length === 0) return null;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'processing':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            default: // pending
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30';
            case 'failed': return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30';
            case 'processing': return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30';
            default: return 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500';
        }
    };

    return (
        <div className="mt-6 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-900 transition-colors duration-300">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Detailed Status (Row by Row)
            </div>
            <ul className="overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row, idx) => (
                    <li key={idx} className={`p-4 transition-colors ${getStatusStyle(row.status)}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                {getStatusIcon(row.status)}
                                <div>
                                    <p className={`font-medium ${row.status === 'pending' ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {row.doctorName || `Row ${idx + 1}`}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                        {row.detail || row.status}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {row.error && (
                            <div className="mt-2 ml-8 text-sm text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800 italic">
                                {row.error}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
