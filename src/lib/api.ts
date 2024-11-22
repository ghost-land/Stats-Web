import { cache } from 'react';
import { getGamesCache, type Game, type GameStats } from './indexer';

// Constantes pour la mise en cache
const CACHE_TTL = 60 * 60 * 1000; // 1 heure en millisecondes
let gamesCache: Game[] | null = null;
let lastCacheTime = 0;

// Get games with caching
async function getGamesWithCache(): Promise<Game[]> {
  const now = Date.now();
  if (gamesCache && (now - lastCacheTime) < CACHE_TTL) {
    return gamesCache;
  }

  try {
    const games = await getGamesCache();
    gamesCache = games;
    lastCacheTime = now;
    return games;
  } catch (error) {
    console.error('Error loading games:', error);
    return gamesCache || [];
  }
}

// Calculate downloads for a specific period with validation
function calculatePeriodDownloads(stats: GameStats, days: number): number {
  try {
    const dates = Object.keys(stats.per_date).sort();
    const recentDates = dates.slice(-days);
    return recentDates.reduce((sum, date) => {
      const downloads = stats.per_date[date];
      return sum + (typeof downloads === 'number' ? downloads : 0);
    }, 0);
  } catch (error) {
    console.error('Error calculating period downloads:', error);
    return 0;
  }
}

// Get global statistics
export const getGlobalStats = cache(async () => {
  const games = await getGamesWithCache();
  
  // Calculate total downloads for different periods
  const calculateTotalDownloads = (days: number) => {
    return games.reduce((total, game) => {
      return total + calculatePeriodDownloads(game.stats, days);
    }, 0);
  };

  return {
    last72h: calculateTotalDownloads(3),
    last7d: calculateTotalDownloads(7),
    last30d: calculateTotalDownloads(30),
    allTime: games.reduce((total, game) => total + game.stats.total_downloads, 0),
  };
});

// Get top games for a specific period
export const getTopGames = cache(async (period: '72h' | '7d' | '30d' | 'all', showAll = false) => {
  const games = await getGamesWithCache();
  const baseGames = games.filter(game => game.is_base);

  if (baseGames.length === 0) {
    return [];
  }

  const periodDays = {
    '72h': 3,
    '7d': 7,
    '30d': 30,
    'all': 0,
  };

  // Pour "all", utiliser directement total_downloads sans calcul supplémentaire
  const sortedGames = baseGames
    .map(game => ({
      ...game,
      downloads: period === 'all' 
        ? (game.stats.total_downloads || 0)
        : calculatePeriodDownloads(game.stats, periodDays[period])
    }))
    .sort((a, b) => b.downloads - a.downloads);

  return showAll ? sortedGames : sortedGames.slice(0, 12);
});

// Get game rankings for all periods
export const getGameRankings = cache(async (tid: string) => {
  const games = await getGamesWithCache();
  const game = games.find(g => g.tid === tid);
  if (!game) return null;

  const baseGames = games.filter(game => game.is_base);
  if (baseGames.length === 0) return null;

  const periods = {
    '72h': 3,
    '7d': 7,
    '30d': 30,
    'all': 0,
  } as const;

  const rankings: Record<keyof typeof periods, { 
    current: number | null;
    previous: number | null;
    change: number | null;
  }> = {
    '72h': { current: null, previous: null, change: null },
    '7d': { current: null, previous: null, change: null },
    '30d': { current: null, previous: null, change: null },
    'all': { current: null, previous: null, change: null },
  };

  Object.entries(periods).forEach(([period, days]) => {
    const currentSortedGames = baseGames
      .map(game => ({
        tid: game.tid,
        downloads: days === 0 
          ? (game.stats.total_downloads || 0)
          : calculatePeriodDownloads(game.stats, days)
      }))
      .sort((a, b) => b.downloads - a.downloads);

    const currentRank = currentSortedGames.findIndex(g => g.tid === tid) + 1;
    
    if (period === 'all') {
      rankings[period as keyof typeof periods] = {
        current: currentRank || null,
        previous: currentRank || null,
        change: 0
      };
      return;
    }

    const previousSortedGames = baseGames
      .map(game => ({
        tid: game.tid,
        downloads: calculatePeriodDownloads(game.stats, days * 2) - calculatePeriodDownloads(game.stats, days)
      }))
      .sort((a, b) => b.downloads - a.downloads);

    const previousRank = previousSortedGames.findIndex(g => g.tid === tid) + 1;
    
    rankings[period as keyof typeof periods] = {
      current: currentRank || null,
      previous: previousRank || null,
      change: previousRank && currentRank ? previousRank - currentRank : null
    };
  });

  return rankings;
});

// Get rankings for multiple games at once with improved caching
export const getGamesRankings = cache(async (tids: string[], period: '72h' | '7d' | '30d' | 'all') => {
  const games = await getGamesWithCache();
  const baseGames = games.filter(game => game.is_base);
  
  if (baseGames.length === 0) return new Map();

  const days = period === 'all' ? 0 : {
    '72h': 3,
    '7d': 7,
    '30d': 30,
  }[period];

  // Pour "all", utiliser directement total_downloads
  const currentSortedGames = baseGames
    .map(game => ({
      tid: game.tid,
      downloads: days === 0 
        ? (game.stats.total_downloads || 0)
        : calculatePeriodDownloads(game.stats, days)
    }))
    .sort((a, b) => b.downloads - a.downloads);

  // Pour "all", pas besoin de calcul précédent
  const previousSortedGames = days === 0 ? [] : baseGames
    .map(game => ({
      tid: game.tid,
      downloads: calculatePeriodDownloads(game.stats, days * 2) - calculatePeriodDownloads(game.stats, days)
    }))
    .sort((a, b) => b.downloads - a.downloads);

  const rankings = new Map();
  
  // Optimisation : ne calculer que pour les TIDs demandés
  const tidsSet = new Set(tids);
  
  currentSortedGames.forEach((game, index) => {
    if (!tidsSet.has(game.tid)) return;
    
    const currentRank = index + 1;
    if (days === 0) {
      rankings.set(game.tid, {
        current: currentRank,
        previous: currentRank,
        change: 0
      });
    } else {
      const previousIndex = previousSortedGames.findIndex(g => g.tid === game.tid);
      const previousRank = previousIndex === -1 ? null : previousIndex + 1;
      rankings.set(game.tid, {
        current: currentRank,
        previous: previousRank,
        change: previousRank ? previousRank - currentRank : null
      });
    }
  });

  return rankings;
});

// Get details for a specific game
export const getGameDetails = cache(async (tid: string) => {
  const games = await getGamesWithCache();
  return games.find(game => game.tid === tid);
});