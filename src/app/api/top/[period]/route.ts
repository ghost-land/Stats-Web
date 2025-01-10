import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

const VALID_PERIODS = ['72h', '7d', '30d', 'all'] as const;
type Period = typeof VALID_PERIODS[number];

function getPeriodCondition(period: Period): string {
  switch (period) {
    case '72h':
      return "date >= date('now', '-3 days')";
    case '7d':
      return "date >= date('now', '-7 days')";
    case '30d':
      return "date >= date('now', '-30 days')";
    case 'all':
      return '1=1'; // All dates
  }
}

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
  period_downloads: number;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { period: string } }
) {
  if (!VALID_PERIODS.includes(params.period as any)) {
    return new Response('Invalid period', { status: 400 });
  }

  const period = params.period as Period;
  let db = null;

  try {
    db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get top games for the period with proper typing
    const query = period === 'all' 
      ? `
        SELECT 
          g.*,
          json_group_object(
            date,
            d.count
          ) as per_date,
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
          WHERE ${getPeriodCondition(period)} 
          GROUP BY tid
        )
        SELECT 
          g.*,
          json_group_object(
            date,
            d.count
          ) as per_date,
          COALESCE(pd.period_total, 0) as period_downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        LEFT JOIN period_downloads pd ON g.tid = pd.tid
        WHERE g.is_base = 1
        GROUP BY g.tid
        ORDER BY COALESCE(pd.period_total, 0) DESC
      `;
    
    const games = db.prepare(query).all() as DbGame[];

    // Convert database rows to Game objects
    const formattedGames = games.map((row: any) => ({
      tid: row.tid,
      is_base: Boolean(row.is_base),
      is_update: Boolean(row.is_update),
      is_dlc: Boolean(row.is_dlc),
      base_tid: row.base_tid || null,
      stats: {
        per_date: row.per_date ? JSON.parse(row.per_date) : {},
        total_downloads: Number(row.period_downloads || 0),
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
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}