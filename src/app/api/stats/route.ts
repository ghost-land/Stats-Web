import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface GlobalStats {
  last_72h: number;
  last_7d: number;
  last_30d: number;
  all_time: number;
  last_updated: string;
}

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get global stats from the global_stats table
    const stats = db.prepare('SELECT * FROM global_stats WHERE id = 1').get() as GlobalStats;
    
    if (!stats) {
      throw new Error('Global stats not found');
    }

    const formattedStats = {
      last_72h: Number(stats.last_72h || 0),
      last_7d: Number(stats.last_7d || 0),
      last_30d: Number(stats.last_30d || 0),
      allTime: Number(stats.all_time || 0)
    };

    return NextResponse.json(formattedStats);
  } catch (error) {
    console.error('Error reading database:', error);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}