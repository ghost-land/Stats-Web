import { create } from 'zustand';

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
    last_updated: string;
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
  availableYears: number[];
  dataTransferTrends: { date: string; data_transferred: number; }[];
}

const DEFAULT_ANALYTICS_DATA: AnalyticsData = {
  dailyStats: [],
  monthlyStats: [],
  periodStats: [],
  gameTypeStats: {
    base_downloads: 0,
    update_downloads: 0,
    dlc_downloads: 0,
    base_data_transferred: 0,
    update_data_transferred: 0,
    dlc_data_transferred: 0,
    base_data_size: '0 B',
    update_data_size: '0 B',
    dlc_data_size: '0 B',
    unique_base_games: 0,
    unique_updates: 0,
    unique_dlc: 0
  },
  availableYears: [],
  dataTransferTrends: []
};

interface AnalyticsStore {
  data: AnalyticsData | null;
  setData: (data: AnalyticsData | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  fetchData: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    year?: string;
    month?: string;
  }) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  setData: (newData) => set((state) => ({
    data: newData ? {
      dailyStats: newData.dailyStats || DEFAULT_ANALYTICS_DATA.dailyStats,
      monthlyStats: newData.monthlyStats || DEFAULT_ANALYTICS_DATA.monthlyStats,
      periodStats: newData.periodStats || DEFAULT_ANALYTICS_DATA.periodStats,
      gameTypeStats: {
        ...DEFAULT_ANALYTICS_DATA.gameTypeStats,
        ...newData.gameTypeStats
      },
      availableYears: newData.availableYears || DEFAULT_ANALYTICS_DATA.availableYears,
      dataTransferTrends: newData.dataTransferTrends || DEFAULT_ANALYTICS_DATA.dataTransferTrends
    } : null
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  fetchData: async (params) => {
    const store = get();
    if (store.isLoading) return;

    try {
      store.setLoading(true);
      store.setError(null);

      // Check cache
      const cacheKey = JSON.stringify(params);
      const cachedData = localStorage.getItem(`analytics_${cacheKey}`);
      const cacheTimestamp = localStorage.getItem(`analytics_timestamp_${cacheKey}`);
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        store.setData(JSON.parse(cachedData));
        return;
      }

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });

      const response = await fetch(`/api/analytics?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');

      const data = await response.json();
      
      // Cache the response
      localStorage.setItem(`analytics_${cacheKey}`, JSON.stringify(data));
      localStorage.setItem(`analytics_timestamp_${cacheKey}`, now.toString());
      
      store.setData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      store.setLoading(false);
    }
  }
}));