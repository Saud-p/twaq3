const API_KEY = '0bf21070f58c68ad655959915f01c5fb';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q   = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return Response.json({ error: 'query too short' }, { status: 400 });

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/leagues?search=${encodeURIComponent(q)}`,
      { headers: { 'x-apisports-key': API_KEY } }
    );
    if (!res.ok) return Response.json({ error: `API error ${res.status}` }, { status: 502 });

    const data    = await res.json();
    const leagues = (data.response || []).map((item) => ({
      id:      item.league.id,
      name:    item.league.name,
      country: item.country.name,
      logo:    item.league.logo,
      seasons: (item.seasons || []).map((s) => s.year).sort((a, b) => b - a),
    }));

    return Response.json({ leagues });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
