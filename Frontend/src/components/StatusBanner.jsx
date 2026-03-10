import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function StatusBanner({ message, isError, type = 'info' }) {
    if (!message) return null;

    let bgColor = 'bg-blue-50';
    let textColor = 'text-blue-700';
    let Icon = Info;

    if (isError || type === 'error') {
        bgColor = 'bg-red-50';
        textColor = 'text-red-700';
        Icon = AlertCircle;
    } else if (type === 'success') {
        bgColor = 'bg-green-50';
        textColor = 'text-green-700';
        Icon = CheckCircle;
    }

    return (
        <div className={`p-4 rounded-md flex items-start gap-3 ${bgColor} ${textColor}`}>
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-medium">
                {message}
            </div>
        </div>
    );
}
