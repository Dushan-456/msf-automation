export default function ProgressBar({ progress, total, status, currentActivity }) {
    if (total === 0) return null;

    const percentage = Math.round((progress / total) * 100);
    
    let barColor = 'bg-blue-600';
    if (status === 'completed') barColor = 'bg-green-500';
    if (status === 'failed') barColor = 'bg-red-500';

    return (
        <div className="w-full mt-4 border border-gray-100 dark:border-gray-800 p-4 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                <span className="uppercase tracking-wider">{status === 'completed' ? 'Done' : 'Processing...'}</span>
                <span>{progress} / {total} ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                    className={`${barColor} h-3 rounded-full transition-all duration-500 ease-in-out`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            {currentActivity && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 text-center font-medium animate-pulse">
                    {currentActivity}
                </div>
            )}
        </div>
    );
}
