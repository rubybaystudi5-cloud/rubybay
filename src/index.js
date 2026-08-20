// RubyBay Studio — single Worker entry point.
//
// This project serves static HTML/CSS/JS via the Workers "assets" binding
// (ASSETS) and handles the /api/* routes below by re-using the exact same
// handler functions that were originally written as Cloudflare Pages
// Functions (in ../functions/**). Each of those files still exports
// onRequestGet / onRequestPost / onRequestPut / onRequestDelete the same way
// Pages Functions do — we just call them directly here instead of relying on
// Pages' file-based auto-routing, since this project deploys as a Worker
// (via `wrangler deploy`) rather than as a Pages project.

import * as login from '../functions/api/login.js';
import * as logout from '../functions/api/logout.js';
import * as session from '../functions/api/session.js';
import * as projects from '../functions/api/projects.js';
import * as projectById from '../functions/api/projects/[id].js';
import * as reorder from '../functions/api/projects/reorder.js';
import * as tools from '../functions/api/tools.js';
import * as toolById from '../functions/api/tools/[id].js';
import * as upload from '../functions/api/upload.js';
import * as imageByKey from '../functions/api/images/[key].js';

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (pathname.startsWith('/api/')) {
      try {
        if (pathname === '/api/login' && method === 'POST') {
          return await login.onRequestPost({ request, env });
        }
        if (pathname === '/api/logout' && method === 'POST') {
          return await logout.onRequestPost({ request, env });
        }
        if (pathname === '/api/session' && method === 'GET') {
          return await session.onRequestGet({ request, env });
        }

        // Static /api/projects/reorder must be checked before the
        // /api/projects/:id dynamic pattern below.
        if (pathname === '/api/projects/reorder' && method === 'POST') {
          return await reorder.onRequestPost({ request, env });
        }
        if (pathname === '/api/projects' && method === 'GET') {
          return await projects.onRequestGet({ env });
        }
        if (pathname === '/api/projects' && method === 'POST') {
          return await projects.onRequestPost({ request, env });
        }

        let m = pathname.match(/^\/api\/projects\/([^/]+)$/);
        if (m) {
          const params = { id: decodeURIComponent(m[1]) };
          if (method === 'PUT') return await projectById.onRequestPut({ request, env, params });
          if (method === 'DELETE') return await projectById.onRequestDelete({ request, env, params });
        }

        if (pathname === '/api/tools' && method === 'GET') {
          return await tools.onRequestGet({ env });
        }
        if (pathname === '/api/tools' && method === 'POST') {
          return await tools.onRequestPost({ request, env });
        }

        m = pathname.match(/^\/api\/tools\/([^/]+)$/);
        if (m) {
          const params = { id: decodeURIComponent(m[1]) };
          if (method === 'DELETE') return await toolById.onRequestDelete({ request, env, params });
        }

        if (pathname === '/api/upload' && method === 'POST') {
          return await upload.onRequestPost({ request, env });
        }

        m = pathname.match(/^\/api\/images\/([^/]+)$/);
        if (m) {
          const params = { key: decodeURIComponent(m[1]) };
          if (method === 'GET') return await imageByKey.onRequestGet({ env, params });
        }

        return jsonError(404, 'not_found');
      } catch (err) {
        return jsonError(500, 'internal_error: ' + (err && err.message ? err.message : String(err)));
      }
    }

    // Everything else (index.html, work.html, admin.html, price.html,
    // about.html, contact.html, images, etc.) is served as a static asset.
    return env.ASSETS.fetch(request);
  },
};
