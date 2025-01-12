import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { formatFileSize } from '@/lib/utils';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache'; 

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
}

interface YearRow {
  year: number;
}

interface DailyStats {
  date: string;
  total_downloads: number;
  unique_games: number;
  data_transferred: number;
  base_downloads: number;
  update_downloads: number;
  dlc_downloads: number;
  base_data: number;
  update_data: number;
  dlc_data: number;
}

interface YearRow {
  year: number;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface DateRange {
  start: string;
  end: string;
}

async function getDateRange(
  period?: string,
  startDate?: string,
  endDate?: string,
  year?: string,
  month?: string
): Promise<DateRange> {
  if (startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  if (year && month) {
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      start: `${year}-${month.padStart(2, '0')}-01`,
      end: `${year}-${month.padStart(2, '0')}-${lastDay.getDate()}`
    };
  }

  if (year) {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`
    };
  }

  if (period === 'all') {
    // Get the earliest date from the downloads table
    const db = await getDatabase();
    if (!db) throw new Error('Database connection failed');
    
    const earliestDate = db.prepare('SELECT MIN(date) as date FROM downloads').get() as { date: string };
    return {
      start: earliestDate.date,
      end: new Date().toISOString().split('T')[0]
    };
  }

  // Default to last 30 days if no period specified
  const end = new Date();
  const start = new Date();
  const days = period === '72h' ? 3 : period === '7d' ? 7 : 30;
  start.setDate(start.getDate() - days);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check cache first
    try {
      const cachedData = await getAnalyticsCache(searchParams);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
    } catch (error) {
      console.error('Error checking analytics cache:', error);
    }

    const db = await getDatabase();
    if (!db || !db.open) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: 'Could not establish database connection'
      }, { status: 503 });
    }

    const period = searchParams.get('period') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;

    const dateRange = await getDateRange(period, startDate, endDate, year, month);

    // Prepare all queries in parallel
    const queries = {
      dailyStats: db.prepare(`
        SELECT * FROM analytics_daily
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `),

      monthlyStats: db.prepare(`
        SELECT * FROM analytics_monthly
        WHERE (year > ? OR (year = ? AND month >= ?))
          AND (year < ? OR (year = ? AND month <= ?))
        ORDER BY year ASC, month ASC
      `),

      periodStats: db.prepare(`
        SELECT * FROM analytics_period_stats
        WHERE period = ? OR period = 'all'
        AND last_updated >= datetime('now', '-1 hour')
        ORDER BY period ASC, content_type ASC
      `),

      availableYears: db.prepare(`
        SELECT DISTINCT year as year FROM analytics_monthly ORDER BY year DESC
      `),

      hourlyDistribution: db.prepare(`
        WITH RECURSIVE hours(hour) AS (
          SELECT 0
          UNION ALL
          SELECT hour + 1 FROM hours WHERE hour < 23
        )
        SELECT 
          hours.hour,
          ROUND(AVG(COALESCE(hourly_downloads.download_count, 0))) as average_downloads
        FROM hours
        LEFT JOIN (
          SELECT 
            CAST(strftime('%H', datetime(date || ' ' || (
              CASE 
                WHEN instr(date, ' ') > 0 THEN substr(date, instr(date, ' ') + 1)
                ELSE '00:00:00'
              END
            ))) AS INTEGER) as hour,
            SUM(count) as download_count
          FROM downloads
          WHERE date BETWEEN ? AND ?
          GROUP BY hour
        ) hourly_downloads ON hours.hour = hourly_downloads.hour
        GROUP BY hours.hour
        ORDER BY hours.hour
      `),
    };

    // Execute all queries in parallel using Promise.all
    const [
      dailyStats,
      monthlyStats,
      periodStats,
      availableYears,
      hourlyDistribution,
      weeklyDistribution,
      gameTypeStats
    ] = await Promise.all([
      queries.dailyStats.all(dateRange.start, dateRange.end),
      queries.monthlyStats.all(
        dateRange.start.slice(0, 4), dateRange.start.slice(0, 4), dateRange.start.slice(5, 7),
        dateRange.end.slice(0, 4), dateRange.end.slice(0, 4), dateRange.end.slice(5, 7)
      ),
      queries.periodStats.all(period || '30d'),
      queries.availableYears.all(),
      queries.hourlyDistribution.all(dateRange.start, dateRange.end),
      db.prepare(`
        SELECT 
          CASE CAST(strftime('%w', date) AS INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day,
          ROUND(AVG(daily_downloads)) as average_downloads
        FROM (
          SELECT date, SUM(count) as daily_downloads
          FROM downloads
          WHERE date BETWEEN ? AND ?
          GROUP BY date
        )
        GROUP BY strftime('%w', date)
        ORDER BY strftime('%w', date)
      `).all(dateRange.start, dateRange.end),
      db.prepare(`
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
      `).get(dateRange.start, dateRange.end)
    ]);

    // Format data for response
    const formattedData = {
      dailyStats,
      monthlyStats,
      periodStats,
      availableYears: (availableYears as YearRow[]).map(y => y.year),
      hourlyDistribution: hourlyDistribution as { hour: number; average_downloads: number }[],
      weeklyDistribution: weeklyDistribution as { day: string; average_downloads: number }[],
      dataTransferTrends: (dailyStats as DailyStats[]).map((d: DailyStats) => ({
        date: d.date,
        data_transferred: d.data_transferred
      })) as { date: string; data_transferred: number }[],
      gameTypeStats: {
        base_downloads: (gameTypeStats as GameTypeStats)?.base_downloads || 0,
        update_downloads: (gameTypeStats as GameTypeStats)?.update_downloads || 0,
        dlc_downloads: (gameTypeStats as GameTypeStats)?.dlc_downloads || 0,
        base_data_transferred: (gameTypeStats as GameTypeStats)?.base_data_transferred || 0,
        update_data_transferred: (gameTypeStats as GameTypeStats)?.update_data_transferred || 0,
        dlc_data_transferred: (gameTypeStats as GameTypeStats)?.dlc_data_transferred || 0,
        unique_base_games: (gameTypeStats as GameTypeStats)?.unique_base_games || 0,
        unique_updates: (gameTypeStats as GameTypeStats)?.unique_updates || 0,
        unique_dlc: (gameTypeStats as GameTypeStats)?.unique_dlc || 0,
        base_data_size: formatFileSize((gameTypeStats as GameTypeStats)?.base_data_transferred || 0),
        update_data_size: formatFileSize((gameTypeStats as GameTypeStats)?.update_data_transferred || 0),
        dlc_data_size: formatFileSize((gameTypeStats as GameTypeStats)?.dlc_data_transferred || 0)
      }
    };

    // Save to cache before returning
    setAnalyticsCache(searchParams, formattedData);

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: 'Analytics error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}