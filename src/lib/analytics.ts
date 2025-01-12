import { getDatabase } from './db';
import { formatFileSize } from './utils';

interface AnalyticsParams {
  period?: string;
  startDate?: string;
  endDate?: string;
  year?: string;
  month?: string;
}

export async function calculatePeriodAnalytics(db: any, startDate: string, endDate: string) {
  const dailyStats = db.prepare(`
    SELECT date, total_downloads, unique_games, data_transferred
    FROM analytics_daily
    WHERE date BETWEEN ? AND ?
    ORDER BY date ASC
  `).all(startDate, endDate);

  const monthlyStats = db.prepare(`
    SELECT year, month, total_downloads, data_transferred
    FROM analytics_monthly
    WHERE (year > ? OR (year = ? AND month >= ?))
      AND (year < ? OR (year = ? AND month <= ?))
    ORDER BY year ASC, month ASC
  `).all(
    startDate.slice(0, 4), startDate.slice(0, 4), startDate.slice(5, 7),
    endDate.slice(0, 4), endDate.slice(0, 4), endDate.slice(5, 7)
  );

  const gameTypeStats = db.prepare(`
    SELECT
      SUM(CASE WHEN g.is_base = 1 THEN d.count ELSE 0 END) as base_downloads,
      SUM(CASE WHEN g.is_update = 1 THEN d.count ELSE 0 END) as update_downloads,
      SUM(CASE WHEN g.is_dlc = 1 THEN d.count ELSE 0 END) as dlc_downloads,
      SUM(CASE WHEN g.is_base = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as base_data_transferred,
      SUM(CASE WHEN g.is_update = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as update_data_transferred,
      SUM(CASE WHEN g.is_dlc = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as dlc_data_transferred,
      COUNT(DISTINCT CASE WHEN g.is_base = 1 THEN g.tid END) as unique_base_games,
      COUNT(DISTINCT CASE WHEN g.is_update = 1 THEN g.tid END) as unique_updates,
      COUNT(DISTINCT CASE WHEN g.is_dlc = 1 THEN g.tid END) as unique_dlc
    FROM downloads d
    JOIN games g ON d.tid = g.tid
    WHERE date BETWEEN ? AND ?
  `).get(startDate, endDate);

  return {
    dailyStats,
    monthlyStats,
    gameTypeStats: {
      ...gameTypeStats,
      base_data_size: formatFileSize(gameTypeStats.base_data_transferred),
      update_data_size: formatFileSize(gameTypeStats.update_data_transferred),
      dlc_data_size: formatFileSize(gameTypeStats.dlc_data_transferred)
    }
  };
}

export async function fetchAnalytics(params: AnalyticsParams) {
  const db = await getDatabase();
  if (!db) {
    throw new Error('Database connection failed');
  }

  // Get available years
  const years = db.prepare(`
    SELECT DISTINCT year 
    FROM analytics_monthly 
    ORDER BY year DESC
  `).all() as { year: number }[];

  // Get period stats
  const periodStats = db.prepare(`
    SELECT * FROM analytics_period_stats
  `).all();

  return {
    years: years.map(y => y.year),
    periodStats
  };
}