
export interface PlayerEntry {
  name: string;
  buyIn: number;
  cashOut: number;
}

export interface PokerSession {
  id: string;
  date: string; // ISO String
  location: string;
  durationMinutes: number;
  notes?: string;
  players: PlayerEntry[];
}

export interface PlayerStat {
  name: string;
  totalProfit: number;
  totalBuyIn: number;
  totalCashOut: number;
  sessionsPlayed: number;
  lastPlayed: string;
  avatar?: string; // Emoji char
}

export interface StatsSummary {
  totalProfit: number;
  hourlyRate: number;
  totalSessions: number;
  winRate: number;
}

export type Period = 'today' | 'yesterday' | 'all' | 'week' | 'month' | 'year' | 'custom';

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  PLAYERS = 'PLAYERS',
  ADD_SESSION = 'ADD_SESSION',
  QUICK_ADD = 'QUICK_ADD',
  HISTORY = 'HISTORY',
  PLAYER_DETAIL = 'PLAYER_DETAIL'
}
