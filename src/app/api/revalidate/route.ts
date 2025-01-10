import { NextResponse } from 'next/server';
import { getDbLastModified } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Endpoint to check if revalidation is needed
export async function GET() {
  try {
    const lastModified = getDbLastModified();
    return NextResponse.json({ lastModified });
  } catch (error) {
    console.error('Error checking revalidation:', error);
    return NextResponse.json({ error: 'Failed to check revalidation' }, { status: 500 });
  }
}