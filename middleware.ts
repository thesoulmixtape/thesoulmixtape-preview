const SUPABASE_URL = 'https://yzeprmubwogcscmnvoow.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aMVnZ7Bjz0SVES1T3TNy0Q_S1z-juft';
const PROD_ORIGIN = 'https://thesoulmixtape.com';
const DEFAULT_IMAGE = `${PROD_ORIGIN}/main.jpg`;

const PAGE_META = {
  '/': {
    title: '#TheSoulMixtape | Soul, R&B, Jazz-Funk & Crate Digging',
    description:
      'Independent soul, R&B and jazz-funk: original #TheSoulMixtape music, the Crate Diggers podcast, features, radio shows and playlists.'
  },
  '/music': {
    title: 'Music | #TheSoulMixtape',
    description:
      'Dig through original soul, R&B, jazz-funk, boogie and related music from #TheSoulMixtape.'
  },
  '/podcast': {
    title: 'Crate Diggers Podcast | #TheSoulMixtape',
    description:
      'Crate Diggers: themed Black music selections, stories and deep cuts from SoulNRnB and Grizz.'
  },
  '/from-the-crates': {
    title: 'From The Crates | #TheSoulMixtape',
    description:
      'Features, radio shows, playlists and discoveries selected by #TheSoulMixtape.'
  },
  '/my-crate': {
    title: 'My Crate | #TheSoulMixtape',
    description: 'Your saved #TheSoulMixtape music and podcast picks.',
    noindex: true
  },
  '/counter': {
    title: 'The Counter | #TheSoulMixtape',
    description:
      'The future home of #TheSoulMixtape physical releases and merchandise.'
  },
  '/about': {
    title: 'About | #TheSoulMixtape',
    description:
      'About #TheSoulMixtape, SoulNRnB, Grizz and the music behind the project.'
  },
  '/contributors': {
    title: 'Contributors | #TheSoulMixtape',
    description: 'Private contributor access for #TheSoulMixtape.',
    noindex: true
  }
};

export const config = {
  matcher: [
    '/',
    '/music',
    '/podcast',
    '/from-the-crates',
    '/from-the-crates/:path*',
    '/my-crate',
    '/counter',
    '/about',
    '/contributors',
    '/sitemap.xml',
    '/robots.txt'
  ]
};

function esc(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]
  );
}

function xml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[char]
  );
}

function safeImage(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : DEFAULT_IMAGE;
  } catch {
    return DEFAULT_IMAGE;
  }
}

function pageHeaders(requestUrl, noindex = false, contentType = 'text/html; charset=utf-8') {
  const preview = new URL(requestUrl).hostname.endsWith('.vercel.app');
  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    'X-Robots-Tag': preview || noindex ? 'noindex, nofollow' : 'index, follow',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

function metaBlock({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  article = false,
  noindex = false
}) {
  const canonical = `${PROD_ORIGIN}${path}`;
  const robots = noindex
    ? 'noindex,nofollow'
    : 'index,follow,max-image-preview:large';

  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${article ? 'article' : 'website'}">
<meta property="og:site_name" content="#TheSoulMixtape">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(
    title.replace(/\s*\|\s*#TheSoulMixtape$/, '')
  )}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">`;
}

async function getArticle(slug) {
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return null;

  const endpoint =
    `${SUPABASE_URL}/rest/v1/articles` +
    `?slug=eq.${encodeURIComponent(slug)}` +
    '&status=eq.published' +
    '&select=id,title,slug,excerpt,cover_url' +
    '&limit=1';

  const response = await fetch(endpoint, {
    headers: { apikey: SUPABASE_KEY }
  });

  if (!response.ok) return null;
  const rows = await response.json();
  return rows?.[0] || null;
}

function optimiseShell(html) {
  html = html.replace(
    '<img class="logo" src="main.jpg"',
    '<img class="logo" decoding="async" fetchpriority="high" src="main.jpg"'
  );

  html = html.replace(
    '<div class="heroart"><img src="main.jpg"',
    '<div class="heroart"><img decoding="async" fetchpriority="high" src="main.jpg"'
  );

  html = html.replaceAll(
    '<img src="main.jpg"',
    '<img loading="lazy" decoding="async" src="main.jpg"'
  );

  for (const filename of [
    'pod.png',
    'soulnrnb.jpg',
    'grizz.jpg',
    'thanks.jpg',
    'crate.png',
    'nuwave.png',
    'ourmusic.png'
  ]) {
    html = html.replaceAll(
      `<img src="${filename}"`,
      `<img loading="lazy" decoding="async" src="${filename}"`
    );
  }

  html = html.replace(
    '<img id="articleCover"',
    '<img loading="lazy" decoding="async" id="articleCover"'
  );

  return html;
}

async function sitemapResponse(request) {
  const staticPaths = ['/', '/music', '/podcast', '/from-the-crates', '/about'];
  let articles = [];

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?status=eq.published&select=slug,published_at,created_at&order=published_at.desc.nullslast`,
      { headers: { apikey: SUPABASE_KEY } }
    );
    if (response.ok) articles = await response.json();
  } catch {}

  const urls = staticPaths.map(
    (path) => `<url><loc>${xml(BASE_URL(path))}</loc></url>`
  );

  for (const article of articles || []) {
    if (!article?.slug) continue;
    const lastmod = article.published_at || article.created_at || '';
    urls.push(
      `<url><loc>${xml(
        `${PROD_ORIGIN}/from-the-crates/${encodeURIComponent(article.slug)}`
      )}</loc>${
        lastmod
          ? `<lastmod>${xml(String(lastmod).slice(0, 10))}</lastmod>`
          : ''
      }</url>`
    );
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join(
      ''
    )}</urlset>`;

  const headers = pageHeaders(
    request.url,
    false,
    'application/xml; charset=utf-8'
  );
  headers['Cache-Control'] =
    'public, s-maxage=900, stale-while-revalidate=86400';

  return new Response(body, { headers });
}

function BASE_URL(path) {
  return `${PROD_ORIGIN}${path}`;
}

function robotsResponse(request) {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /contributors',
    'Disallow: /my-crate',
    '',
    `Sitemap: ${PROD_ORIGIN}/sitemap.xml`,
    ''
  ].join('\n');

  const headers = pageHeaders(
    request.url,
    false,
    'text/plain; charset=utf-8'
  );
  headers['Cache-Control'] = 'public, s-maxage=3600';

  return new Response(body, { headers });
}

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname === '/sitemap.xml') return sitemapResponse(request);
  if (url.pathname === '/robots.txt') return robotsResponse(request);

  let page = PAGE_META[url.pathname];
  let article = null;

  const articleMatch = url.pathname.match(
    /^\/from-the-crates\/([a-z0-9-]+)$/i
  );

  if (articleMatch) {
    article = await getArticle(articleMatch[1]);
    if (!article) {
      return new Response('Feature not found', {
        status: 404,
        headers: pageHeaders(request.url, true, 'text/plain; charset=utf-8')
      });
    }

    page = {
      title: `${article.title} | #TheSoulMixtape`,
      description:
        article.excerpt ||
        'A feature from #TheSoulMixtape — records, stories and discoveries from the crates.',
      image: safeImage(article.cover_url),
      article: true
    };
  }

  if (!page) {
    return new Response('Not found', {
      status: 404,
      headers: pageHeaders(request.url, true, 'text/plain; charset=utf-8')
    });
  }

  const shellResponse = await fetch(new URL('/index.html', request.url));
  if (!shellResponse.ok) {
    return new Response('Site shell unavailable', {
      status: 503,
      headers: pageHeaders(request.url, true, 'text/plain; charset=utf-8')
    });
  }

  let html = await shellResponse.text();

  html = html.replace(
    '<head>',
    `<head><base href="/"><meta name="theme-color" content="#0d0c0a"><link rel="preconnect" href="${SUPABASE_URL}" crossorigin><link rel="preconnect" href="https://thesoulmixtape-media.thesoulmixtape.workers.dev" crossorigin><style id="launch-a11y">:focus-visible{outline:3px solid var(--gold);outline-offset:3px}@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}</style>`
  );

  html = html.replace(
    '<title>#TheSoulMixtape</title>',
    metaBlock({
      title: page.title,
      description: page.description,
      path: url.pathname,
      image: page.image || DEFAULT_IMAGE,
      article: Boolean(page.article),
      noindex: Boolean(page.noindex)
    })
  );

  html = optimiseShell(html);

  if (article) {
    const initial = `<script>window.__TSM_INITIAL_ARTICLE__={id:${JSON.stringify(
      String(article.id)
    )},slug:${JSON.stringify(String(article.slug))}};</script>`;
    html = html.replace('</head>', `${initial}</head>`);
  }

  html = html.replace(
    '</body>',
    '<script src="/launch.js"></script></body>'
  );

  return new Response(html, {
    headers: pageHeaders(request.url, Boolean(page.noindex))
  });
}
