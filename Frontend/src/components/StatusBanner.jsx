import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function StatusBanner({ message, isError, type = 'info' }) {
    if (!message) return null;

    let bgColor = 'bg-blue-50 dark:bg-blue-900/20';
    let textColor = 'text-blue-700 dark:text-blue-400';
    let Icon = Info;

    // Detect rate-limit messages for special styling
    const isRateLimit = typeof message === 'string' && message.includes('daily limit reached');

    if (isRateLimit) {
        bgColor = 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500 animate-pulse';
        textColor = 'text-amber-800 dark:text-amber-400';
        Icon = AlertCircle;
    } else if (isError || type === 'error') {
        bgColor = 'bg-red-50 dark:bg-red-900/20';
        textColor = 'text-red-700 dark:text-red-400';
        Icon = AlertCircle;
    } else if (type === 'success') {
        bgColor = 'bg-green-50 dark:bg-green-900/20';
        textColor = 'text-green-700 dark:text-green-400';
        Icon = CheckCircle;
    }

    return (
        <div className={`p-4 rounded-md flex items-start gap-3 ${bgColor} ${textColor}`}>
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isRateLimit ? 'text-amber-600' : ''}`} />
            <div className={`text-sm font-medium ${isRateLimit ? 'font-bold' : ''}`}>
                {message}
            </div>
        </div>
    );
}
