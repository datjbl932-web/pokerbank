import React, { useState } from 'react';
import { analyzePerformance } from '../services/geminiService';
import { PokerSession, StatsSummary } from '../types';

interface AiCoachProps {
  sessions: PokerSession[];
  stats: StatsSummary;
}

export const AiCoach: React.FC<AiCoachProps> = ({ sessions, stats }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    const result = await analyzePerformance(query, sessions, stats);
    setResponse(result);
    setLoading(false);
  };

  const suggestions = [
    "Đánh giá hiệu suất tuần này của tôi",
    "Làm sao để cải thiện winrate?",
    "Tôi có đang bị tilt không?",
    "Phân tích lối chơi gần đây"
  ];

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          🤖 AI Poker Coach
        </h2>
        <p className="text-gray-400 text-sm">Hỏi Gemini về cách chơi và thống kê của bạn.</p>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        {!response && !loading && (
          <div className="flex flex-col gap-2">
             <p className="text-gray-300 mb-2">Gợi ý câu hỏi:</p>
             {suggestions.map((s, idx) => (
               <button 
                key={idx}
                onClick={() => setQuery(s)}
                className="text-left p-3 bg-slate-700 rounded-lg text-sm text-blue-200 hover:bg-slate-600 transition"
               >
                 {s}
               </button>
             ))}
          </div>
        )}

        {loading && (
           <div className="flex items-center justify-center h-full text-blue-400 animate-pulse">
             Đang phân tích dữ liệu của bạn...
           </div>
        )}

        {response && (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-gray-200 leading-relaxed">
              {response}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hỏi Coach..."
          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
        />
        <button 
          onClick={handleAsk}
          disabled={loading || !query.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-blue-500 transition"
        >
          Gửi
        </button>
      </div>
    </div>
  );
};