import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import type { DbGame } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase().trim() || '';
  const contentType = (searchParams.get('type') || 'base') as 'base' | 'update' | 'dlc' | 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '24'));
  const offset = (page - 1) * limit;

  if (!query) {
    return NextResponse.json({ games: [], total: 0 });
  }

  let db = null;

  try {
    db = await getDatabase();
    if (!db) {
      throw new Error('Database not available');
    }

    // Get total count first
    const typeCondition = contentType === 'all' ? '1=1' : 
      contentType === 'base' ? 'g.is_base = 1' : 
      contentType === 'update' ? 'g.is_update = 1' : 
      'g.is_dlc = 1';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM games g
      WHERE (
        LOWER(g.tid) LIKE ? OR 
        LOWER(COALESCE(g.name, '')) LIKE ?
      ) AND ${typeCondition}
    `;
    const { total } = db.prepare(countQuery).get(`%${query}%`, `%${query}%`) as { total: number };

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
      ) AND ${typeCondition}
      GROUP BY g.tid
      ORDER BY g.total_downloads DESC
      LIMIT ? OFFSET ?
    `).all(`%${query}%`, `%${query}%`, limit, offset) as DbGame[];

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

    return NextResponse.json({ games: formattedGames, total });
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ 
      error: 'Search failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}