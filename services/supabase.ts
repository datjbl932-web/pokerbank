import { createClient } from '@supabase/supabase-js';

// Các biến môi trường này sẽ được lấy từ cấu hình Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const TABLE_NAME = 'poker_sessions';

export interface CloudSession {
  id: string;
  user_key: string;
  data: any; // Chứa toàn bộ object PokerSession
  created_at?: string;
}