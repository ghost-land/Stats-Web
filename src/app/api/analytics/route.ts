import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { formatFileSize } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDateRange(
  period?: string,
  startDate?: string,
  endDate?: string,
  year?: string,
  month?: string
): { start: string; end: string } {
  const now = new Date();

  if (period) {
    switch (period) {
      case '72h':
        return {
          start: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case '7d':
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case '30d':
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case 'all':
        return {
          start: '1970-01-01',
          end: now.toISOString().split('T')[0]
        };
    }
  }

  if (startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  if (year && month) {
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
    };
  }

  if (year) {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`
    };
  }

  // Default to last 30 days
  return {
    start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0]
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;

    const dateRange = getDateRange(period, startDate, endDate, year, month);

    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get daily downloads
    const dailyDownloads = db.prepare(`
      SELECT 
        date,
        SUM(count) as downloads
      FROM downloads
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `).all(dateRange.start, dateRange.end) as { date: string; downloads: number }[];

    // Get monthly downloads
    const monthlyDownloads = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(count) as downloads
      FROM downloads
      WHERE date BETWEEN ? AND ?
      GROUP BY month
      ORDER BY month
    `).all(dateRange.start, dateRange.end) as { month: string; downloads: number }[];

    // Get available years
    const availableYears = db.prepare(`
      SELECT DISTINCT strftime('%Y', date) as year
      FROM downloads d
      JOIN games g ON d.tid = g.tid
      WHERE g.is_base = 1
      ORDER BY year DESC
    `).all() as { year: string }[];

    // Get additional statistics
    const additionalStats = db.prepare(`
      WITH daily_stats AS (
        SELECT 
          date,
          SUM(count) as daily_total,
          COUNT(DISTINCT tid) as unique_games
        FROM downloads
        WHERE date BETWEEN ? AND ?
        GROUP BY date
      )
      SELECT
        ROUND(AVG(daily_total)) as average_daily_downloads,
        MAX(daily_total) as highest_daily_downloads,
        MIN(CASE WHEN daily_total > 0 THEN daily_total END) as lowest_daily_downloads,
        ROUND(AVG(unique_games)) as average_daily_games,
        MAX(unique_games) as max_daily_games,
        MIN(unique_games) as min_daily_games
      FROM daily_stats
    `).get(dateRange.start, dateRange.end) as {
      average_daily_downloads: number;
      highest_daily_downloads: number;
      lowest_daily_downloads: number;
      average_daily_games: number;
      max_daily_games: number;
      min_daily_games: number;
    };

    // Get game type distribution
    const gameTypeStats = db.prepare(`
      WITH type_stats AS (
        SELECT 
          CAST(COALESCE(SUM(CASE WHEN is_base = 1 THEN d.count ELSE 0 END), 0) AS INTEGER) as base_downloads,
          CAST(COALESCE(SUM(CASE WHEN is_base = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END), 0) AS INTEGER) as base_data_transferred,
          CAST(COALESCE(SUM(CASE WHEN is_update = 1 THEN d.count ELSE 0 END), 0) AS INTEGER) as update_downloads,
          CAST(COALESCE(SUM(CASE WHEN is_update = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END), 0) AS INTEGER) as update_data_transferred,
          CAST(COALESCE(SUM(CASE WHEN is_dlc = 1 THEN d.count ELSE 0 END), 0) AS INTEGER) as dlc_downloads,
          CAST(COALESCE(SUM(CASE WHEN is_dlc = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END), 0) AS INTEGER) as dlc_data_transferred,
          COUNT(DISTINCT CASE WHEN is_base = 1 THEN g.tid END) as unique_base_games,
          COUNT(DISTINCT CASE WHEN is_update = 1 THEN g.tid END) as unique_updates,
          COUNT(DISTINCT CASE WHEN is_dlc = 1 THEN g.tid END) as unique_dlc
        FROM downloads d
        JOIN games g ON d.tid = g.tid
        WHERE date BETWEEN ? AND ?
      )
      SELECT *,
        COALESCE(base_downloads, 0) + COALESCE(update_downloads, 0) + COALESCE(dlc_downloads, 0) as total_downloads,
        COALESCE(base_data_transferred, 0) + COALESCE(update_data_transferred, 0) + COALESCE(dlc_data_transferred, 0) as total_data_transferred
      FROM type_stats
    `).get(dateRange.start, dateRange.end);

    interface GameTypeStats {
      base_downloads: number;
      base_data_transferred: number;
      update_downloads: number;
      update_data_transferred: number;
      dlc_downloads: number;
      dlc_data_transferred: number;
      unique_base_games: number;
      unique_updates: number;
      unique_dlc: number;
      total_downloads: number;
      total_data_transferred: number;
    }

    const typedGameTypeStats = gameTypeStats as GameTypeStats;

    // Get hourly distribution
    const hourlyStats = db.prepare(`
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
    `).all(dateRange.start, dateRange.end) as { hour: number; average_downloads: number }[];

    // Get weekly distribution
    const weeklyStats = db.prepare(`
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
    `).all(dateRange.start, dateRange.end) as { day: string; average_downloads: number }[];

    // Get data transfer trends
    const dataTransferTrends = db.prepare(`
      SELECT 
        date,
        SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)) as data_transferred
      FROM downloads d
      JOIN games g ON d.tid = g.tid
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `).all(dateRange.start, dateRange.end) as { date: string; data_transferred: number }[];

    // Get hourly data transfer
    const hourlyDataTransfer = db.prepare(`
      SELECT 
        CAST(strftime('%H', datetime(date || ' ' || (
          CASE 
            WHEN instr(date, ' ') > 0 THEN substr(date, instr(date, ' ') + 1)
            ELSE '00:00:00'
          END
        ))) AS INTEGER) as hour,
        SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)) as data_transferred
      FROM downloads d
      JOIN games g ON d.tid = g.tid
      WHERE date BETWEEN ? AND ?
      GROUP BY hour
      ORDER BY hour
    `).all(dateRange.start, dateRange.end) as { hour: number; data_transferred: number }[];

    // Get average game size trends
    const gameSizeTrends = db.prepare(`
      SELECT 
        date,
        ROUND(AVG(CAST(COALESCE(g.size, 0) AS INTEGER))) as average_size,
        MAX(CAST(COALESCE(g.size, 0) AS INTEGER)) as max_size,
        MIN(CASE WHEN g.size > 0 THEN CAST(g.size AS INTEGER) END) as min_size
      FROM downloads d
      JOIN games g ON d.tid = g.tid
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `).all(dateRange.start, dateRange.end) as { 
      date: string; 
      average_size: number;
      max_size: number;
      min_size: number;
    }[];

    // Get peak statistics
    const peakStats = db.prepare(`
      WITH hourly_downloads AS (
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
      ),
      daily_downloads AS (
        SELECT date, SUM(count) as download_count
        FROM downloads
        WHERE date BETWEEN ? AND ?
        GROUP BY date
      )
      SELECT
        (SELECT hour FROM hourly_downloads ORDER BY download_count DESC LIMIT 1) as peak_hour,
        (SELECT MAX(download_count) FROM hourly_downloads) as peak_hour_downloads,
        (SELECT date FROM daily_downloads ORDER BY download_count DESC LIMIT 1) as most_active_day,
        (SELECT MAX(download_count) FROM daily_downloads) as most_active_day_downloads
    `).get(dateRange.start, dateRange.end, dateRange.start, dateRange.end) as {
      peak_hour: number;
      peak_hour_downloads: number;
      most_active_day: string;
      most_active_day_downloads: number;
    };

    // Get game statistics
    const gameStats = db.prepare(`
      SELECT
        COUNT(DISTINCT d.tid) as total_unique_games
      FROM downloads d
      JOIN games g ON d.tid = g.tid
      WHERE date BETWEEN ? AND ?
    `).get(dateRange.start, dateRange.end) as {
      total_unique_games: number;
    };

    // Calculate statistics
    const stats = {
      total: dailyDownloads.reduce((sum, day) => sum + day.downloads, 0),
      dailyAverage: Math.round(dailyDownloads.reduce((sum, day) => sum + day.downloads, 0) / dailyDownloads.length),
      peakDay: dailyDownloads.reduce((peak, day) => 
        day.downloads > (peak?.downloads || 0) ? day : peak
      , { date: '', downloads: 0 }),
      growthRate: 0,
      total_data_size: formatFileSize(typedGameTypeStats ? (
        typedGameTypeStats.base_data_transferred + 
        typedGameTypeStats.update_data_transferred + 
        typedGameTypeStats.dlc_data_transferred
      ) : 0)
    };

    // Calculate growth rate
    if (dailyDownloads.length > 1) {
      const midPoint = Math.floor(dailyDownloads.length / 2);
      const firstHalf = dailyDownloads.slice(0, midPoint).reduce((sum, day) => sum + day.downloads, 0);
      const secondHalf = dailyDownloads.slice(midPoint).reduce((sum, day) => sum + day.downloads, 0);
      stats.growthRate = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
    }

    return NextResponse.json({
      dailyLabels: dailyDownloads.map(day => day.date),
      dailyDownloads: dailyDownloads.map(day => day.downloads),
      monthlyLabels: monthlyDownloads.map(month => month.month),
      monthlyDownloads: monthlyDownloads.map(month => month.downloads),
      dataTransferTrends: {
        labels: dataTransferTrends.map(day => day.date),
        data: dataTransferTrends.map(day => day.data_transferred),
      },
      hourlyDataTransfer: {
        labels: hourlyDataTransfer.map(hour => hour.hour.toString().padStart(2, '0') + ':00'),
        data: hourlyDataTransfer.map(hour => hour.data_transferred),
      },
      gameSizeTrends: {
        labels: gameSizeTrends.map(day => day.date),
        averageSize: gameSizeTrends.map(day => day.average_size),
        maxSize: gameSizeTrends.map(day => day.max_size),
        minSize: gameSizeTrends.map(day => day.min_size),
      },
      stats,
      availableYears: availableYears.map(y => y.year),
      additionalStats,
      gameTypeStats: typedGameTypeStats ? {
        base_downloads: typedGameTypeStats.base_downloads,
        update_downloads: typedGameTypeStats.update_downloads,
        dlc_downloads: typedGameTypeStats.dlc_downloads,
        base_data_size: formatFileSize(typedGameTypeStats.base_data_transferred),
        update_data_size: formatFileSize(typedGameTypeStats.update_data_transferred),
        dlc_data_size: formatFileSize(typedGameTypeStats.dlc_data_transferred),
        unique_base_games: typedGameTypeStats.unique_base_games,
        unique_updates: typedGameTypeStats.unique_updates,
        unique_dlc: typedGameTypeStats.unique_dlc
      } : {
        base_downloads: 0,
        update_downloads: 0,
        dlc_downloads: 0,
        base_data_size: '0 B',
        update_data_size: '0 B',
        dlc_data_size: '0 B',
        unique_base_games: 0,
        unique_updates: 0,
        unique_dlc: 0
      },
      hourlyStats,
      weeklyStats,
      peakStats,
      gameStats: {
        total_unique_games: gameStats.total_unique_games
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