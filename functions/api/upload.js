import { requireAuth, jsonResponse } from '../_lib/auth.js';

const MAX_SIZE = 8 * 1024 * 1024; // 8MB safety cap

// POST /api/upload — protected. multipart/form-data with a `file` field.
// Stores the image in the R2 bucket bound as IMAGES and returns a URL that
// can be saved directly on a project's thumb/gallery/tool icon fields.
export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return jsonResponse({ error: 'expected_multipart_form_data' }, { status: 400 });
  }

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return jsonResponse({ error: 'bad_request' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return jsonResponse({ error: 'missing_file' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return jsonResponse({ error: 'file_too_large', maxBytes: MAX_SIZE }, { status: 413 });
  }
  if (!file.type || !file.type.startsWith('image/')) {
    return jsonResponse({ error: 'not_an_image' }, { status: 400 });
  }

  const ext = (file.type.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '') || 'bin';
  const key = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return jsonResponse({ url: `/api/images/${key}` }, { status: 201 });
}
