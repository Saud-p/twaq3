const TEAM_MAP = {
  'Al Hilal':   'الهلال',   'Al Ittihad': 'الاتحاد',  'Al Nassr':   'النصر',
  'Al Shabab':  'الشباب',   'Al Ahli':    'الأهلي',   'Al Raed':    'الرائد',
  'Al Fath':    'الفتح',    'Al Fateh':   'الفتح',    'Al Fayha':   'الفيحاء',
  'Al Faisaly': 'الفيصلي',  'Al Shoaleh': 'الشعلة',   'Damac':      'ضمك',
  'Al Qadsiah': 'القادسية', 'Al Tai':     'الطائي',   'Al Wehda':   'الوحدة',
  'Al Khaleej': 'الخليج',   'Al Taawon':  'التعاون',  'Al Riyadh':  'الرياض',
};

function mapTeam(name) { return TEAM_MAP[name] || name; }

export async function onRequestGet(context) {
  const url      = new URL(context.request.url);
  const leagueId = url.searchParams.get('league');
  if (!leagueId) return Response.json({ results: [] });

  try {
    const res  = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${leagueId}`
    );
    if (!res.ok) return Response.json({ error: `API ${res.status}` }, { status: 502 });

    const data    = await res.json();
    const results = (data.events || [])
      .filter((e) => e.intHomeScore !== null && e.intHomeScore !== '' && e.intAwayScore !== null)
      .map((e) => {
        const h = parseInt(e.intHomeScore, 10);
        const a = parseInt(e.intAwayScore, 10);
        return {
          id:      String(e.idEvent),
          home:    mapTeam(e.strHomeTeam),
          away:    mapTeam(e.strAwayTeam),
          date:    e.dateEvent ?? '',
          outcome: h > a ? 'home' : h < a ? 'away' : 'draw',
        };
      });

    return Response.json({ results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
