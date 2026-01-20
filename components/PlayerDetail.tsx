import React, { useState, useEffect } from 'react';
import { PlayerStat, PokerSession } from '../types';
import { ArrowLeft, Trophy, Calendar, DollarSign, Edit, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getPlayerRank, AVATARS, RANKS } from '../utils/gameUtils';

interface PlayerDetailProps {
  player: PlayerStat;
  allSessions: PokerSession[];
  onBack: () => void;
  onUpdateAvatar: (name: string, avatar: string) => void;
}

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, allSessions, onBack, onUpdateAvatar }) => {
  const [history, setHistory] = useState<{ date: string; profit: number; cumulative: number }[]>([]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    // Calculate history for specific player
    const stats: { date: string; profit: number; cumulative: number }[] = [];
    let runningTotal = 0;

    // Filter sessions where this player played, sort by date ascending
    const playedSessions = allSessions
      .filter(s => s.players.some(p => p.name === player.name))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    playedSessions.forEach(s => {
      const pData = s.players.find(p => p.name === player.name);
      if (pData) {
        const profit = pData.cashOut - pData.buyIn;
        runningTotal += profit;
        stats.push({
          date: new Date(s.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          profit: profit,
          cumulative: runningTotal
        });
      }
    });

    setHistory(stats);
  }, [player, allSessions]);

  const rank = getPlayerRank(player.totalProfit);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };

  const handleAvatarSelect = (emoji: string) => {
    onUpdateAvatar(player.name, emoji);
    setShowAvatarSelector(false);
  };

  return (
    <div className="p-4 animate-fade-in pb-20">
      {/* Header */}
      <button onClick={onBack} className="flex items-center text-slate-600 dark:text-gray-400 mb-4 hover:text-blue-500 font-medium">
        <ArrowLeft size={20} className="mr-1" /> Quay lại
      </button>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg mb-6 text-center relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${player.totalProfit >= 0 ? 'from-green-400 to-blue-500' : 'from-red-400 to-orange-500'}`}></div>
        
        <div className="relative inline-block mb-3">
            <div 
              onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-6xl shadow-inner cursor-pointer hover:scale-105 transition-transform border-4 border-white dark:border-slate-600"
            >
              {player.avatar || rank.icon}
            </div>
            <button 
                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full shadow-lg"
            >
                <Edit size={14} />
            </button>
        </div>

        {showAvatarSelector && (
            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-xl mb-4 border border-gray-300 dark:border-slate-600 animate-fade-in">
                <p className="text-xs text-slate-500 dark:text-gray-500 mb-2">Chọn Avatar:</p>
                <div className="grid grid-cols-8 gap-2">
                    {AVATARS.map(a => (
                        <button key={a} onClick={() => handleAvatarSelect(a)} className="text-xl hover:bg-slate-200 dark:hover:bg-slate-700 rounded p-1">
                            {a}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{player.name}</h1>
        <div className={`text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-1 ${rank.color}`}>
           {rank.icon} {rank.name}
        </div>
        
        <div className="mt-6 flex justify-center">
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl w-full max-w-xs border border-gray-100 dark:border-slate-700">
                <div className="text-slate-500 dark:text-gray-500 text-xs uppercase font-bold mb-1">Tổng Lợi nhuận</div>
                <div className={`text-3xl font-bold ${player.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(player.totalProfit)}
                </div>
            </div>
        </div>
      </div>

      {/* Chart */}
      {history.length > 1 && (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6">
        <h3 className="text-slate-500 dark:text-gray-400 text-xs uppercase font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={14} /> Biểu đồ Lịch sử Thắng/Thua
        </h3>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                    <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={player.totalProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={player.totalProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} stroke="#9ca3af" tickLine={false} axisLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc', borderRadius: '8px' }}
                        formatter={(value: number) => [formatCurrency(value), "Lãi/Lỗ tích lũy"]}
                        labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke={player.totalProfit >= 0 ? "#10b981" : "#ef4444"} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* History List */}
      <h3 className="text-slate-900 dark:text-white font-bold mb-3 flex items-center gap-2">
         <Calendar size={18} className="text-blue-500" /> Chi tiết từng ngày
      </h3>
      <div className="space-y-3">
        {history.slice().reverse().map((h, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                <span className="text-slate-600 dark:text-gray-400 text-sm font-medium">{h.date}</span>
                <span className={`font-mono font-bold ${h.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {h.profit > 0 ? '+' : ''}{formatCurrency(h.profit)}
                </span>
            </div>
        ))}
      </div>
    </div>
  );
};