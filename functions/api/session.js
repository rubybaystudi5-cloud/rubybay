import { isAuthenticated, jsonResponse } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const ok = await isAuthenticated(request, env);
  return jsonResponse({ authenticated: ok });
}
