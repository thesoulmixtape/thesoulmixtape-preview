(() => {
  const originalGo = window.go;
  if (typeof originalGo !== 'function') return;

  const SUPABASE_URL = 'https://yzeprmubwogcscmnvoow.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_aMVnZ7Bjz0SVES1T3TNy0Q_S1z-juft';
  const PROD_ORIGIN = 'https://thesoulmixtape.com';

  const ROUTES = {
    home: '/',
    music: '/music',
    podcast: '/podcast',
    crates: '/from-the-crates',
    mycrate: '/my-crate',
    counter: '/counter',
    about: '/about',
    contributors: '/contributors'
  };

  const TITLES = {
    home: '#TheSoulMixtape | Soul, R&B, Jazz-Funk & Crate Digging',
    music: 'Music | #TheSoulMixtape',
    podcast: 'Crate Diggers Podcast | #TheSoulMixtape',
    crates: 'From The Crates | #TheSoulMixtape',
    mycrate: 'My Crate | #TheSoulMixtape',
    counter: 'The Counter | #TheSoulMixtape',
    about: 'About | #TheSoulMixtape',
    contributors: 'Contributors | #TheSoulMixtape'
  };

  const DESCRIPTIONS = {
    home: 'Independent soul, R&B and jazz-funk: original #TheSoulMixtape music, the Crate Diggers podcast, features, radio shows and playlists.',
    music: 'Dig through original soul, R&B, jazz-funk, boogie and related music from #TheSoulMixtape.',
    podcast: 'Crate Diggers: themed Black music selections, stories and deep cuts from SoulNRnB and Grizz.',
    crates: 'Features, radio shows, playlists and discoveries selected by #TheSoulMixtape.',
    mycrate: 'Your saved #TheSoulMixtape music and podcast picks.',
    counter: 'The future home of #TheSoulMixtape physical releases and merchandise.',
    about: 'About #TheSoulMixtape, SoulNRnB, Grizz and the music behind the project.',
    contributors: 'Private contributor access for #TheSoulMixtape.'
  };

  let articleRows = [];
  let articleIndexPromise = null;
  let initialArticleOpened = false;

  function meta(name, value, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    const element = document.querySelector(selector);
    if (element) element.setAttribute('content', value);
  }

  function updateMeta(id, details = {}) {
    const isArticle = id === 'article';
    const title = isArticle && details.title
      ? `${details.title} | #TheSoulMixtape`
      : (TITLES[id] || TITLES.home);
    const description = isArticle
      ? (details.excerpt || 'A feature from #TheSoulMixtape — records, stories and discoveries from the crates.')
      : (DESCRIPTIONS[id] || DESCRIPTIONS.home);
    const canonicalPath = location.pathname || '/';

    document.title = title;
    meta('description', description);
    meta('og:type', isArticle ? 'article' : 'website', true);
    meta('og:title', title, true);
    meta('og:description', description, true);
    meta('og:url', `${PROD_ORIGIN}${canonicalPath}`, true);
    meta('twitter:title', title);
    meta('twitter:description', description);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `${PROD_ORIGIN}${canonicalPath}`;

    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      robots.content = id === 'contributors' || id === 'mycrate'
        ? 'noindex,nofollow'
        : 'index,follow,max-image-preview:large';
    }
  }

  function updateNav(id) {
    document.querySelectorAll('#nav [data-go]').forEach((button) => {
      if (button.dataset.go === id) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    const hamburger = document.querySelector('#hamb');
    if (hamburger) {
      hamburger.setAttribute(
        'aria-expanded',
        document.querySelector('#nav')?.classList.contains('open') ? 'true' : 'false'
      );
    }
  }

  function goRoute(id, options = {}) {
    originalGo(id);

    if (id !== 'article') {
      const path = ROUTES[id] || '/';
      if (!options.fromHistory && location.pathname !== path) {
        const method = options.replace ? 'replaceState' : 'pushState';
        history[method]({ page: id }, '', path);
      }
      updateMeta(id);
    }

    updateNav(id === 'article' ? 'crates' : id);
  }

  window.go = goRoute;

  document.querySelectorAll('[data-go]').forEach((element) => {
    const id = element.dataset.go;
    if (!id) return;
    element.onclick = (event) => {
      if (element.tagName === 'A') event.preventDefault();
      goRoute(id);
    };
  });

  async function ensureArticleIndex() {
    if (articleRows.length) return articleRows;
    if (articleIndexPromise) return articleIndexPromise;

    articleIndexPromise = fetch(
      `${SUPABASE_URL}/rest/v1/articles?status=eq.published&select=id,title,slug,excerpt&order=published_at.desc.nullslast`,
      { headers: { apikey: SUPABASE_KEY } }
    ).then(async (response) => {
      if (!response.ok) throw new Error('Could not load article routes');
      articleRows = await response.json();
      return articleRows;
    }).catch(() => []);

    return articleIndexPromise;
  }

  function setArticleRoute(row) {
    if (!row?.slug) return;
    const path = `/from-the-crates/${encodeURIComponent(row.slug)}`;
    if (location.pathname !== path) {
      history.pushState({ page: 'article', slug: row.slug }, '', path);
    }
    updateMeta('article', row);
    updateNav('crates');
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-open-article]');
    if (!trigger) return;

    const id = String(trigger.dataset.openArticle || '');
    const known = articleRows.find((row) => String(row.id) === id);

    if (known) {
      setArticleRoute(known);
      return;
    }

    void ensureArticleIndex().then((rows) => {
      const row = rows.find((candidate) => String(candidate.id) === id);
      if (row) setArticleRoute(row);
    });
  }, true);

  function clickArticleWhenReady(id) {
    if (!id || initialArticleOpened) return;

    const findAndOpen = () => {
      const trigger = document.querySelector(`[data-open-article="${id}"]`);
      if (!trigger) return false;
      initialArticleOpened = true;
      trigger.click();
      return true;
    };

    if (findAndOpen()) return;

    const root = document.querySelector('#featureList') || document.body;
    const observer = new MutationObserver(() => {
      if (findAndOpen()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }

  function routeFromLocation() {
    const path = decodeURIComponent(location.pathname || '/').replace(/\/+$/, '') || '/';
    const route = Object.entries(ROUTES).find(([, value]) => value === path);

    if (route) {
      goRoute(route[0], { fromHistory: true });
      return;
    }

    const articleMatch = path.match(/^\/from-the-crates\/([a-z0-9-]+)$/i);
    if (articleMatch) {
      originalGo('crates');
      updateNav('crates');
      updateMeta('article', { title: 'From The Crates' });

      const initial = window.__TSM_INITIAL_ARTICLE__;
      if (
        initial?.id &&
        String(initial.slug || '').toLowerCase() === articleMatch[1].toLowerCase()
      ) {
        clickArticleWhenReady(String(initial.id));
      } else {
        void ensureArticleIndex().then((rows) => {
          const row = rows.find(
            (candidate) =>
              String(candidate.slug || '').toLowerCase() === articleMatch[1].toLowerCase()
          );
          if (row) clickArticleWhenReady(String(row.id));
        });
      }
      return;
    }

    goRoute('home', { fromHistory: true, replace: true });
  }

  addEventListener('popstate', () => {
    initialArticleOpened = false;
    routeFromLocation();
  });

  const hamburger = document.querySelector('#hamb');
  if (hamburger) {
    hamburger.type = 'button';
    hamburger.setAttribute('aria-label', 'Open navigation');
    hamburger.setAttribute('aria-controls', 'nav');
    hamburger.setAttribute('aria-expanded', 'false');

    const oldHamburger = hamburger.onclick;
    hamburger.onclick = (event) => {
      if (oldHamburger) oldHamburger.call(hamburger, event);
      const open = document.querySelector('#nav')?.classList.contains('open');
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      hamburger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
  }

  const drawer = document.querySelector('#drawer');
  const queue = document.querySelector('#queue');
  const close = document.querySelector('#close');

  if (drawer) drawer.setAttribute('aria-label', 'Up next');

  if (queue) {
    queue.setAttribute('aria-controls', 'drawer');
    queue.setAttribute('aria-expanded', 'false');
    const oldQueue = queue.onclick;
    queue.onclick = (event) => {
      if (oldQueue) oldQueue.call(queue, event);
      queue.setAttribute('aria-expanded', 'true');
    };
  }

  if (close) {
    close.type = 'button';
    close.setAttribute('aria-label', 'Close queue');
    const oldClose = close.onclick;
    close.onclick = (event) => {
      if (oldClose) oldClose.call(close, event);
      if (queue) queue.setAttribute('aria-expanded', 'false');
    };
  }

  const lightbox = document.querySelector('#lightbox');
  const lightboxClose = document.querySelector('#lbclose');

  if (lightbox) {
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Expanded thank-you image');
  }

  if (lightboxClose) {
    lightboxClose.type = 'button';
    lightboxClose.setAttribute('aria-label', 'Close image');
  }

  const learn = document.querySelector('#learn');
  if (learn) {
    learn.onclick = () => {
      goRoute('about');
      setTimeout(() => document.querySelector('#ai')?.scrollIntoView(), 50);
    };
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    lightbox?.classList.remove('on');
    drawer?.classList.remove('on');
    document.querySelector('#nav')?.classList.remove('open');

    if (queue) queue.setAttribute('aria-expanded', 'false');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation');
    }
  });

  document.querySelectorAll('button:not([type])').forEach((button) => {
    button.setAttribute('type', 'button');
  });

  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.setAttribute('rel', 'noopener noreferrer');
  });

  function tuneImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    img.decoding = 'async';
    if (!img.closest('.head') && !img.closest('.heroart')) img.loading = 'lazy';
  }

  document.querySelectorAll('img').forEach(tuneImage);

  const imageObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('img')) tuneImage(node);
        node.querySelectorAll?.('img').forEach(tuneImage);
      });
    });
  });
  imageObserver.observe(document.body, { childList: true, subtree: true });

  if (
    location.hostname === 'thesoulmixtape.com' ||
    location.hostname === 'www.thesoulmixtape.com'
  ) {
    window.va =
      window.va ||
      function () {
        (window.vaq = window.vaq || []).push(arguments);
      };
    const analytics = document.createElement('script');
    analytics.defer = true;
    analytics.src = '/_vercel/insights/script.js';
    document.head.appendChild(analytics);

    window.si =
      window.si ||
      function () {
        (window.siq = window.siq || []).push(arguments);
      };
    const speed = document.createElement('script');
    speed.defer = true;
    speed.src = '/_vercel/speed-insights/script.js';
    document.head.appendChild(speed);
  }

  void ensureArticleIndex();
  routeFromLocation();
})();
