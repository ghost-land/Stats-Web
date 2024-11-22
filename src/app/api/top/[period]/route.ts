import { NextResponse } from 'next/server';
import { getTopGames } from '@/lib/api';

export async function GET(
  request: Request,
  { params }: { params: { period: string } }
) {
  const validPeriods = ['72h', '7d', '30d', 'all'] as const;
  const period = params.period as typeof validPeriods[number];

  if (!validPeriods.includes(period)) {
    return new Response('Invalid period', { status: 400 });
  }

  const games = await getTopGames(period);
  return NextResponse.json(games);
}