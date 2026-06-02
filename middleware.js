// Vercel Edge Middleware - runs before any page loads
import { rewrite } from "@vercel/edge";

export const config = {
  matcher: ['/((?!api|_next|favicon|.*\\..*).*)'],
};

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Maintenance | The Tracker App</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(135deg,#0a0a0c,#1a1a2e);font-family:system-ui,-apple-system,sans-serif;color:#fff;text-align:center;padding:2rem}
    .icon{font-size:5rem;margin-bottom:1.5rem;animation:float 3s ease-in-out infinite}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    h1{font-size:2.5rem;margin:0 0 1rem;font-weight:700}
    p{color:#9eb0c5;font-size:1.1rem;max-width:400px;line-height:1.6}
    a{color:#38ffd3;margin-top:1.5rem}
  </style>
</head>
<body>
  <div class="icon">{{ICON}}</div>
  <h1>{{TITLE}}</h1>
  <p>{{MESSAGE}}</p>
  <a href="/">← Back to Home</a>
</body>
</html>`;

// Pages that can be toggled off via feature flags
const TOGGLEABLE_PAGES = {
  '/pricing': 'pricing',
  '/brackets': 'brackets',
  '/win': 'win',
  '/groups': 'workoutGroups',
  '/blog': 'blog',
  '/press': 'press',
  '/products': 'products',
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // CRITICAL: the middleware decides whether to show the maintenance screen,
    // so it MUST read fresh flags. Don't go through /api/control here — that
    // endpoint is edge-cached and Vercel's CDN keys cache entries by URL, so
    // a previously-stale response would still be served until the TTL expires
    // even if the upstream has flipped maintenanceMode back to false.
    //
    // Solution: hit the upstream backend directly with a 2-second timeout.
    // Backend's /control endpoint is fast and inexpensive; one fetch per page
    // load per user is fine (it's the same call the old middleware made).
    // If upstream is unreachable, we silently let the page render normally.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.thetrackerapp.io/control', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
    
    if (res.ok) {
      const flags = await res.json();
      
      // Check maintenance mode first
      if (flags.maintenanceMode) {
        const html = MAINTENANCE_HTML
          .replace('{{ICON}}', '🔧')
          .replace('{{TITLE}}', "We'll Be Right Back")
          .replace('{{MESSAGE}}', flags.maintenanceMessage || "We're making some improvements. Check back soon!")
          .replace('<a href="/">← Back to Home</a>', '');
        
        return new Response(html, {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': '300',
          },
        });
      }
      
      // Check if page is toggled off
      const flagKey = TOGGLEABLE_PAGES[pathname];
      if (flagKey && flags[flagKey] === false) {
        const html = MAINTENANCE_HTML
          .replace('{{ICON}}', '🚫')
          .replace('{{TITLE}}', 'Page Not Available')
          .replace('{{MESSAGE}}', 'This page is currently unavailable.');
        
        return new Response(html, {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }
    }
  } catch (e) {
    // If control API fails, let the page load normally
  }

  // For the homepage, route through our server-renderer so the messaging
  // services + SVG preloads are injected into <head>. Vercel's filesystem
  // serves `dist/index.html` for `/` BEFORE checking `vercel.json` rewrites,
  // so the only way to intercept is here in middleware.
  //
  // We exclude the dashboard subdomain — it has its own host-scoped redirect
  // (`/` -> `/dashboard`) in vercel.json, but redirects run before middleware
  // so by the time we get here the host is guaranteed to be a marketing one.
  if (pathname === "/" || pathname === "/index" || pathname === "/index.html") {
    return rewrite(new URL("/api/home", request.url));
  }
}
