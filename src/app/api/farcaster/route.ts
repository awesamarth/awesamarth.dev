// app/api/farcaster/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://hub.pinata.cloud/v1/castsByFid?fid=848743&pageSize=1&reverse=true';

  try {
    const res = await fetch(url);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching Farcaster data:', err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
