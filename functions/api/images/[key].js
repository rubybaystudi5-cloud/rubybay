// GET /api/images/:key — public. Streams an uploaded image straight out of
// the R2 bucket with long-lived caching (the key is content-addressed by
// timestamp+random so it never gets reused, so this is always safe to cache).
export async function onRequestGet({ env, params }) {
  const object = await env.IMAGES.get(params.key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
