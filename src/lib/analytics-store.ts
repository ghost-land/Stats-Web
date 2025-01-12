import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import pako from 'pako';

interface YearRow {
  year: number;
}

interface AnalyticsData {
  dailyStats: {
    date: string;
    total_downloads: number;
    unique_games: number;
    data_transferred: number;
  }[];
  monthlyStats: {
    year: number;
    month: number;
    total_downloads: number;
    data_transferred: number;
  }[];
  periodStats: {
    period: string;
    content_type: string;
    total_downloads: number;
    data_transferred: number;
    unique_items: number;
    growth_rate: number;
  }[];
  weeklyDistribution: {
    day: string;
    average_downloads: number;
  }[];
  hourlyDistribution: {
    hour: number;
    average_downloads: number;
  }[];
  dataTransferTrends: {
    date: string;
    data_transferred: number;
  }[];
  gameTypeStats: {
    base_downloads: number;
    update_downloads: number;
    dlc_downloads: number;
    base_data_transferred: number;
    update_data_transferred: number;
    dlc_data_transferred: number;
    base_data_size: string;
    update_data_size: string;
    dlc_data_size: string;
    unique_base_games: number;
    unique_updates: number;
    unique_dlc: number;
  };
  peakStats: {
    peak_hour: number;
    peak_hour_downloads: number;
    most_active_day: string;
    most_active_day_downloads: number;
  };
  availableYears: number[];
  lastUpdated: number;
}

interface AnalyticsStore {
  data: AnalyticsData | null;
  setData: (data: AnalyticsData | null) => void;
  lastFetch: number;
}

// Create store with persistence
export const useAnalyticsStore = create<AnalyticsStore>()(
  persist(
    (set) => ({
      data: null,
      lastFetch: 0,
      setData: (data) => set({ data, lastFetch: Date.now() }),
    }),
    {
      name: 'analytics-store',
      serialize: (state) => {
        // Compress data before storing
        const compressed = pako.deflate(JSON.stringify(state), { level: 9 });
        return btoa(String.fromCharCode.apply(null, compressed as any));
      },
      deserialize: (str) => {
        try {
          // Decompress stored data
          const compressed = Uint8Array.from(atob(str), c => c.charCodeAt(0));
          const decompressed = pako.inflate(compressed, { to: 'string' });
          return JSON.parse(decompressed);
        } catch (err) {
          console.error('Error deserializing analytics data:', err);
          return { data: null, lastFetch: 0 };
        }
      },
    }
  )
);