import { PokerSession } from '../types';

const STORAGE_KEY = 'poker_ledger_data_v2'; // Changed key to avoid conflict with old single-player data

export const getSessions = (): PokerSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from storage", error);
    return [];
  }
};

export const saveSession = (session: PokerSession): PokerSession[] => {
  const current = getSessions();
  const updated = [session, ...current]; // Add to top
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const updateSession = (updatedSession: PokerSession): PokerSession[] => {
  const current = getSessions();
  const updated = current.map(s => s.id === updatedSession.id ? updatedSession : s);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteSession = (id: string): PokerSession[] => {
  const current = getSessions();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

// Helper to get all unique player names for autocomplete
export const getUniquePlayerNames = (): string[] => {
  const sessions = getSessions();
  const names = new Set<string>();
  sessions.forEach(s => s.players.forEach(p => names.add(p.name)));
  return Array.from(names).sort();
};