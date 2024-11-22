import { cache } from 'react';
import { getGamesCache, type Game, type GameStats } from './indexer';

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
  const games = await getGamesCache();
  
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
  const games = await getGamesCache();
  const baseGames = games.filter(game => game.is_base);

  if (baseGames.length === 0) {
    return [];
  }

  const periodDays = {
    '72h': 3,
    '7d': 7,
    '30d': 30,
    'all': Infinity,
  };

  const days = periodDays[period];

  const sortedGames = baseGames
    .map(game => ({
      ...game,
      downloads: days === Infinity 
        ? game.stats.total_downloads
        : calculatePeriodDownloads(game.stats, days),
    }))
    .sort((a, b) => b.downloads - a.downloads);

  return showAll ? sortedGames : sortedGames.slice(0, 12);
});

// Get details for a specific game
export const getGameDetails = cache(async (tid: string) => {
  const games = await getGamesCache();
  return games.find(game => game.tid === tid);
});