import { PokerSession } from '../types';
import { supabase, TABLE_NAME } from './supabase';

const STORAGE_KEY = 'poker_ledger_data_v2';
const SYNC_KEY_STORAGE = 'poker_sync_user_key';

// --- LOCAL STORAGE HELPERS ---

const getLocalSessions = (): PokerSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from local storage", error);
    return [];
  }
};

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
    localStorage.setItem(SYNC_KEY_STORAGE, key.trim());
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
      // Select data column where user_key matches
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('data')
        .eq('user_key', syncKey)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map back to PokerSession array, ensure data is not null
      const sessions = data?.map((row: any) => row.data) || [];
      
      // Optional: Sync back to local storage for offline backup
      saveLocalSessions(sessions);
      
      return sessions;
    } catch (err) {
      console.error("Lỗi tải từ Supabase:", err);
      // Fallback to local if cloud fails, or return empty? 
      // Current strategy: If cloud fails, try to show local but warn user (UI handles warning via empty list usually)
      return getLocalSessions(); 
    }
  }

  // Mode 2: Local Storage
  return getLocalSessions();
};

// 4. Save a new Session
export const addSession = async (session: PokerSession): Promise<PokerSession[]> => {
  const syncKey = getSyncKey();

  if (syncKey && supabase) {
    // Cloud Save: Use upsert to handle potential duplicates gracefully
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({ 
        user_key: syncKey, 
        session_id: session.id,
        data: session,
        created_at: session.date
      }, { onConflict: 'user_key, session_id' }); // Requires unique constraint on DB side, but basic insert works too if no constraint
    
    if (error) {
      console.error("Lỗi lưu Supabase:", error);
      throw new Error("Không thể lưu lên đám mây. Vui lòng kiểm tra kết nối.");
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
    // Cloud Update: Directly update the row identified by user_key and session_id
    const { error } = await supabase
        .from(TABLE_NAME)
        .update({ 
            data: updatedSession,
            created_at: updatedSession.date // Update timestamp just in case date changed
        })
        .eq('user_key', syncKey)
        .eq('session_id', updatedSession.id);
        
    if (error) {
        console.error("Error updating session", error);
        throw error;
    }
    
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

    if (error) {
        console.error("Error deleting session", error);
        throw error;
    }
    return loadSessions();
  } else {
    // Local Delete
    const current = getLocalSessions();
    const updated = current.filter(s => s.id !== id);
    saveLocalSessions(updated);
    return updated;
  }
};

// Helper to get unique players
export const getUniquePlayerNames = async (): Promise<string[]> => {
    const sessions = await loadSessions();
    const names = new Set<string>();
    sessions.forEach(s => s.players.forEach(p => {
        if (p.name && p.name.trim()) {
            names.add(p.name.trim());
        }
    }));
    return Array.from(names).sort();
};