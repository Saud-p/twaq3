const API_KEY = '0bf21070f58c68ad655959915f01c5fb';

const TEAM_MAP = {
  'Al Hilal':     'الهلال',
  'Al-Hilal':     'الهلال',
  'Al Ittihad':   'الاتحاد',
  'Ittihad':      'الاتحاد',
  'Al Nassr':     'النصر',
  'Al-Nassr':     'النصر',
  'Nassr':        'النصر',
  'Al Shabab':    'الشباب',
  'Shabab':       'الشباب',
  'Al Ahli':      'الأهلي',
  'Al-Ahli':      'الأهلي',
  'Ahli':         'الأهلي',
  'Al Raed':      'الرائد',
  'Raed':         'الرائد',
  'Al Fath':      'الفتح',
  'Al Fateh':     'الفتح',
  'Al Fayha':     'الفيحاء',
  'Al Faisaly':   'الفيصلي',
  'Al Faisali':   'الفيصلي',
  'Al Shoaleh':   'الشعلة',
  'Al Shoala':    'الشعلة',
  'Damac':        'ضمك',
  'Al Damac':     'ضمك',
  'Al Qadsiah':   'القادسية',
  'Al Tai':       'الطائي',
  'Al Wehda':     'الوحدة',
  'Al Khaleej':   'الخليج',
};

function mapTeam(name) {
  return TEAM_MAP[name] || name;
}

export async function onRequestGet(context) {
  const reqUrl = new URL(context.request.url);
  const league = reqUrl.searchParams.get('league') || '307';
  const season = reqUrl.searchParams.get('season') || '2025';

  try {
    const url = `https://v3.football.api-sports.io/fixtures?league=${league}&season=${season}&status=FT`;
    const res = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY },
    });

    if (!res.ok) {
      return Response.json({ error: `API error ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const fixtures = data.response || [];

    const results = fixtures.map((item) => {
      const homeGoals = item.goals.home ?? 0;
      const awayGoals = item.goals.away ?? 0;
      return {
        home:    mapTeam(item.teams.home.name),
        away:    mapTeam(item.teams.away.name),
        date:    item.fixture.date?.split('T')[0] ?? '',
        outcome: homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw',
      };
    });

    return Response.json({ results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
