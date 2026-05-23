import { NextResponse } from 'next/server';
import { upcomingMatches } from '../../../lib/matches';

export const dynamic = 'force-static';

export async function GET(request: Request) {
  const key = process.env.API_FOOTBALL_KEY;
  const league = process.env.API_FOOTBALL_LEAGUE_ID;
  const season = process.env.API_FOOTBALL_SEASON;
  const nextCount = process.env.API_FOOTBALL_NEXT || '10';

  // If an API key and league id are configured, call the external API-Football
  if (key && league) {
    try {
      const url = new URL('https://v3.football.api-sports.io/fixtures');
      url.searchParams.set('league', league);
      if (season) url.searchParams.set('season', season);
      // Note: free plans on API-Football may not support the `next` parameter.
      // We avoid sending it to remain compatible with free tiers.

      const res = await fetch(url.toString(), {
        headers: {
          'x-apisports-key': key,
          Accept: 'application/json',
        },
        // server-side request; do not rely on Next caching here
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`External API error ${res.status}`);

      const data = await res.json();

      const mapped = (data.response || []).map((item: any) => {
        const fixture = item.fixture ?? item;
        const teams = item.teams ?? item;
        const home = teams.home?.name ?? teams.home ?? 'Home';
        const away = teams.away?.name ?? teams.away ?? 'Away';
        const date = fixture?.date ? new Date(fixture.date).toISOString().split('T')[0] : '';
        const id = String(fixture?.id ?? item.id ?? Math.random().toString(36).slice(2, 9));
        return { id, home, away, date, homeScore: null, awayScore: null };
      });

      return NextResponse.json({ matches: mapped });
    } catch (err) {
      // On error, fall back to the local mock data
      console.error('Failed fetching external matches:', err);
      return NextResponse.json({ matches: upcomingMatches });
    }
  }

  // Default: return local upcoming matches
  return NextResponse.json({ matches: upcomingMatches });
}
