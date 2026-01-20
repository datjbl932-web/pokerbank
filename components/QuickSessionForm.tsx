import React, { useState, useEffect } from 'react';
import { PokerSession, PlayerEntry } from '../types';
import { Save, X, Calendar, AlertCircle, ArrowRight } from 'lucide-react';

interface QuickSessionFormProps {
  onSave: (session: PokerSession) => void;
  onCancel: () => void;
}

export const QuickSessionForm: React.FC<QuickSessionFormProps> = ({ onSave, onCancel }) => {
  const [text, setText] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState<PlayerEntry[]>([]);
  const [dateMode, setDateMode] = useState<'today' | 'yesterday'>('today');
  const [location, setLocation] = useState('Home Game');

  // Parse text whenever it changes
  useEffect(() => {
    const lines = text.split('\n');
    const results: PlayerEntry[] = [];

    lines.forEach(line => {
      if (!line.trim()) return;

      // Logic:
      // 1. Normalize multipliers: 2k -> 2000, 1.5m -> 1500000
      // 2. Identify Name (start of string)
      // 3. Identify Number 1 (Buy in)
      // 4. Identify Number 2 (Cash out - based on user logic: +5000 means Cashout is 5000)
      
      const normalizeNumber = (str: string): number => {
         let val = str.toLowerCase().replace(/,/g, '.'); // Handle comma decimal
         let mult = 1;
         if (val.includes('k')) { mult = 1000; val = val.replace('k', ''); }
         if (val.includes('m')) { mult = 1000000; val = val.replace('m', ''); }
         return parseFloat(val) * mult;
      };

      // Regex to capture: Name ... Number ... Number
      // Matches: "Name" followed by anything, then a number (buy), then anything, then a number (cashout)
      // We allow +, -, "buy", "trả" as separators but we mainly care about the 2 numbers.
      const match = line.match(/^(.+?)[^\d\.]+(\d+[kKmM\.,]?\d*)[^\d\.]+(?:[\+\-trảreturnbuy\s]+)?(\d+[kKmM\.,]?\d*)/i);

      if (match) {
        const name = match[1].replace(/(buy|b|mua).*/i, '').trim(); // Clean name if keywords stuck
        const buyIn = normalizeNumber(match[2]);
        const cashOut = normalizeNumber(match[3]);

        if (name && !isNaN(buyIn) && !isNaN(cashOut)) {
            results.push({ name, buyIn, cashOut });
        }
      }
    });

    setParsedPlayers(results);
  }, [text]);

  const handleSave = () => {
    if (parsedPlayers.length === 0) {
        alert("Chưa nhận diện được dữ liệu nào. Vui lòng kiểm tra lại cú pháp.");
        return;
    }

    const sessionDate = new Date();
    if (dateMode === 'yesterday') {
        sessionDate.setDate(sessionDate.getDate() - 1);
    }
    // Set time to end of day to ensure it shows up correctly in sorts
    sessionDate.setHours(23, 0, 0, 0);

    const newSession: PokerSession = {
        id: Date.now().toString(),
        date: sessionDate.toISOString(),
        location: location,
        durationMinutes: 180, // Default 3 hours
        notes: text, // Save original text as note
        players: parsedPlayers
    };

    onSave(newSession);
  };

  const totalBuy = parsedPlayers.reduce((s, p) => s + p.buyIn, 0);
  const totalCash = parsedPlayers.reduce((s, p) => s + p.cashOut, 0);
  const diff = totalCash - totalBuy;

  return (
    <div className="p-4 animate-fade-in pb-20 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nhập Nhanh</h2>
        <button onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
            <X size={20} className="text-slate-500" />
        </button>
      </div>

      {/* Settings: Date & Location */}
      <div className="flex gap-2 mb-4">
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-1">
            <button 
                onClick={() => setDateMode('today')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${dateMode === 'today' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500'}`}
            >
                Hôm nay
            </button>
            <button 
                onClick={() => setDateMode('yesterday')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${dateMode === 'yesterday' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500'}`}
            >
                Hôm qua
            </button>
         </div>
         <input 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Địa điểm"
            className="w-1/3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
        {/* Input Area */}
        <div className="flex flex-col h-full">
            <label className="text-xs font-bold text-slate-500 uppercase mb-2">Nhập ghi chú (Mỗi người 1 dòng)</label>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ví dụ:\nĐạt buy 2000 +5000\nTùng buy 10k trả 15k\nQuắn buy 4000 trả 1000\nTrung buy 5000 -3000`}
                className="flex-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm"
                autoFocus
            />
        </div>

        {/* Preview Area */}
        <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
             <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Xem trước ({parsedPlayers.length})</label>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${Math.abs(diff) === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Lệch: {diff.toLocaleString('vi-VN')}
                </span>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {parsedPlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm text-center">
                        <AlertCircle size={32} className="mb-2 opacity-50" />
                        <p>Chưa có dữ liệu hợp lệ.</p>
                        <p className="text-xs mt-1">Hãy nhập theo mẫu: <br/>"Tên buy [vốn] [kết thúc]"</p>
                    </div>
                ) : (
                    parsedPlayers.map((p, idx) => {
                        const profit = p.cashOut - p.buyIn;
                        return (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm flex justify-between items-center border border-gray-100 dark:border-slate-700">
                                <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-500">{p.buyIn.toLocaleString()}</span>
                                    <ArrowRight size={14} className="text-slate-400" />
                                    <span className="text-green-500">{p.cashOut.toLocaleString()}</span>
                                    <span className={`font-mono font-bold ml-2 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
             </div>
        </div>
      </div>

      <div className="mt-4">
        <button
            onClick={handleSave}
            disabled={parsedPlayers.length === 0}
            className="w-full py-3.5 bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
        >
            <Save size={18} /> Lưu & Cập Nhật
        </button>
      </div>
    </div>
  );
};
