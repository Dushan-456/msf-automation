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
            case 'completed': return 'bg-green-50 border-green-200';
            case 'failed': return 'bg-red-50 border-red-200';
            case 'processing': return 'bg-blue-50 border-blue-200';
            default: return 'bg-gray-50 border-gray-200 text-gray-400';
        }
    };

    return (
        <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-700">
                Detailed Status (Row by Row)
            </div>
            <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {rows.map((row, idx) => (
                    <li key={idx} className={`p-4 transition-colors ${getStatusStyle(row.status)}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                {getStatusIcon(row.status)}
                                <div>
                                    <p className={`font-medium ${row.status === 'pending' ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {row.doctorName || `Row ${idx + 1}`}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                                        {row.status}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {row.error && (
                            <div className="mt-2 ml-8 text-sm text-red-600 bg-red-100/50 p-2 rounded border border-red-100 italic">
                                {row.error}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
