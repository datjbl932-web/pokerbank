import { GoogleGenAI } from "@google/genai";
import { PokerSession, StatsSummary } from '../types';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzePerformance = async (
  query: string, 
  sessions: PokerSession[], 
  stats: StatsSummary
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Prepare a lightweight context from recent sessions
    // Adjusted to calculate total volume since PokerSession contains multiple players
    const recentSessions = sessions.slice(0, 10).map(s => {
      const totalBuyIn = s.players.reduce((sum, p) => sum + (p.buyIn || 0), 0);
      return {
        date: s.date.split('T')[0],
        totalVolume: totalBuyIn,
        duration: s.durationMinutes,
        location: s.location,
        playerCount: s.players.length
      };
    });

    const context = `
      Bạn là một huấn luyện viên Poker chuyên nghiệp và nhà phân tích dữ liệu.
      Dưới đây là thống kê tổng hợp:
      - Tổng lãi/lỗ: ${stats.totalProfit.toLocaleString('vi-VN')} VND
      - Hourly Rate (Lương/giờ): ${stats.hourlyRate.toLocaleString('vi-VN')} VND
      - Số session: ${stats.totalSessions}
      - Tỉ lệ thắng: ${stats.winRate}%
      
      10 session gần nhất (thông tin chung về bàn chơi):
      ${JSON.stringify(recentSessions, null, 2)}
      
      Người dùng hỏi: "${query}"
      
      Hãy trả lời ngắn gọn, súc tích bằng tiếng Việt, tập trung vào số liệu để đưa ra lời khuyên.
      Nếu kết quả không tốt, hãy động viên và nhắc về quản lý bankroll (BRM).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context,
    });

    return response.text || "Xin lỗi, tôi không thể phân tích lúc này.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Đang có lỗi kết nối với AI Coach. Vui lòng thử lại sau.";
  }
};