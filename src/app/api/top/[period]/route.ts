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

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

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

    // Get top games for the period
    const query = period === 'all' 
      ? `
        SELECT 
          g.*,
          COALESCE(json_group_object(
            date,
            CAST(d.count AS TEXT)
          ) FILTER (WHERE date >= date('now', '-30 days')), '{}') as per_date,
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
          FROM downloads d
          WHERE ${getPeriodCondition(period)}
          GROUP BY tid
        )
        SELECT 
          g.*,
          COALESCE(json_group_object(
            date,
            CAST(d.count AS TEXT)
          ) FILTER (WHERE date >= date('now', '-30 days')), '{}') as per_date,
          COALESCE(pd.period_total, 0) as period_downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        LEFT JOIN period_downloads pd ON g.tid = pd.tid
        WHERE g.is_base = 1
        GROUP BY g.tid
        ORDER BY period_downloads DESC
      `;
    
    const games = db.prepare(query).all();

    // Convert database rows to Game objects
    const formattedGames = games.map((row: unknown) => {
      // Type guard to ensure row has required properties
      if (!row || typeof row !== 'object') {
        return null;
      }

      const typedRow = row as {
        tid: string;
        is_base: number;
        is_update: number;
        is_dlc: number;
        base_tid: string | null;
        name: string | null;
        version: string | null;
        size: number | null;
        release_date: string | null;
        total_downloads: number;
        per_date: string;
      };

      return {
        tid: typedRow.tid,
        is_base: Boolean(typedRow.is_base),
        is_update: Boolean(typedRow.is_update),
        is_dlc: Boolean(typedRow.is_dlc),
        base_tid: typedRow.base_tid || null,
        stats: {
          per_date: JSON.parse(typedRow.per_date.replace(/\\/g, '')),
          total_downloads: Number(typedRow.total_downloads || 0),
          tid_downloads: {}
        },
        info: {
          name: typedRow.name,
          version: typedRow.version,
          size: Number(typedRow.size || 0),
          releaseDate: typedRow.release_date
        }
      };
    }).filter(game => game !== null);

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}