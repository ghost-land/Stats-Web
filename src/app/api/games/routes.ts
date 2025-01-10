import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

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
}

export async function GET() {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get all games with their stats
    const games = db.prepare(`
      SELECT 
        g.*,
        COALESCE(json_group_object(
          CASE 
            WHEN date >= date('now', '-30 days') THEN date 
            ELSE NULL 
          END, 
          CAST(d.count AS TEXT)
        ), '{}') as per_date
      FROM games g
      LEFT JOIN downloads d ON g.tid = d.tid
      GROUP BY g.tid
      ORDER BY g.total_downloads DESC
    `).all() as DbGame[];

    // Convert database rows to Game objects
    const formattedGames = games.map((row: DbGame) => ({
      tid: row.tid,
      is_base: row.is_base === 1,
      is_update: row.is_update === 1,
      is_dlc: row.is_dlc === 1,
      base_tid: row.base_tid || null,
      stats: {
        per_date: JSON.parse(row.per_date || '{}'),
        total_downloads: Number(row.total_downloads),
        tid_downloads: {}
      },
      info: {
        name: row.name,
        version: row.version,
        size: Number(row.size),
        releaseDate: row.release_date
      }
    }));

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}