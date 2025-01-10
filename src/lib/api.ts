import { cache } from 'react';
import type { Game, GlobalStats, DbGame } from './types';
import { getDatabase } from './db';

// Get global statistics
export const getGlobalStats = cache(async () => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const stats = db.prepare('SELECT * FROM global_stats WHERE id = 1').get() as GlobalStats;
    if (!stats) {
      throw new Error('Global stats not found');
    }
    
    return {
      last_72h: Number(stats.last_72h || 0),
      last_7d: Number(stats.last_7d || 0),
      last_30d: Number(stats.last_30d || 0),
      all_time: Number(stats.all_time || 0),
      last_updated: stats.last_updated || null
    } satisfies GlobalStats;
  } catch (error) {
    console.error('Error fetching global stats:', error);
    return {
      last_72h: 0,
      last_7d: 0,
      last_30d: 0,
      all_time: 0,
      last_updated: null
    } satisfies GlobalStats;
  }
});

// Get top games for a specific period
export const getTopGames = cache(async (period: '72h' | '7d' | '30d' | 'all', showAll = false): Promise<Game[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const query = period === 'all' 
      ? `
        SELECT 
          g.*,
          json_group_object(date, d.count) as per_date,
          g.total_downloads as period_downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        WHERE g.is_base = 1
        GROUP BY g.tid
        ORDER BY g.total_downloads DESC
      `
      : `
        WITH period_downloads AS (
          SELECT 
            tid,
            SUM(count) as period_total
          FROM downloads
          WHERE date >= date('now', '-${period === '72h' ? '3 days' : period === '7d' ? '7 days' : '30 days'}')
          GROUP BY tid
        )
        SELECT 
          g.*,
          json_group_object(date, d.count) as per_date,
          COALESCE(pd.period_total, 0) as period_downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        LEFT JOIN period_downloads pd ON g.tid = pd.tid
        WHERE g.is_base = 1
        GROUP BY g.tid
        ORDER BY COALESCE(pd.period_total, 0) DESC
      `;
    const results = db.prepare(query).all() as DbGame[];
    
    // Convert database rows to Game objects
    return results.map(row => ({
      tid: row.tid,
      is_base: Boolean(row.is_base),
      is_update: Boolean(row.is_update),
      is_dlc: Boolean(row.is_dlc),
      base_tid: row.base_tid,
      stats: {
        per_date: row.per_date ? JSON.parse(row.per_date) : {},
        total_downloads: Number(row.total_downloads || 0),
        period_downloads: row.period_downloads ? {
          last_72h: period === '72h' ? Number(row.period_downloads) : 0,
          last_7d: period === '7d' ? Number(row.period_downloads) : 0,
          last_30d: period === '30d' ? Number(row.period_downloads) : 0
        } : undefined,
        tid_downloads: {}
      },
      info: {
        name: row.name || undefined,
        version: row.version || undefined,
        size: row.size ? Number(row.size) : undefined,
        releaseDate: row.release_date || undefined
      }
    }));
  } catch (error) {
    console.error('Error fetching top games:', error);
    return [];
  }
});

// Get game rankings for all periods
export const getGameRankings = cache(async (tid: string): Promise<Record<'72h' | '7d' | '30d' | 'all', { current: number | null; previous: number | null; change: number | null; }>> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const rankings: Record<'72h' | '7d' | '30d' | 'all', { current: number | null; previous: number | null; change: number | null; }> = {
      '72h': { current: null, previous: null, change: null },
      '7d': { current: null, previous: null, change: null },
      '30d': { current: null, previous: null, change: null },
      'all': { current: null, previous: null, change: null }
    };
    
    for (const period of ['72h', '7d', '30d', 'all'] as const) {
      const query = period === 'all'
        ? `
          SELECT ROW_NUMBER() OVER (ORDER BY total_downloads DESC) as rank
          FROM games
          WHERE is_base = 1
        `
        : `
          WITH period_downloads AS (
            SELECT tid, SUM(count) as total
            FROM downloads
            WHERE date >= date('now', '-${period === '72h' ? '3 days' : period === '7d' ? '7 days' : '30 days'}')
            GROUP BY tid
          )
          SELECT ROW_NUMBER() OVER (ORDER BY COALESCE(total, 0) DESC) as rank
          FROM games g
          LEFT JOIN period_downloads pd ON g.tid = pd.tid
          WHERE g.is_base = 1
        `;
      
      const result = db.prepare(query).get() as { rank: number } | undefined;
      if (result) {
        rankings[period] = {
          current: result.rank,
          previous: result.rank,
          change: 0
        };
      }
    }
    return rankings;
  } catch (error) {
    console.error('Error fetching game rankings:', error);
    return {
      '72h': { current: null, previous: null, change: null },
      '7d': { current: null, previous: null, change: null },
      '30d': { current: null, previous: null, change: null },
      'all': { current: null, previous: null, change: null }
    };
  }
});

// Get rankings for multiple games at once
export const getGamesRankings = cache(async (tids: string[], period: '72h' | '7d' | '30d' | 'all') => {
  try {
    interface RankingResult {
      tid: string;
      current_rank: number;
      previous_rank: number;
    }

    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const query = period === 'all'
      ? `
        WITH rankings AS (
          SELECT 
            tid,
            ROW_NUMBER() OVER (ORDER BY total_downloads DESC) as current_rank,
            ROW_NUMBER() OVER (ORDER BY total_downloads DESC) as previous_rank
          FROM games
          WHERE is_base = 1
        )
        SELECT * FROM rankings WHERE tid IN (${tids.map(() => '?').join(',')})
      `
      : `
        WITH period_downloads AS (
          SELECT tid, SUM(count) as total
          FROM downloads
          WHERE date >= date('now', '-${period === '72h' ? '3 days' : period === '7d' ? '7 days' : '30 days'}')
          GROUP BY tid
        ),
        rankings AS (
          SELECT 
            g.tid,
            ROW_NUMBER() OVER (ORDER BY COALESCE(pd.total, 0) DESC) as current_rank,
            ROW_NUMBER() OVER (ORDER BY COALESCE(pd.total, 0) DESC) as previous_rank
          FROM games g
          LEFT JOIN period_downloads pd ON g.tid = pd.tid
          WHERE g.is_base = 1
        )
        SELECT * FROM rankings WHERE tid IN (${tids.map(() => '?').join(',')})
      `;
    const results = db.prepare(query).all(tids) as RankingResult[];
    return new Map(results.map(row => [
      row.tid,
      {
        current: row.current_rank,
        previous: row.previous_rank,
        change: row.previous_rank - row.current_rank
      }
    ]));
  } catch (error) {
    console.error('Error fetching games rankings:', error);
    return new Map();
  }
});

// Get details for a specific game
export const getGameDetails = cache(async (tid: string) => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const query = `
      SELECT 
        g.*,
        json_group_object(date, d.count) as per_date,
        (
          SELECT json_group_object(period, total)
          FROM (
            SELECT '72h' as period, SUM(CASE WHEN date >= date('now', '-3 days') THEN count ELSE 0 END) as total
            FROM downloads WHERE tid = g.tid
            UNION ALL
            SELECT '7d', SUM(CASE WHEN date >= date('now', '-7 days') THEN count ELSE 0 END)
            FROM downloads WHERE tid = g.tid
            UNION ALL
            SELECT '30d', SUM(CASE WHEN date >= date('now', '-30 days') THEN count ELSE 0 END)
            FROM downloads WHERE tid = g.tid
          )
        ) as period_downloads
      FROM games g
      LEFT JOIN downloads d ON g.tid = d.tid
      WHERE g.tid = ?
      GROUP BY g.tid
    `;
    
    const result = db.prepare(query).get(tid) as DbGame | undefined;
    
    if (!result) return null;
    
    // Convert database row to Game object
    return {
      tid: result.tid,
      is_base: Boolean(result.is_base),
      is_update: Boolean(result.is_update),
      is_dlc: Boolean(result.is_dlc),
      base_tid: result.base_tid,
      stats: {
        per_date: JSON.parse(result.per_date || '{}'),
        total_downloads: Number(result.total_downloads || 0),
        period_downloads: result.period_downloads ? JSON.parse(result.period_downloads) : undefined,
        tid_downloads: {}
      },
      info: {
        name: result.name || undefined,
        version: result.version || undefined,
        size: result.size ? Number(result.size) : undefined,
        releaseDate: result.release_date || undefined
      }
    } as Game;
  } catch (error) {
    console.error('Error fetching game details:', error);
    return null;
  }
});