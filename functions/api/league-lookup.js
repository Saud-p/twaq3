export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  let id    = url.searchParams.get('id') ?? '';

  // يقبل رابط TheSportsDB كاملاً: https://www.thesportsdb.com/league/4668-...
  const urlMatch = id.match(/\/league\/(\d+)/);
  if (urlMatch) id = urlMatch[1];

  if (!id || !/^\d+$/.test(id.trim())) {
    return Response.json({ error: 'invalid id' }, { status: 400 });
  }

  try {
    const res  = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupleague.php?id=${id}`);
    const data = await res.json();
    const lg   = data.leagues?.[0];
    if (!lg) return Response.json({ error: 'not found' }, { status: 404 });

    return Response.json({
      league: {
        id:      String(lg.idLeague),
        name:    lg.strLeague,
        country: lg.strCountry ?? '',
        badge:   lg.strBadge || lg.strLogo || '',
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
