import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { formatFileSize, getDateRange } from '@/lib/utils';

interface GameTypeStats {
  base_downloads: number;
  update_downloads: number;
  dlc_downloads: number;
  base_data_transferred: number;
  update_data_transferred: number;
  dlc_data_transferred: number;
  unique_base_games: number;
  unique_updates: number;
  unique_dlc: number;
  base_data_size?: string;
  update_data_size?: string;
  dlc_data_size?: string;
}

interface DailyStats {
  date: string;
  total_downloads: number;
  unique_games: number;
  data_transferred: number;
}

interface MonthlyStats {
  year: number;
  month: number;
  total_downloads: number;
  data_transferred: number;
}

interface PeriodStats {
  period: string;
  content_type: string;
  total_downloads: number;
  data_transferred: number;
  unique_items: number;
  growth_rate: number;
  last_updated: string;
}

interface YearRow {
  year: number;
}

interface PeriodStatRow {
  period: string;
  content_type: string;
  total_downloads: number;
  data_transferred: number;
  unique_items: number;
  growth_rate: number;
  last_updated: string;
}

interface AnalyticsResponse {
  dailyStats: DailyStats[];
  monthlyStats: MonthlyStats[];
  periodStats: PeriodStats[];
  availableYears: number[];
  dataTransferTrends: { date: string; data_transferred: number; }[];
  gameTypeStats: GameTypeStats & {
    base_data_size: string;
    update_data_size: string;
    dlc_data_size: string;
  };
}

const DEFAULT_GAME_TYPE_STATS: GameTypeStats = {
  base_downloads: 0,
  update_downloads: 0,
  dlc_downloads: 0,
  base_data_transferred: 0,
  update_data_transferred: 0,
  dlc_data_transferred: 0,
  unique_base_games: 0,
  unique_updates: 0,
  unique_dlc: 0
};
interface DateRange {
  start: string;
  end: string;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface PeriodStat {
  period: string;
  content_type: string;
  total_downloads: number;
  data_transferred: number;
  unique_items: number;
  growth_rate: number;
  last_updated: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;
    
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' });
    }

    const dateRange = getDateRange(period, startDate, endDate, year, month);

    // Get daily stats
    const dailyStats = db.prepare(`
      SELECT date, total_downloads, unique_games, data_transferred
      FROM analytics_daily
      WHERE date BETWEEN ? AND ?
      ORDER BY date ASC
    `).all(dateRange.start, dateRange.end) as DailyStats[];

    // Get monthly stats
    const monthlyStats = db.prepare(`
      SELECT year, month, total_downloads, data_transferred
      FROM analytics_monthly
      WHERE (year > ? OR (year = ? AND month >= ?))
        AND (year < ? OR (year = ? AND month <= ?))
      ORDER BY year ASC, month ASC
    `).all(
      dateRange.start.slice(0, 4), dateRange.start.slice(0, 4), dateRange.start.slice(5, 7),
      dateRange.end.slice(0, 4), dateRange.end.slice(0, 4), dateRange.end.slice(5, 7)
    );

    // Get period stats
    const periodStats = db.prepare(`
      SELECT period, content_type, total_downloads, data_transferred, unique_items, growth_rate
      FROM analytics_period_stats
      WHERE period = ? OR period = 'all'
    `).all(period || 'all') as PeriodStat[];

    // Get game type stats
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
    `).get(dateRange.start, dateRange.end) as GameTypeStats;

    const formattedData = {
      dailyStats,
      monthlyStats,
      periodStats: periodStats.map((stat: PeriodStat) => ({
        period: stat.period,
        content_type: stat.content_type,
        total_downloads: Number(stat.total_downloads),
        data_transferred: Number(stat.data_transferred),
        unique_items: Number(stat.unique_items),
        growth_rate: Number(stat.growth_rate || 0),
        last_updated: stat.last_updated
      })),
      gameTypeStats: {
        base_downloads: Number(gameTypeStats?.base_downloads || 0),
        update_downloads: Number(gameTypeStats?.update_downloads || 0),
        dlc_downloads: Number(gameTypeStats?.dlc_downloads || 0),
        base_data_transferred: Number(gameTypeStats?.base_data_transferred || 0),
        update_data_transferred: Number(gameTypeStats?.update_data_transferred || 0),
        dlc_data_transferred: Number(gameTypeStats?.dlc_data_transferred || 0),
        unique_base_games: Number(gameTypeStats?.unique_base_games || 0),
        unique_updates: Number(gameTypeStats?.unique_updates || 0),
        unique_dlc: Number(gameTypeStats?.unique_dlc || 0),
        base_data_size: formatFileSize(gameTypeStats?.base_data_transferred || 0),
        update_data_size: formatFileSize(gameTypeStats?.update_data_transferred || 0),
        dlc_data_size: formatFileSize(gameTypeStats?.dlc_data_transferred || 0)
      },
      dataTransferTrends: dailyStats.map(d => ({
        date: d.date,
        data_transferred: d.data_transferred
      })),
      availableYears: (db.prepare('SELECT DISTINCT year FROM analytics_monthly ORDER BY year DESC').all() as Array<{ year: number }>).map(row => row.year)
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: 'Analytics error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}