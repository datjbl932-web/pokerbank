import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subValue, trend, color }) => {
  const trendColor = trend === 'up' ? 'text-green-500 dark:text-green-400' : trend === 'down' ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-gray-400';
  const borderColor = color ? color : 'border-gray-200 dark:border-gray-700';

  return (
    <div className={`bg-white dark:bg-slate-800 p-4 rounded-xl border ${borderColor} shadow-sm dark:shadow-lg flex flex-col justify-between transition-colors`}>
      <h3 className="text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</h3>
      <div className="mt-1">
        <div className={`text-2xl font-bold truncate text-slate-900 dark:text-white ${trend !== undefined ? trendColor : ''}`}>{value}</div>
        {subValue && <div className="text-xs text-slate-500 dark:text-gray-500 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};