import { cache } from 'react';
import type { Game, GlobalStats, DbGame } from './types';
import { getDatabase } from './db';

// Get home page rankings for a specific period
export const getHomePageRankings = cache(async (period: '72h' | '7d' | '30d' | 'all'): Promise<Game[]> => {
  try {
    console.log(`[API] Fetching home page rankings for period: ${period}`);
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const startTime = performance.now();
    const query = `
      SELECT 
        g.*,
        json_group_object(date, d.count) as per_date,
        h.downloads as period_downloads, 
        cr.rank as current_rank,
        cr.rank_change
      FROM home_page_rankings h
      JOIN games g ON h.tid = g.tid
      LEFT JOIN current_rankings cr ON g.tid = cr.tid AND cr.period = ? AND cr.content_type = 'base'
      LEFT JOIN downloads d ON g.tid = d.tid
      WHERE h.period = ?
      GROUP BY g.tid
      ORDER BY h.rank ASC
    `;
    
    const results = db.prepare(query).all(period, period) as DbGame[];
    
    // Convert database rows to Game objects
    const formattedGames = results.map(row => ({
      tid: row.tid,
      is_base: Boolean(row.is_base),
      is_update: Boolean(row.is_update),
      is_dlc: Boolean(row.is_dlc),
      base_tid: row.base_tid,
      stats: {
        per_date: row.per_date ? JSON.parse(row.per_date) : {},
        total_downloads: Number(row.total_downloads || 0),
        rank_change: row.rank_change !== undefined && row.rank_change !== null ? Number(row.rank_change) : undefined,
        tid_downloads: {}
      },
      info: {
        name: row.name || undefined,
        version: row.version || undefined,
        size: row.size ? Number(row.size) : undefined,
        releaseDate: row.release_date || undefined
      }
    }));

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`[API] Processed home page rankings for ${period} in ${duration}s`);
    
    return formattedGames;
  } catch (error) {
    console.error('Error fetching home page rankings:', error);
    return [];
  }
});
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

    // Calculate evolution percentages
    interface PeriodStats {
      prev_72h: number;
      prev_7d: number;
      prev_30d: number;
    }

    const prevStats = db.prepare(`
      WITH period_stats AS (
        SELECT
          SUM(CASE WHEN date >= date('now', '-6 days') AND date < date('now', '-3 days') THEN count ELSE 0 END) as prev_72h,
          SUM(CASE WHEN date >= date('now', '-14 days') AND date < date('now', '-7 days') THEN count ELSE 0 END) as prev_7d,
          SUM(CASE WHEN date >= date('now', '-60 days') AND date < date('now', '-30 days') THEN count ELSE 0 END) as prev_30d
        FROM downloads
      )
      SELECT * FROM period_stats
    `).get() as PeriodStats;

    const evolution_72h = prevStats.prev_72h > 0 
      ? ((stats.last_72h - prevStats.prev_72h) / prevStats.prev_72h) * 100 
      : 0;
    const evolution_7d = prevStats.prev_7d > 0 
      ? ((stats.last_7d - prevStats.prev_7d) / prevStats.prev_7d) * 100 
      : 0;
    const evolution_30d = prevStats.prev_30d > 0 
      ? ((stats.last_30d - prevStats.prev_30d) / prevStats.prev_30d) * 100 
      : 0;
    
    return {
      last_72h: Number(stats.last_72h || 0),
      last_7d: Number(stats.last_7d || 0),
      last_30d: Number(stats.last_30d || 0),
      all_time: Number(stats.all_time || 0),
      evolution_72h: Number(evolution_72h.toFixed(1)),
      evolution_7d: Number(evolution_7d.toFixed(1)),
      evolution_30d: Number(evolution_30d.toFixed(1)),
      last_updated: stats.last_updated || null
    } satisfies GlobalStats;
  } catch (error) {
    console.error('Error fetching global stats:', error);
    return {
      last_72h: 0,
      last_7d: 0,
      last_30d: 0,
      all_time: 0,
      evolution_72h: 0,
      evolution_7d: 0,
      evolution_30d: 0,
      last_updated: null
    } satisfies GlobalStats;
  }
});

// Get top games for a specific period
export const getTopGames = cache(async (
  period: '72h' | '7d' | '30d' | 'all',
  contentType: 'base' | 'update' | 'dlc' | 'all' = 'base',
  page = 1,
  limit = 24
): Promise<{ games: Game[]; total: number }> => {
  try {
    console.log(`[API] Fetching top games for period: ${period}, type: ${contentType}`);
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const startTime = performance.now();
    const typeCondition = contentType === 'all' ? '1=1' : 
      contentType === 'base' ? 'g.is_base = 1' : 
      contentType === 'update' ? 'g.is_update = 1' : 
      'g.is_dlc = 1';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count first
    const countQuery = `
      SELECT COUNT(*) as total
      FROM games g
      WHERE ${typeCondition}
    `;
    const { total } = db.prepare(countQuery).get() as { total: number };

    const query = period === 'all'
      ? `
        SELECT 
          g.*,
          json_group_object(date, d.count) as per_date,
          g.total_downloads as period_downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        WHERE ${typeCondition}
        GROUP BY g.tid
        ORDER BY g.total_downloads DESC
        LIMIT ? OFFSET ?
      `
      : `
        SELECT 
          g.*,
          json_group_object(date, d.count) as per_date,
          cr.rank as current_rank,
          cr.previous_rank,
          cr.rank_change,
          cr.downloads as period_downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        LEFT JOIN current_rankings cr ON g.tid = cr.tid AND cr.period = ? AND cr.content_type = ?
        WHERE ${typeCondition}
        GROUP BY g.tid
        ORDER BY cr.rank ASC NULLS LAST
        LIMIT ? OFFSET ?
      `;
    const results = period === 'all' 
      ? db.prepare(query).all(limit, offset) as DbGame[]
      : db.prepare(query).all(period, contentType, limit, offset) as DbGame[];
    
    console.log(`[API] Found ${results.length} ${contentType} games for period ${period}`);
    
    // Convert database rows to Game objects
    const formattedGames = results.map(row => ({
      tid: row.tid,
      is_base: Boolean(row.is_base),
      is_update: Boolean(row.is_update),
      is_dlc: Boolean(row.is_dlc),
      base_tid: row.base_tid,
      stats: {
        per_date: row.per_date ? JSON.parse(row.per_date) : {},
        total_downloads: Number(row.total_downloads || 0),
        rank_change: row.rank_change !== undefined && row.rank_change !== null ? Number(row.rank_change) : undefined,
        tid_downloads: {}
      },
      info: {
        name: row.name || undefined,
        version: row.version || undefined,
        size: row.size ? Number(row.size) : undefined,
        releaseDate: row.release_date || undefined
      }
    }));

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`[API] Processed top games for ${period} in ${duration}s`);
    
    console.log(`[API] Found ${formattedGames.length} ${contentType} games for period ${period}`);

    return { games: formattedGames, total };
  } catch (error) {
    console.error('Error fetching top games:', error);
    return { games: [], total: 0 };
  }
});

// Get game rankings for all periods
export const getGameRankings = cache(async (tid: string): Promise<Record<'72h' | '7d' | '30d' | 'all', { current: number | null; previous: number | null; change: number | null; }>> => {
  try {
    const startTime = performance.now();
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    // Get rankings from current_rankings table
    const query = `
      SELECT period, rank, previous_rank, rank_change
      FROM current_rankings
      WHERE tid = ?
    `;
    
    interface RankingRow {
      period: '72h' | '7d' | '30d' | 'all';
      rank: number;
      previous_rank: number | null;
      rank_change: number | null;
    }

    const results = db.prepare(query).all(tid) as RankingRow[];
    
    // Convert to expected format
    interface RankingRow {
      period: '72h' | '7d' | '30d' | 'all';
      rank: number;
      previous_rank: number | null;
      rank_change: number | null;
    }

    const rankings = results.reduce<Record<'72h' | '7d' | '30d' | 'all', { current: number | null; previous: number | null; change: number | null; }>>((acc, row) => {
      acc[row.period] = {
        current: row.rank,
        previous: row.previous_rank,
        change: row.rank_change
      };
      return acc;
    }, {
      '72h': { current: null, previous: null, change: null },
      '7d': { current: null, previous: null, change: null },
      '30d': { current: null, previous: null, change: null },
      'all': { current: null, previous: null, change: null }
    });
    
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`[API] Rankings processed in ${duration}s`);
    
    // Log first few rankings for debugging
    Object.entries(rankings).slice(0, 5).forEach(([period, ranking]) => {
      console.log(`[API] Rankings for ${period}: Current: ${ranking.current}, Previous: ${ranking.previous}, Change: ${ranking.change}`);
    });

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
    console.log(`[API] Fetching rankings for ${tids.length} games in period ${period}`);
    const startTime = performance.now();
    const BATCH_SIZE = 500; // Process 500 games at a time

    interface RankingResult {
      tid: string;
      current_rank: number;
      previous_rank: number;
    }

    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const rankings = new Map();
    
    // Process tids in batches
    for (let i = 0; i < tids.length; i += BATCH_SIZE) {
      const batchTids = tids.slice(i, i + BATCH_SIZE);
      
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
        SELECT * FROM rankings WHERE tid IN (${batchTids.map(() => '?').join(',')})
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
        SELECT * FROM rankings WHERE tid IN (${batchTids.map(() => '?').join(',')})
      `;
      
      const results = db.prepare(query).all(batchTids) as RankingResult[];
      
      // Add batch results to rankings map
      results.forEach(row => {
        rankings.set(row.tid, {
          current: row.current_rank,
          previous: row.previous_rank,
          change: row.previous_rank - row.current_rank
        });
      });
    }

    return rankings;
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