export default function ProgressBar({ progress, total, status }) {
    if (total === 0) return null;

    const percentage = Math.round((progress / total) * 100);
    
    let barColor = 'bg-blue-600';
    if (status === 'completed') barColor = 'bg-green-500';
    if (status === 'failed') barColor = 'bg-red-500';

    return (
        <div className="w-full mt-4">
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>{status === 'completed' ? 'Done' : 'Processing...'}</span>
                <span>{progress} / {total} ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                    className={`${barColor} h-2.5 rounded-full transition-all duration-500 ease-in-out`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}
