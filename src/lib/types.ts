export interface GameInfo {
  name?: string;
  version?: string;
  size?: number;
  releaseDate?: string;
}

export interface GameStats {
  per_date: Record<string, number>;
  tid_downloads: Record<string, number>;
  total_downloads: number;
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