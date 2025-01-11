import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import type { Statement } from 'better-sqlite3';

interface DbGame {
  tid: string;
  name: string | null;
  version: string | null;
  size: number | null;
  release_date: string | null;
  is_base: number;
  is_update: number;
  is_dlc: number;
  base_tid: string | null;
  total_downloads: number;
  per_date: string;
  period_downloads: string;
}

const PERIODS = ['72h', '7d', '30d'] as const;

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

function getPeriodCondition(period: typeof PERIODS[number]): string {
  switch (period) {
    case '72h':
      return "date >= date('now', '-3 days')";
    case '7d':
      return "date >= date('now', '-7 days')";
    case '30d':
      return "date >= date('now', '-30 days')";
  }
}

export async function GET(
  request: Request,
  { params }: { params: { tid: string } }
) {
  try {
    console.log(`[API] Fetching game details for TID: ${params.tid}`);
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const startTime = performance.now();

    // Get single game with its stats
    const stmt = db.prepare(`
      SELECT 
        g.*,
        json_group_object(
          date,
          CAST(d.count AS TEXT)
        ) as per_date,
        (
          SELECT json_group_object(period, total)
          FROM (
            SELECT 
              '72h' as period,
              SUM(CASE WHEN date >= date('now', '-3 days') THEN count ELSE 0 END) as total
            FROM downloads 
            WHERE tid = g.tid
            UNION ALL
            SELECT 
              '7d',
              SUM(CASE WHEN date >= date('now', '-7 days') THEN count ELSE 0 END)
            FROM downloads 
            WHERE tid = g.tid
            UNION ALL
            SELECT 
              '30d',
              SUM(CASE WHEN date >= date('now', '-30 days') THEN count ELSE 0 END)
            FROM downloads 
            WHERE tid = g.tid
          )
        ) as period_downloads
      FROM games g
      LEFT JOIN downloads d ON g.tid = d.tid
      WHERE g.tid = ?
      GROUP BY g.tid
    `) as Statement<[string], DbGame>;

    const game = stmt.get(params.tid);

    if (!game) {
      return new Response('Game not found', { status: 404 });
    }

    // Parse period downloads
    const periodDownloads = game.period_downloads ? JSON.parse(game.period_downloads) : {};
    
    // Ensure period downloads are properly formatted
    const formattedPeriodDownloads = {
      last_72h: Number(periodDownloads['72h'] || 0),
      last_7d: Number(periodDownloads['7d'] || 0),
      last_30d: Number(periodDownloads['30d'] || 0)
    };
    
    // Convert database row to Game object
    const formattedGame = {
      tid: game.tid,
      is_base: Boolean(game.is_base),
      is_update: Boolean(game.is_update),
      is_dlc: Boolean(game.is_dlc),
      base_tid: game.base_tid,
      stats: {
        per_date: JSON.parse(game.per_date.replace(/\\/g, '') || '{}'),
        total_downloads: Number(game.total_downloads || 0),
        period_downloads: formattedPeriodDownloads,
        tid_downloads: {}
      },
      info: {
        name: game.name || undefined,
        version: game.version || undefined,
        size: game.size ? Number(game.size) : undefined,
        releaseDate: game.release_date || undefined
      }
    };

    return NextResponse.json(formattedGame);
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}