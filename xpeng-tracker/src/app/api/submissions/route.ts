import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    await getSupabase().from('xpeng_tracker_submissions').insert({
      title: body.title || null,
      type: body.type || null,
      car_model: body.carModel || null,
      function_area: body.functionArea || null,
      xos_version: body.xosVersion || null,
      country: body.country || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to log submission:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  try {
    const { count } = await getSupabase()
      .from('xpeng_tracker_submissions')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
