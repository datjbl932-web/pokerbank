import { PokerSession } from '../types';
import { supabase, TABLE_NAME } from './supabase';

const STORAGE_KEY = 'poker_ledger_data_v2';
const SYNC_KEY_STORAGE = 'poker_sync_user_key';

// Helper to get local data
const getLocalSessions = (): PokerSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from local storage", error);
    return [];
  }
};

// Helper to save local data
const saveLocalSessions = (sessions: PokerSession[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

// --- PUBLIC API ---

// 1. Get current Sync Key (Password)
export const getSyncKey = (): string | null => {
  return localStorage.getItem(SYNC_KEY_STORAGE);
};

// 2. Set Sync Key
export const setSyncKey = (key: string) => {
  if (key) {
    localStorage.setItem(SYNC_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(SYNC_KEY_STORAGE);
  }
};

// 3. Load Sessions (Async)
export const loadSessions = async (): Promise<PokerSession[]> => {
  const syncKey = getSyncKey();

  // Mode 1: Cloud (if Key exists and Supabase is configured)
  if (syncKey && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('data')
        .eq('user_key', syncKey)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map back to PokerSession array
      return data.map((row: any) => row.data) || [];
    } catch (err) {
      console.error("Lỗi tải từ Supabase:", err);
      // Fallback: return empty or notify error? For now return empty to avoid mixing data
      return [];
    }
  }

  // Mode 2: Local Storage
  return getLocalSessions();
};

// 4. Save a new Session
export const addSession = async (session: PokerSession): Promise<PokerSession[]> => {
  const syncKey = getSyncKey();

  if (syncKey && supabase) {
    // Cloud Save
    const { error } = await supabase
      .from(TABLE_NAME)
      .insert([{ 
        user_key: syncKey, 
        session_id: session.id, // Critical for identifying record later
        data: session,
        created_at: new Date().toISOString()
      }]);
    
    if (error) {
      console.error("Lỗi lưu Supabase:", error);
      throw new Error("Không thể lưu lên đám mây.");
    }
    
    return loadSessions();
  } else {
    // Local Save
    const current = getLocalSessions();
    const updated = [session, ...current];
    saveLocalSessions(updated);
    return updated;
  }
};

// 5. Update a Session
export const updateSessionData = async (updatedSession: PokerSession): Promise<PokerSession[]> => {
  const syncKey = getSyncKey();

  if (syncKey && supabase) {
    // Cloud Update strategy: Delete old by session_id and user_key, then Insert new
    
    const { error: delError } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('user_key', syncKey)
        .eq('session_id', updatedSession.id);
        
    if (delError) console.error("Error deleting old session during update", delError);

    const { error: insError } = await supabase
        .from(TABLE_NAME)
        .insert([{
            user_key: syncKey,
            session_id: updatedSession.id,
            data: updatedSession,
            created_at: updatedSession.date
        }]);
        
    if (insError) throw insError;
    
    return loadSessions();

  } else {
    // Local Update
    const current = getLocalSessions();
    const updated = current.map(s => s.id === updatedSession.id ? updatedSession : s);
    saveLocalSessions(updated);
    return updated;
  }
};

// 6. Delete a Session
export const removeSession = async (id: string): Promise<PokerSession[]> => {
  const syncKey = getSyncKey();

  if (syncKey && supabase) {
    // Cloud Delete
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('user_key', syncKey)
        .eq('session_id', id);

    if (error) throw error;
    return loadSessions();
  } else {
    // Local Delete
    const current = getLocalSessions();
    const updated = current.filter(s => s.id !== id);
    saveLocalSessions(updated);
    return updated;
  }
};

// Helper to get unique players (from current memory is fine, or re-fetch)
export const getUniquePlayerNames = async (): Promise<string[]> => {
    const sessions = await loadSessions();
    const names = new Set<string>();
    sessions.forEach(s => s.players.forEach(p => names.add(p.name)));
    return Array.from(names).sort();
};