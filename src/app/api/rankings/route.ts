import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface RankRow {
  tid: string;
  rank: number;
}

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

export async function POST(request: Request) {
  let db = null;
  try {
    const { tids, period } = await request.json();

    if (!Array.isArray(tids) || !VALID_PERIODS.includes(period as Period)) {
      return new Response('Invalid request', { status: 400 });
    }

    db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const rankings = new Map();

    // Current period ranking
    const currentRankQuery = `
      WITH period_downloads AS (
        SELECT 
          downloads.tid,
          SUM(count) as period_total
        FROM downloads
        WHERE ${getPeriodCondition(period as Period)}
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

    const currentRanks = new Map(
      (db.prepare(currentRankQuery).all() as RankRow[])
        .map(row => [row.tid, row.rank])
    );

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

      const previousRanks = new Map(
        (db.prepare(previousRankQuery).all() as RankRow[])
          .map(row => [row.tid, row.rank])
      );

      // Calculate rankings for requested TIDs
      for (const tid of tids) {
        const currentRank = currentRanks.get(tid) || null;
        const previousRank = previousRanks.get(tid) || null;
        
        rankings.set(tid, {
          current: currentRank,
          previous: previousRank,
          change: previousRank && currentRank ? previousRank - currentRank : null
        });
      }
    } else {
      // For 'all' period, just use current rank
      for (const tid of tids) {
        const currentRank = currentRanks.get(tid) || null;
        rankings.set(tid, {
          current: currentRank,
          previous: currentRank,
          change: 0
        });
      }
    }

    return NextResponse.json(Object.fromEntries(rankings));
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}