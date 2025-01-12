// Constants for batch sizes and analytics
const BATCH_SIZES = {
    FILES: 1000,    // Process files in batches of 1000
    GAMES: 1000     // Process games in batches of 1000
  };
  
  const HOME_PAGE_LIMIT = 12; // Number of games to show on home page
  
  const PERIODS = ['72h', '7d', '30d', 'all'];
  const CONTENT_TYPES = ['base', 'update', 'dlc'];
  const ANALYTICS_PERIODS = {
    '72h': { days: 3, prevDays: 6 },
    '7d': { days: 7, prevDays: 14 },
    '30d': { days: 30, prevDays: 60 }
  };
  
  module.exports = {
    BATCH_SIZES,
    HOME_PAGE_LIMIT,
    PERIODS,
    CONTENT_TYPES,
    ANALYTICS_PERIODS
  };