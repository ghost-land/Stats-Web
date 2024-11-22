import { NextResponse } from 'next/server';
import { getGameDetails } from '@/lib/api';

export async function GET(
  request: Request,
  { params }: { params: { tid: string } }
) {
  const game = await getGameDetails(params.tid);
  
  if (!game) {
    return new Response('Game not found', { status: 404 });
  }

  return NextResponse.json(game);
}