import { NextResponse } from 'next/server';
import { fetchAllRecords } from '@/lib/lark';

// Cache records for 5 minutes server-side
let cachedRecords: Awaited<ReturnType<typeof fetchAllRecords>> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedRecords && now - cacheTime < CACHE_TTL) {
      return NextResponse.json({ records: cachedRecords, cached: true });
    }

    const records = await fetchAllRecords();
    cachedRecords = records;
    cacheTime = now;

    return NextResponse.json({ records, cached: false });
  } catch (error) {
    console.error('Failed to fetch records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
