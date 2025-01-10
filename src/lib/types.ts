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
}

export interface GameStats {
  per_date: Record<string, number>;
  tid_downloads: Record<string, number>;
  total_downloads: number;
  period_downloads?: {
    last_72h: number;
    last_7d: number;
    last_30d: number;
  };
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
  last_updated: string | null;
}