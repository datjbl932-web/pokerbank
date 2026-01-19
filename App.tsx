import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';
import { Plus, LayoutDashboard, History, Users, Trash2, Edit, TrendingUp, Loader2 } from 'lucide-react';
import { PokerSession, ViewState, Period, PlayerStat } from './types';
import * as Storage from './services/storage';
import { SessionForm } from './components/SessionForm';
import { AiCoach } from './components/AiCoach';
import { CloudSync } from './components/CloudSync';
import { StatsCard } from './components/StatsCard';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<PokerSession[]>([]);
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [period, setPeriod] = useState<Period>('all');
  const [editingSession, setEditingSession] = useState<PokerSession | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Function to reload data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await Storage.loadSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSession = async (session: PokerSession) => {
    setIsLoading(true);
    try {
      if (editingSession) {
        const updated = await Storage.updateSessionData(session);
        setSessions(updated);
      } else {
        const updated = await Storage.addSession(session);
        setSessions(updated);
      }
      setEditingSession(undefined);
      setView(ViewState.HISTORY);
    } catch (error) {
      alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra kết nối.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa ván đấu này không? Dữ liệu không thể phục hồi.')) {
      setIsLoading(true);
      try {
        const updated = await Storage.removeSession(id);
        setSessions(updated);
      } catch (e) {
        alert("Lỗi khi xóa dữ liệu.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditSession = (session: PokerSession) => {
    setEditingSession(session);
    setView(ViewState.ADD_SESSION);
  };

  // Filter Sessions based on Period
  const filteredSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter(s => {
      const d = new Date(s.date);
      if (period === 'all') return true;
      if (period === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= oneWeekAgo;
      }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
  }, [sessions, period]);

  // Aggregate Player Stats
  const playerStats: PlayerStat[] = useMemo(() => {
    const statsMap = new Map<string, PlayerStat>();

    filteredSessions.forEach(session => {
      session.players.forEach(p => {
        const name = p.name.trim();
        if (!name) return;

        const current = statsMap.get(name) || {
          name,
          totalProfit: 0,
          totalBuyIn: 0,
          totalCashOut: 0,
          sessionsPlayed: 0,
          lastPlayed: session.date
        };

        current.totalProfit += (p.cashOut - p.buyIn);
        current.totalBuyIn += p.buyIn;
        current.totalCashOut += p.cashOut;
        current.sessionsPlayed += 1;
        // Keep the most recent date
        if (new Date(session.date) > new Date(current.lastPlayed)) {
           current.lastPlayed = session.date;
        }

        statsMap.set(name, current);
      });
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filteredSessions]);

  const totalVolume = useMemo(() => {
     return filteredSessions.reduce((sum, s) => sum + s.players.reduce((pSum, p) => pSum + p.buyIn, 0), 0);
  }, [filteredSessions]);

  const statsSummary = useMemo(() => {
    // Basic stats for user context (assuming user is tracking for house/group)
    const totalProfit = 0; // In a ledger app, sum is usually 0 (minus rake).
    // Let's calculate total Rake/Diff instead? Or maybe just Volume.
    // For now, we pass basic info to AI.
    return {
      totalProfit: totalVolume, // Just sending volume as 'profit' placeholder for structure
      hourlyRate: 0,
      totalSessions: filteredSessions.length,
      winRate: 0
    };
  }, [filteredSessions, totalVolume]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };

  const formatShortCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val.toString();
  };

  const renderDashboard = () => (
    <div className="p-4 space-y-6 pb-24 animate-fade-in">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-blue-500" /> Tổng Quan
        </h1>
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none font-medium"
        >
          <option value="all">Tất cả</option>
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="year">Năm này</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard title="Tổng Ván Đấu" value={filteredSessions.length.toString()} />
        <StatsCard title="Tổng Volume" value={formatShortCurrency(totalVolume)} color="border-blue-500/30" />
      </div>

      {/* Leaderboard Chart */}
      {playerStats.length > 0 && (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-64 flex flex-col">
          <h3 className="text-gray-400 text-xs uppercase mb-2 font-bold shrink-0">Top 5 Người Chơi (Lãi/Lỗ)</h3>
          <div className="flex-1 min-h-0">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={playerStats.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#334155', opacity: 0.2}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="totalProfit" radius={[0, 4, 4, 0]} barSize={20}>
                  {playerStats.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.totalProfit >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-white">Top Dẫn Đầu</h3>
          <button onClick={() => setView(ViewState.PLAYERS)} className="text-sm text-blue-400">Xem tất cả</button>
        </div>
        {playerStats.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-slate-800/50 rounded-xl">Chưa có dữ liệu cho giai đoạn này</div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="divide-y divide-slate-700">
              {playerStats.slice(0, 5).map((stat, idx) => (
                <div key={stat.name} className="flex justify-between p-3 items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-500 text-sm w-4 text-center">{idx + 1}</span>
                    <span className="font-medium text-white truncate">{stat.name}</span>
                  </div>
                  <div className={`font-bold font-mono text-sm ${stat.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.totalProfit > 0 ? '+' : ''}{formatShortCurrency(stat.totalProfit)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mt-4">
        <AiCoach sessions={sessions} stats={statsSummary} />
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div className="p-4 pb-24 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-blue-500" /> Thống Kê Chi Tiết
        </h1>
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none font-medium"
        >
          <option value="all">Tất cả</option>
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="year">Năm này</option>
        </select>
      </div>

      {playerStats.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">Chưa có dữ liệu người chơi.</div>
      ) : (
        <div className="space-y-3">
          {playerStats.map((p, idx) => (
            <div key={p.name} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-400">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-lg text-white">{p.name}</span>
                 </div>
                 <div className={`font-bold text-lg ${p.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatShortCurrency(p.totalProfit)}
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                 <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">Số ván</div>
                    <div className="text-white font-medium">{p.sessionsPlayed}</div>
                 </div>
                 <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">TB Buy-in</div>
                    <div className="text-blue-200 font-medium">{formatShortCurrency(p.totalBuyIn / p.sessionsPlayed)}</div>
                 </div>
                 <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">TB Cash-out</div>
                    <div className="text-green-200 font-medium">{formatShortCurrency(p.totalCashOut / p.sessionsPlayed)}</div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">Lịch Sử Ván Đấu</h1>
      {sessions.length === 0 ? (
        <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
          <History size={48} className="mb-4 opacity-20" />
          <p>Chưa có dữ liệu ván đấu.</p>
          <button onClick={() => setView(ViewState.ADD_SESSION)} className="mt-4 text-blue-400 font-bold">Thêm ngay</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const totalBuyIn = session.players.reduce((sum, p) => sum + p.buyIn, 0);
            const winner = [...session.players].sort((a, b) => (b.cashOut - b.buyIn) - (a.cashOut - a.buyIn))[0];
            const maxProfit = winner ? winner.cashOut - winner.buyIn : 0;

            return (
              <div key={session.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg text-white">{session.location}</div>
                    <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                      <span>{new Date(session.date).toLocaleDateString('vi-VN')}</span>
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      <span>{session.players.length} người</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleEditSession(session)} className="p-2 bg-slate-700/50 rounded-lg text-blue-400 hover:bg-slate-700"><Edit size={16} /></button>
                     <button onClick={() => handleDeleteSession(session.id)} className="p-2 bg-slate-700/50 rounded-lg text-red-400 hover:bg-slate-700"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-900/30">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-gray-500 uppercase font-bold">Tổng Pot</span>
                     <span className="text-white font-mono">{formatShortCurrency(totalBuyIn)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-gray-500 uppercase font-bold">Big Winner</span>
                     <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">{winner?.name}</span>
                        <span className="text-green-400 font-mono font-bold">+{formatShortCurrency(maxProfit)}</span>
                     </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      )}

      {/* Content Area */}
      <div className="h-screen overflow-y-auto">
        {view === ViewState.DASHBOARD && renderDashboard()}
        {view === ViewState.PLAYERS && renderPlayers()}
        {view === ViewState.ADD_SESSION && (
          <SessionForm 
            onSave={handleSaveSession} 
            onCancel={() => {
              setEditingSession(undefined);
              setView(ViewState.DASHBOARD);
            }} 
            initialData={editingSession}
          />
        )}
        {view === ViewState.HISTORY && renderHistory()}
      </div>

      {/* Bottom Navigation */}
      {view !== ViewState.ADD_SESSION && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2 flex justify-between items-center z-50">
          <button 
            onClick={() => setView(ViewState.DASHBOARD)} 
            className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${view === ViewState.DASHBOARD ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutDashboard size={24} strokeWidth={view === ViewState.DASHBOARD ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">Tổng quan</span>
          </button>

          <button 
            onClick={() => setView(ViewState.PLAYERS)} 
            className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${view === ViewState.PLAYERS ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Users size={24} strokeWidth={view === ViewState.PLAYERS ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">Người chơi</span>
          </button>
          
          <button 
            onClick={() => {
              setEditingSession(undefined);
              setView(ViewState.ADD_SESSION);
            }}
            className="flex flex-col items-center justify-center w-12 h-12 bg-blue-600 rounded-full shadow-lg shadow-blue-500/40 text-white -mt-5 border-4 border-slate-900 active:scale-95 transition-transform mx-2"
          >
            <Plus size={28} />
          </button>

          <button 
            onClick={() => setView(ViewState.HISTORY)} 
            className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${view === ViewState.HISTORY ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <History size={24} strokeWidth={view === ViewState.HISTORY ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">Lịch sử</span>
          </button>

          <CloudSync onSyncChange={loadData} />
        </div>
      )}
    </div>
  );
};

export default App;