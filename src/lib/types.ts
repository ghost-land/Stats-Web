export interface GameInfo {
  name?: string;
  version?: string;
  size?: number;
  releaseDate?: string;
}

export interface DbGame {
  tid: string;
  name: string | null;
  version: string | null;
  size: number | null;
  release_date: string | null;
  is_base: number;
  is_update: number;
  is_dlc: number;
  base_tid: string | null;
  total_downloads: number;
  per_date: string;
  period_downloads?: string;
  current_rank_72h?: number;
  previous_rank_72h?: number;
  change_72h?: number;
  current_rank_7d?: number;
  previous_rank_7d?: number;
  change_7d?: number;
  current_rank_30d?: number;
  previous_rank_30d?: number;
  change_30d?: number;
  rank_72h?: number;
  rank_change_72h?: number;
  rank_7d?: number;
  rank_change_7d?: number;
  rank_30d?: number;
  rank_change_30d?: number;
  current_rank?: number;
  previous_rank?: number;
  rank_change?: number;
}

export interface GameStats {
  per_date: Record<string, number>;
  tid_downloads: Record<string, number>;
  total_downloads: number;
  rankings?: {
    [key in '72h' | '7d' | '30d']?: {
      rank: number | null;
      change: number | null;
    };
  };
  period_downloads?: {
    last_72h: number;
    last_7d: number;
    last_30d: number;
  };
  rank_change?: number;
}

export interface Game {
  tid: string;
  is_base: boolean;
  is_update: boolean;
  is_dlc: boolean;
  base_tid: string | null;
  stats: GameStats;
  info?: GameInfo;
}

export interface GlobalStats {
  last_72h: number;
  last_7d: number;
  last_30d: number;
  all_time: number;
  evolution_72h: number;
  evolution_7d: number;
  evolution_30d: number;
  last_updated: string | null;
}