import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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

const SEARCH_LIMIT = 100; // Limit search results to prevent performance issues

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase().trim() || '';

  if (!query) {
    return NextResponse.json([]);
  }

  let db = null;

  try {
    db = await getDatabase();
    if (!db) {
      throw new Error('Database not available');
    }

    // Search games by name or TID with period downloads
    const games = db.prepare(`
      SELECT 
        g.*,
        COALESCE(json_group_object(
          date,
          CAST(d.count AS TEXT)
        ) FILTER (WHERE date >= date('now', '-30 days')), '{}') as per_date
      FROM games g
      LEFT JOIN downloads d ON g.tid = d.tid
      WHERE (
        LOWER(g.tid) LIKE ? OR 
        LOWER(COALESCE(g.name, '')) LIKE ?
      ) 
      GROUP BY g.tid
      ORDER BY g.total_downloads DESC
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, SEARCH_LIMIT) as DbGame[];

    // Convert database rows to Game objects
    const formattedGames = games.map(row => ({
      tid: row.tid,
      is_base: Boolean(row.is_base),
      is_update: Boolean(row.is_update),
      is_dlc: Boolean(row.is_dlc),
      base_tid: row.base_tid || null,
      stats: {
        per_date: JSON.parse(row.per_date.replace(/\\/g, '') || '{}'),
        total_downloads: Number(row.total_downloads || 0),
        tid_downloads: {}
      },
      info: {
        name: row.name,
        version: row.version,
        size: Number(row.size || 0),
        releaseDate: row.release_date
      }
    }));

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ 
      error: 'Search failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}