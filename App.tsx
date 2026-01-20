import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';
import { Plus, LayoutDashboard, History, Users, Trash2, Edit, TrendingUp, Loader2, Moon, Sun, ChevronRight, Activity, Calendar, Filter, PieChart as PieChartIcon, LineChart } from 'lucide-react';
import { PokerSession, ViewState, Period, PlayerStat } from './types';
import * as Storage from './services/storage';
import { SessionForm } from './components/SessionForm';
import { CloudSync } from './components/CloudSync';
import { StatsCard } from './components/StatsCard';
import { PlayerDetail } from './components/PlayerDetail';
import { getPlayerRank } from './utils/gameUtils';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<PokerSession[]>([]);
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Date filter states
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  // Dashboard Chart Mode
  const [chartMode, setChartMode] = useState<'profit' | 'winrate'>('profit');

  const [editingSession, setEditingSession] = useState<PokerSession | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({});

  // Init Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Load avatars
    const savedAvatars = localStorage.getItem('player_avatars');
    if (savedAvatars) setPlayerAvatars(JSON.parse(savedAvatars));

    // Set default custom dates to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setCustomStart(firstDay);
    setCustomEnd(lastDay);

    loadData();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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

  const handleUpdateAvatar = (name: string, avatar: string) => {
      const newAvatars = { ...playerAvatars, [name]: avatar };
      setPlayerAvatars(newAvatars);
      localStorage.setItem('player_avatars', JSON.stringify(newAvatars));
  };

  // Filter Sessions
  const filteredSessions = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    return sessions.filter(s => {
      const d = new Date(s.date);
      
      if (period === 'all') return true;
      if (period === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        oneWeekAgo.setHours(0,0,0,0);
        return d >= oneWeekAgo && d <= now;
      }
      if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (period === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      if (period === 'custom') {
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart);
        start.setHours(0,0,0,0);
        const end = new Date(customEnd);
        end.setHours(23,59,59,999);
        return d >= start && d <= end;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, period, customStart, customEnd]);

  // --- CHART DATA CALCULATIONS ---

  // 1. Profit Trend (Cumulative)
  const profitTrendData = useMemo(() => {
    // Sort chronological for cumulative calc
    const sorted = [...filteredSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningTotal = 0;
    
    // Group by date to handle multiple sessions in one day
    const map = new Map<string, number>();
    
    sorted.forEach(s => {
        const dateStr = new Date(s.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        // Calculate session profit (Sum of players cashout - buyin is actually 0 for the house, 
        // BUT usually this app tracks specific user. 
        // Since this is a ledger for a group, "Profit" here is ambiguous. 
        // ASSUMPTION: Based on request, we are tracking "Volume" or "Pot Size" as positive?
        // OR: Are we tracking a specific Hero? 
        // OBSERVATION: The app tracks a group ledger (PlayerEntry[]). 
        // TO MAKE THIS USEFUL: Let's track the "Big Winner's Profit" or "Total Pot".
        // HOWEVER, traditionally Bankroll apps track "My" profit. 
        // Since there is no "Me" user selected, let's chart TOTAL VOLUME (Pot Size) for Trend 
        // OR Let's chart the 'Banker' profit if any? 
        // RE-EVALUATION: The user asked for "Poker Bankroll". Usually implies personal. 
        // But the data structure `players` implies a ledger.
        // Let's visualize TOTAL BUY-IN (Volume) growth for the group, or let's visualize the "Rake" if applicable.
        // ACTUALLY: Let's go with Total Buy-in Volume for the cumulative graph as a proxy for "Action".
        // MODIFICATION: Let's assume the user wants to see the "Action" trend.
        // BETTER YET: Let's graph the top winner's profit of that session to show "Potential".
        
        // Revised Strategy: Since it's a ledger, let's show Total Volume (Action) over time.
        const vol = s.players.reduce((sum, p) => sum + (p.buyIn || 0), 0);
        
        if (map.has(dateStr)) {
            map.set(dateStr, map.get(dateStr)! + vol);
        } else {
            map.set(dateStr, vol);
        }
    });

    // Convert map to cumulative array
    const result: any[] = [];
    let cumulative = 0;
    Array.from(map.entries()).forEach(([date, vol]) => {
        cumulative += vol;
        result.push({ date, profit: vol, cumulative });
    });
    return result;
  }, [filteredSessions]);

  // 2. Win/Loss Distribution (Based on players in the session - General Stats)
  // Since this is a ledger, let's show: Sessions with Big Pots vs Small Pots OR
  // Let's try to interpret "Profit" as the diff between Cashout and Buyin (should be 0).
  // Let's pivot: The user asked for "Lãi/Lỗ". 
  // If this is a Host managing the game, Lãi/Lỗ might be Rake (not implemented).
  // If this is a Player tracking their game, they would enter themselves in every session.
  // CRITICAL FIX: Since we don't know who "Hero" is, let's calculate the 'Winner Count' vs 'Loser Count' across all sessions.
  const winLossData = useMemo(() => {
    let winners = 0;
    let losers = 0;
    let breakeven = 0;

    filteredSessions.forEach(s => {
        s.players.forEach(p => {
            const diff = p.cashOut - p.buyIn;
            if (diff > 0) winners++;
            else if (diff < 0) losers++;
            else breakeven++;
        });
    });

    return [
        { name: 'Thắng', value: winners, color: '#22c55e' }, // green-500
        { name: 'Thua', value: losers, color: '#ef4444' },   // red-500
        { name: 'Hòa', value: breakeven, color: '#94a3b8' }  // slate-400
    ].filter(i => i.value > 0);
  }, [filteredSessions]);

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
          lastPlayed: session.date,
          avatar: playerAvatars[name]
        };

        current.totalProfit += (p.cashOut - p.buyIn);
        current.totalBuyIn += p.buyIn;
        current.totalCashOut += p.cashOut;
        current.sessionsPlayed += 1;
        
        if (new Date(session.date) > new Date(current.lastPlayed)) {
           current.lastPlayed = session.date;
        }
        current.avatar = playerAvatars[name];

        statsMap.set(name, current);
      });
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filteredSessions, playerAvatars]);

  const totalVolume = useMemo(() => {
     return filteredSessions.reduce((sum, s) => sum + s.players.reduce((pSum, p) => pSum + p.buyIn, 0), 0);
  }, [filteredSessions]);
  
  const totalHours = useMemo(() => {
      return filteredSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;
  }, [filteredSessions]);

  // Since we don't have a single "Hero", Average Hourly Volume might be a better metric for the dashboard
  const hourlyVolume = totalHours > 0 ? totalVolume / totalHours : 0;

  const formatShortCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val.toString();
  };

  const PeriodButton = ({ p, label }: { p: Period, label: string }) => (
    <button 
        onClick={() => setPeriod(p)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            period === p 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
        }`}
    >
        {label}
    </button>
  );

  const CustomDateInput = () => (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 animate-fade-in flex items-center gap-3 shadow-sm">
        <div className="flex-1">
            <label className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-bold block mb-1">Từ ngày</label>
            <div className="relative">
                <input 
                    type="date" 
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:border-blue-500 outline-none"
                />
            </div>
        </div>
        <div className="flex-1">
            <label className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-bold block mb-1">Đến ngày</label>
            <div className="relative">
                <input 
                    type="date" 
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:border-blue-500 outline-none"
                />
            </div>
        </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-4 space-y-5 pb-24 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-blue-500" size={24} /> Tổng Quan
        </h1>
        <button onClick={toggleTheme} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <PeriodButton p="all" label="Tất cả" />
            <PeriodButton p="week" label="Tuần này" />
            <PeriodButton p="month" label="Tháng này" />
            <PeriodButton p="year" label="Năm này" />
            <PeriodButton p="custom" label="Tùy chỉnh" />
          </div>
          {period === 'custom' && <CustomDateInput />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatsCard title="Tổng Volume" value={formatShortCurrency(totalVolume)} />
        <StatsCard title="Volume / Giờ" value={formatShortCurrency(hourlyVolume)} color="border-blue-500/30" />
      </div>

      {/* --- NEW CHARTS SECTION --- */}
      {filteredSessions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
             {/* Chart Toggle Header */}
             <div className="flex border-b border-gray-100 dark:border-slate-700">
                <button 
                    onClick={() => setChartMode('profit')}
                    className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${chartMode === 'profit' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500 dark:text-gray-400'}`}
                >
                    <LineChart size={14} /> Dòng Tiền (Volume)
                </button>
                <div className="w-[1px] bg-gray-100 dark:bg-slate-700"></div>
                <button 
                    onClick={() => setChartMode('winrate')}
                    className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${chartMode === 'winrate' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-slate-500 dark:text-gray-400'}`}
                >
                    <PieChartIcon size={14} /> Tỉ lệ Thắng/Thua
                </button>
             </div>

             {/* Chart Body */}
             <div className="p-4 h-64">
                {chartMode === 'profit' ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={profitTrendData}>
                            <defs>
                                <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#e2e8f0'} />
                            <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 10, fill: theme === 'dark' ? '#9ca3af' : '#64748b'}} 
                                stroke={theme === 'dark' ? '#4b5563' : '#cbd5e1'}
                                tickLine={false} 
                                axisLine={false} 
                                minTickGap={20}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value: number) => [new Intl.NumberFormat('vi-VN').format(value), "Volume tích lũy"]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="cumulative" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorCum)" 
                                animationDuration={1000}
                            />
                        </AreaChart>
                     </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={winLossData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {winLossData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle"
                                formatter={(value, entry: any) => <span className="text-slate-600 dark:text-gray-300 text-xs font-bold ml-1">{value} ({entry.payload.value})</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
             </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-yellow-500" /> Bảng Xếp Hạng
          </h3>
          <span className="text-xs text-slate-600 dark:text-gray-400 font-medium bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">Top 10</span>
        </div>
        
        {playerStats.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-gray-500 py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl">Chưa có dữ liệu</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {playerStats.slice(0, 10).map((stat, idx) => {
                const rank = getPlayerRank(stat.totalProfit);
                return (
                    <div 
                        key={stat.name} 
                        className="flex justify-between py-2.5 px-3 items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                        onClick={() => { setSelectedPlayer(stat); setView(ViewState.PLAYER_DETAIL); }}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-mono font-bold w-4 text-center ${idx < 3 ? 'text-yellow-500' : 'text-slate-400 dark:text-gray-500'}`}>
                                {idx + 1}
                            </span>
                            
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-sm border border-slate-200 dark:border-slate-500">
                                {stat.avatar || rank.icon}
                            </div>
                            
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[100px]">{stat.name}</span>
                            </div>
                        </div>
                        
                        <div className={`font-bold font-mono text-xs ${stat.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {stat.totalProfit > 0 ? '+' : ''}{formatShortCurrency(stat.totalProfit)}
                        </div>
                    </div>
              )})}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div className="p-4 pb-24 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="text-blue-500" /> Tất cả người chơi
        </h1>
      </div>

      <div className="space-y-2 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <PeriodButton p="all" label="Tất cả" />
            <PeriodButton p="week" label="Tuần này" />
            <PeriodButton p="month" label="Tháng này" />
            <PeriodButton p="year" label="Năm này" />
            <PeriodButton p="custom" label="Tùy chỉnh" />
          </div>
          {period === 'custom' && <CustomDateInput />}
      </div>

      {playerStats.length === 0 ? (
        <div className="text-center text-slate-500 dark:text-gray-500 mt-20">Chưa có dữ liệu người chơi.</div>
      ) : (
        <div className="space-y-3">
          {playerStats.map((p, idx) => {
            const rank = getPlayerRank(p.totalProfit);
            return (
            <div 
                key={p.name} 
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => { setSelectedPlayer(p); setView(ViewState.PLAYER_DETAIL); }}
            >
              <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-gray-400">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-lg border-2 border-slate-200 dark:border-slate-600">
                        {p.avatar || rank.icon}
                    </div>
                    <div>
                        <div className="font-bold text-lg text-slate-900 dark:text-white leading-none">{p.name}</div>
                        <span className={`text-xs font-bold uppercase ${rank.color}`}>{rank.name}</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className={`font-bold text-lg ${p.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatShortCurrency(p.totalProfit)}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 dark:text-gray-600" />
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                 <div className="bg-gray-50 dark:bg-slate-900/50 p-2.5 rounded-lg text-center border border-gray-100 dark:border-slate-700/50">
                    <div className="text-slate-500 dark:text-gray-500 text-xs mb-1 font-medium">TB Buy-in</div>
                    <div className="text-blue-600 dark:text-blue-300 font-bold">{formatShortCurrency(p.totalBuyIn / p.sessionsPlayed)}</div>
                 </div>
                 <div className="bg-gray-50 dark:bg-slate-900/50 p-2.5 rounded-lg text-center border border-gray-100 dark:border-slate-700/50">
                    <div className="text-slate-500 dark:text-gray-500 text-xs mb-1 font-medium">TB Cash-out</div>
                    <div className="text-green-600 dark:text-green-300 font-bold">{formatShortCurrency(p.totalCashOut / p.sessionsPlayed)}</div>
                 </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 pb-24 animate-fade-in">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Lịch Sử Ván Đấu</h1>
      {sessions.length === 0 ? (
        <div className="text-center text-slate-500 dark:text-gray-500 mt-20 flex flex-col items-center">
          <History size={48} className="mb-4 opacity-20" />
          <p>Chưa có dữ liệu ván đấu.</p>
          <button onClick={() => setView(ViewState.ADD_SESSION)} className="mt-4 text-blue-500 font-bold">Thêm ngay</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const totalBuyIn = session.players.reduce((sum, p) => sum + p.buyIn, 0);
            const winner = [...session.players].sort((a, b) => (b.cashOut - b.buyIn) - (a.cashOut - a.buyIn))[0];
            const maxProfit = winner ? winner.cashOut - winner.buyIn : 0;

            return (
              <div key={session.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg text-slate-900 dark:text-white">{session.location}</div>
                    <div className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                      <span>{new Date(session.date).toLocaleDateString('vi-VN')}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>{session.players.length} người</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleEditSession(session)} className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg text-blue-500 transition-colors border border-gray-200 dark:border-slate-600"><Edit size={16} /></button>
                     <button onClick={() => handleDeleteSession(session.id)} className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg text-red-500 transition-colors border border-gray-200 dark:border-slate-600"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-slate-900/30">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-slate-500 dark:text-gray-500 uppercase font-bold">Tổng Pot</span>
                     <span className="text-slate-900 dark:text-white font-mono">{formatShortCurrency(totalBuyIn)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-slate-500 dark:text-gray-500 uppercase font-bold">Big Winner</span>
                     <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700 dark:text-gray-300 font-medium">{winner?.name}</span>
                        <span className="text-green-600 dark:text-green-400 font-mono font-bold">+{formatShortCurrency(maxProfit)}</span>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative transition-colors duration-300">
      
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      )}

      <div className="h-screen overflow-y-auto scroll-smooth">
        {view === ViewState.DASHBOARD && renderDashboard()}
        {view === ViewState.PLAYERS && renderPlayers()}
        {view === ViewState.PLAYER_DETAIL && selectedPlayer && (
            <PlayerDetail 
                player={selectedPlayer} 
                allSessions={sessions} 
                onBack={() => setView(ViewState.PLAYERS)} 
                onUpdateAvatar={handleUpdateAvatar}
            />
        )}
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

      {(view !== ViewState.ADD_SESSION && view !== ViewState.PLAYER_DETAIL) && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 p-2 flex justify-between items-center z-50 transition-colors shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setView(ViewState.DASHBOARD)} 
            className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${view === ViewState.DASHBOARD ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'}`}
          >
            <LayoutDashboard size={24} strokeWidth={view === ViewState.DASHBOARD ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">Tổng quan</span>
          </button>

          <button 
            onClick={() => setView(ViewState.PLAYERS)} 
            className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${view === ViewState.PLAYERS ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'}`}
          >
            <Users size={24} strokeWidth={view === ViewState.PLAYERS ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">Người chơi</span>
          </button>
          
          <button 
            onClick={() => {
              setEditingSession(undefined);
              setView(ViewState.ADD_SESSION);
            }}
            className="flex flex-col items-center justify-center w-12 h-12 bg-blue-600 rounded-full shadow-lg shadow-blue-500/40 text-white -mt-5 border-4 border-slate-50 dark:border-slate-900 active:scale-95 transition-all mx-2"
          >
            <Plus size={28} strokeWidth={3} />
          </button>

          <button 
            onClick={() => setView(ViewState.HISTORY)} 
            className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${view === ViewState.HISTORY ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'}`}
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