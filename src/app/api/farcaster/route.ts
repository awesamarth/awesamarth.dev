// app/api/farcaster/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://snapchain-api.neynar.com/v1/castsByFid?fid=848743&pageSize=1&reverse=true';
  
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY as string
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching Farcaster data:', err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}