import React, { useState, useEffect } from 'react';
import { PokerSession, PlayerEntry } from '../types';
import { Plus, Trash2, UserPlus } from 'lucide-react';
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
  };

  const handleRemovePlayer = (index: number) => {
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{initialData ? 'Sửa Ván Đấu' : 'Thêm Ván Mới'}</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${Math.abs(diff) < 1000 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
          Lệch: {diff.toLocaleString('vi-VN')}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* General Info */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ngày chơi</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Thời lượng (phút)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="120"
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Địa điểm</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Nhà Tuấn, Casino..."
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus size={20} className="text-blue-500"/> Danh sách người chơi
            </label>
            <button
              type="button"
              onClick={handleAddPlayer}
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <Plus size={16} /> Thêm người
            </button>
          </div>

          <datalist id="player-names">
            {availableNames.map(name => <option key={name} value={name} />)}
          </datalist>

          {players.map((player, index) => {
            const pProfit = (Number(player.cashOut) || 0) - (Number(player.buyIn) || 0);
            return (
              <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 relative group animate-fade-in shadow-sm transition-colors">
                <div className="flex gap-3 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      list="player-names"
                      placeholder="Tên người chơi"
                      value={player.name}
                      onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-slate-900 dark:text-white font-bold placeholder-gray-400 dark:placeholder-gray-600 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemovePlayer(index)}
                    className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Buy-in</div>
                    <input
                      type="number"
                      placeholder="0"
                      value={player.buyIn || ''}
                      onChange={(e) => updatePlayer(index, 'buyIn', parseFloat(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-red-600 dark:text-red-300 font-mono text-right focus:border-red-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Cash-out</div>
                    <input
                      type="number"
                      placeholder="0"
                      value={player.cashOut || ''}
                      onChange={(e) => updatePlayer(index, 'cashOut', parseFloat(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-green-600 dark:text-green-300 font-mono text-right focus:border-green-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Thắng/Thua</div>
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
        <div className="bg-slate-100 dark:bg-slate-900/90 p-4 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
           <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
              <span>Tổng Buy-in:</span>
              <span className="text-slate-900 dark:text-white font-medium">{totalBuyIn.toLocaleString('vi-VN')}</span>
           </div>
           <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Tổng Cash-out:</span>
              <span className="text-slate-900 dark:text-white font-medium">{totalCashOut.toLocaleString('vi-VN')}</span>
           </div>
           {Math.abs(diff) > 0 && (
             <div className="flex justify-between text-sm font-bold text-yellow-600 dark:text-yellow-500">
               <span>Chênh lệch (Rake/Lỗi):</span>
               <span>{diff.toLocaleString('vi-VN')}</span>
             </div>
           )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
          >
            Lưu Kết Quả
          </button>
        </div>
      </form>
    </div>
  );
};