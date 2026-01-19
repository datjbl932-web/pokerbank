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
}

export interface StatsSummary {
  totalProfit: number;
  hourlyRate: number;
  totalSessions: number;
  winRate: number;
}

export type Period = 'all' | 'week' | 'month' | 'year';

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  PLAYERS = 'PLAYERS',
  ADD_SESSION = 'ADD_SESSION',
  HISTORY = 'HISTORY'
}