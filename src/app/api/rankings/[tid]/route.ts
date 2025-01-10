import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

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

export async function GET(
  request: Request,
  { params }: { params: { tid: string } }
) {
  let db = null;
  try {
    db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const rankings: Record<Period, { current: number | null; previous: number | null; change: number | null }> = {
      '72h': { current: null, previous: null, change: null },
      '7d': { current: null, previous: null, change: null },
      '30d': { current: null, previous: null, change: null },
      'all': { current: null, previous: null, change: null },
    };

    // For each period, calculate current and previous rankings
    for (const period of VALID_PERIODS) {
      // Current period ranking
      const currentRankQuery = `
        WITH period_downloads AS (
          SELECT 
            downloads.tid,
            SUM(count) as period_total
          FROM downloads
          WHERE ${getPeriodCondition(period)}
          GROUP BY downloads.tid
        )
        SELECT 
          g.tid,
          ROW_NUMBER() OVER (ORDER BY COALESCE(period_total, 0) DESC) as rank
        FROM games g
        LEFT JOIN period_downloads pd ON g.tid = pd.tid
        WHERE g.is_base = 1
        ORDER BY rank
      `;

      interface RankRow {
        tid: string;
        rank: number;
      }

      const currentRank = (db.prepare(currentRankQuery)
        .all() as RankRow[])
        .find(row => row.tid === params.tid)?.rank || null;

      // Previous period ranking (for periods other than 'all')
      if (period !== 'all') {
        const previousRankQuery = `
          WITH period_downloads AS (
            SELECT 
              downloads.tid,
              SUM(count) as period_total
            FROM downloads
            WHERE date >= date('now', '-${period === '72h' ? '6' : period === '7d' ? '14' : '60'} days')
              AND date < date('now', '-${period === '72h' ? '3' : period === '7d' ? '7' : '30'} days')
            GROUP BY downloads.tid
          )
          SELECT 
            g.tid,
            ROW_NUMBER() OVER (ORDER BY COALESCE(period_total, 0) DESC) as rank
          FROM games g
          LEFT JOIN period_downloads pd ON g.tid = pd.tid
          WHERE g.is_base = 1
          ORDER BY rank
        `;

        const previousRank = (db.prepare(previousRankQuery)
          .all() as RankRow[])
          .find(row => row.tid === params.tid)?.rank || null;

        rankings[period] = {
          current: currentRank,
          previous: previousRank,
          change: previousRank && currentRank ? previousRank - currentRank : null
        };
      } else {
        rankings[period] = {
          current: currentRank,
          previous: currentRank,
          change: 0
        };
      }
    }

    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}