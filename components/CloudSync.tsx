import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, Check, Loader2, LogOut, Info } from 'lucide-react';
import { getSyncKey, setSyncKey } from '../services/storage';

interface CloudSyncProps {
  onSyncChange: () => void;
}

export const CloudSync: React.FC<CloudSyncProps> = ({ onSyncChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [key, setKey] = useState('');
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = getSyncKey();
    setCurrentKey(saved);
    if (saved) setKey(saved);
  }, [isOpen]);

  const handleConnect = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setSyncKey(key.trim());
    
    setTimeout(() => {
        setCurrentKey(key.trim());
        setLoading(false);
        setIsOpen(false);
        onSyncChange();
    }, 500);
  };

  const handleLogout = () => {
    setSyncKey('');
    setCurrentKey(null);
    setKey('');
    setIsOpen(false);
    onSyncChange();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 sm:pt-0 sm:items-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => setIsOpen(false)}
      />
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm border border-gray-200 dark:border-slate-700 shadow-2xl animate-fade-in overflow-hidden relative z-10 transition-colors">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="text-blue-500" /> Đồng bộ dữ liệu
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-slate-900 dark:hover:text-white p-1">✕</button>
          </div>

          {currentKey ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={32} className="text-green-600 dark:text-green-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-300 mb-1">Đang đồng bộ với mã:</p>
              <p className="text-slate-900 dark:text-white font-mono font-bold text-lg mb-6">{currentKey}</p>
              
              <button 
                onClick={handleLogout}
                className="w-full py-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/80 transition"
              >
                <LogOut size={18} /> Ngắt kết nối
              </button>
            </div>
          ) : (
            <div>
               <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 mb-4 flex gap-3">
                 <Info className="text-blue-500 dark:text-blue-400 shrink-0" size={20} />
                 <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                   Nhập một <strong>Mã bí mật</strong> bất kỳ (VD: ten-nam-sinh). Dùng mã này trên các thiết bị khác để tải dữ liệu của bạn về.
                 </p>
               </div>

               <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Mã bí mật (Secret Key)</label>
               <input 
                  type="text" 
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="VD: tuan-poker-88"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-white mb-4 focus:border-blue-500 outline-none font-mono transition-colors"
                  autoFocus
               />
               
               <button 
                onClick={handleConnect}
                disabled={loading || !key.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {loading ? <Loader2 className="animate-spin" /> : 'Kết nối & Tải dữ liệu'}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};