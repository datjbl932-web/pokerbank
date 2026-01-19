import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subValue, trend, color }) => {
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';
  const borderColor = color ? color : 'border-gray-700';

  return (
    <div className={`bg-slate-800 p-4 rounded-xl border ${borderColor} shadow-lg flex flex-col justify-between`}>
      <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
      <div className="mt-2">
        <div className={`text-2xl font-bold truncate ${trendColor}`}>{value}</div>
        {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};