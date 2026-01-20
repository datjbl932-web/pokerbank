import React, { useState, useEffect, useRef } from 'react';
import { PokerSession, PlayerEntry } from '../types';
import { Plus, Trash2, UserPlus, Save, X, Calendar, Clock, MapPin } from 'lucide-react';
import { getUniquePlayerNames } from '../services/storage';

interface SessionFormProps {
  onSave: (session: PokerSession) => void;
  onCancel: () => void;
  initialData?: PokerSession;
}

export const SessionForm: React.FC<SessionFormProps> = ({ onSave, onCancel, initialData }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState<string>('');
  const [notes, setNotes] = useState('');
  const playerListRef = useRef<HTMLDivElement>(null);
  
  // Players State
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { name: '', buyIn: 0, cashOut: 0 }
  ]);

  const [availableNames, setAvailableNames] = useState<string[]>([]);

  useEffect(() => {
    // Load player names async
    getUniquePlayerNames().then(names => setAvailableNames(names));
    
    if (initialData) {
      setDate(initialData.date.split('T')[0]);
      setLocation(initialData.location);
      setDuration(initialData.durationMinutes.toString());
      setNotes(initialData.notes || '');
      setPlayers(initialData.players.length > 0 ? initialData.players : [{ name: '', buyIn: 0, cashOut: 0 }]);
    }
  }, [initialData]);

  const handleAddPlayer = () => {
    setPlayers([...players, { name: '', buyIn: 0, cashOut: 0 }]);
    // Scroll to bottom after adding
    setTimeout(() => {
        if (playerListRef.current) {
            playerListRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, 100);
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length === 1) {
        // Clear instead of remove if only 1
        setPlayers([{ name: '', buyIn: 0, cashOut: 0 }]);
        return;
    }
    const newPlayers = [...players];
    newPlayers.splice(index, 1);
    setPlayers(newPlayers);
  };

  const updatePlayer = (index: number, field: keyof PlayerEntry, value: string | number) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty rows
    const validPlayers = players.filter(p => p.name.trim() !== '');
    if (validPlayers.length === 0) {
      alert("Vui lòng nhập ít nhất một người chơi.");
      return;
    }

    const newSession: PokerSession = {
      id: initialData ? initialData.id : Date.now().toString(),
      date: new Date(date).toISOString(),
      location: location || 'Home Game',
      durationMinutes: parseInt(duration) || 0,
      notes,
      players: validPlayers
    };
    onSave(newSession);
  };

  // Calculations
  const totalBuyIn = players.reduce((sum, p) => sum + Number(p.buyIn || 0), 0);
  const totalCashOut = players.reduce((sum, p) => sum + Number(p.cashOut || 0), 0);
  const diff = totalCashOut - totalBuyIn;

  return (
    <div className="p-4 animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 py-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{initialData ? 'Sửa Ván Đấu' : 'Thêm Ván Mới'}</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${Math.abs(diff) < 1000 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
          Lệch: {diff.toLocaleString('vi-VN')}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* General Info */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">
                <Calendar size={14} /> Ngày chơi
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">
                <Clock size={14} /> Phút
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="120"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">
                <MapPin size={14} /> Địa điểm
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Nhà Tuấn, Casino..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-4" ref={playerListRef}>
          <div className="flex justify-between items-center px-1">
            <label className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus size={20} className="text-blue-600 dark:text-blue-500"/> Người chơi ({players.length})
            </label>
            <button
              type="button"
              onClick={handleAddPlayer}
              className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition active:scale-95 border border-blue-200 dark:border-blue-800"
            >
              <Plus size={14} strokeWidth={3} /> Thêm
            </button>
          </div>

          <datalist id="player-names">
            {availableNames.map(name => <option key={name} value={name} />)}
          </datalist>

          {players.map((player, index) => {
            const pProfit = (Number(player.cashOut) || 0) - (Number(player.buyIn) || 0);
            return (
              <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 relative group animate-fade-in shadow-sm transition-colors hover:border-blue-300 dark:hover:border-slate-600">
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      list="player-names"
                      placeholder={`Người chơi ${index + 1}`}
                      value={player.name}
                      onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-bold placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemovePlayer(index)}
                    className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 ml-1">Buy-in</div>
                    <input
                      type="number"
                      placeholder="0"
                      value={player.buyIn || ''}
                      onChange={(e) => updatePlayer(index, 'buyIn', parseFloat(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-red-600 dark:text-red-400 font-mono font-semibold focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 ml-1">Cash-out</div>
                    <input
                      type="number"
                      placeholder="0"
                      value={player.cashOut || ''}
                      onChange={(e) => updatePlayer(index, 'cashOut', parseFloat(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 text-green-600 dark:text-green-400 font-mono font-semibold focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">Kết quả</div>
                    <div className={`font-bold font-mono text-lg ${pProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pProfit > 0 ? '+' : ''}{pProfit.toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 transition-colors space-y-2">
           <div className="flex justify-between text-sm text-slate-600 dark:text-gray-400">
              <span>Tổng Buy-in:</span>
              <span className="text-slate-900 dark:text-white font-mono font-medium">{totalBuyIn.toLocaleString('vi-VN')}</span>
           </div>
           <div className="flex justify-between text-sm text-slate-600 dark:text-gray-400">
              <span>Tổng Cash-out:</span>
              <span className="text-slate-900 dark:text-white font-mono font-medium">{totalCashOut.toLocaleString('vi-VN')}</span>
           </div>
           
           <div className="border-t border-gray-200 dark:border-slate-700 my-2 pt-2">
             <div className="flex justify-between text-sm font-bold">
               <span className="text-slate-700 dark:text-gray-300">Chênh lệch:</span>
               <span className={`${Math.abs(diff) === 0 ? 'text-green-500' : 'text-yellow-600 dark:text-yellow-500'}`}>
                 {diff.toLocaleString('vi-VN')}
               </span>
             </div>
           </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} /> Hủy
          </button>
          <button
            type="submit"
            className="flex-1 py-3.5 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <Save size={18} /> Lưu Lại
          </button>
        </div>
      </form>
    </div>
  );
};