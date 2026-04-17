import React from 'react';

export default function SurveyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-slate-100 dark:border-gray-800 shadow-sm flex items-center justify-between group overflow-hidden">
      
      <div className="flex items-center gap-4 flex-1 pr-6 animate-pulse">
        {/* Icon Skeleton */}
        <div className="bg-slate-100 dark:bg-gray-800 p-3 rounded-lg w-12 h-12 shrink-0"></div>
        
        {/* Title and ID text */}
        <div className="flex-1 max-w-2xl">
          <div className="h-5 bg-slate-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-100 dark:bg-gray-800 rounded w-1/4"></div>
        </div>
      </div>

      {/* Responses count skeleton */}
      <div className="text-right shrink-0 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-8 ml-auto mb-1"></div>
        <div className="h-3 bg-slate-100 dark:bg-gray-800 rounded w-16 ml-auto"></div>
      </div>
    </div>
  );
}
