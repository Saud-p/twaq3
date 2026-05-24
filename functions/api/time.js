export async function onRequestGet() {
  return Response.json({ ts: Date.now() });
}
