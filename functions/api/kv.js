export async function onRequestGet(context) {
  const key = new URL(context.request.url).searchParams.get('key');
  if (!key) return Response.json({ error: 'missing key' }, { status: 400 });
  try {
    const raw = await context.env.DB.get(key);
    return Response.json({ value: raw ? JSON.parse(raw) : null });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const key = new URL(context.request.url).searchParams.get('key');
  if (!key) return Response.json({ error: 'missing key' }, { status: 400 });
  try {
    const body = await context.request.json();
    await context.env.DB.put(key, JSON.stringify(body));
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const key = new URL(context.request.url).searchParams.get('key');
  if (!key) return Response.json({ error: 'missing key' }, { status: 400 });
  try {
    await context.env.DB.delete(key);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
