const API_KEY = '0bf21070f58c68ad655959915f01c5fb';
const LEAGUE  = 307; // Saudi Pro League

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
  'Al Taawon':    'التعاون',
};

function mapTeam(name) {
  return TEAM_MAP[name] || name;
}

export async function onRequestGet() {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${LEAGUE}&season=2025&status=NS&next=10`,
      { headers: { 'x-apisports-key': API_KEY } }
    );

    if (!res.ok) return Response.json({ error: `API error ${res.status}` }, { status: 502 });

    const data = await res.json();
    const fixtures = (data.response || []).map((item) => ({
      id:   String(item.fixture.id),
      home: mapTeam(item.teams.home.name),
      away: mapTeam(item.teams.away.name),
      date: item.fixture.date?.split('T')[0] ?? '',
    }));

    return Response.json({ fixtures });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
