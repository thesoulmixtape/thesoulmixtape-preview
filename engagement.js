(() => {
  'use strict';

  const sb = window.tsmSupabase;
  if (!sb) return;

  const VISITOR_KEY = 'tsm-visitor-v1';
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];

  const esc = (v = '') =>
    String(v ?? '').replace(
      /[&<>"']/g,
      ch =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[ch]
    );

  function visitorId() {
    let id = '';

    try {
      id = localStorage.getItem(VISITOR_KEY) || '';
    } catch {}

    if (UUID_RE.test(id)) return id;

    id = crypto.randomUUID ? crypto.randomUUID() : '';

    if (!UUID_RE.test(id)) return '';

    try {
      localStorage.setItem(VISITOR_KEY, id);
    } catch {}

    return id;
  }

  const visitor = visitorId();
  if (!visitor) return;

  const style = document.createElement('style');
  style.id = 'engagement-v4412';

  style.textContent = `
    .eng-dig-card{
      position:absolute;
      left:10px;
      top:10px;
      z-index:4;
      border:1px solid #fff;
      background:#111d;
      color:#fff;
      border-radius:999px;
      padding:7px 9px;
      font:700 9px Arial,sans-serif;
      letter-spacing:.06em;
      cursor:pointer;
      box-shadow:0 4px 12px #0007
    }

    .eng-dig-card.dug,
    .eng-dig.dug{
      background:var(--gold);
      color:#111;
      border-color:var(--gold)
    }

    .eng-dig-card:disabled,
    .eng-dig:disabled{
      opacity:.65;
      cursor:wait
    }

    .analytics-toolbar{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      align-items:center;
      margin:-5px 0 20px
    }

    .analytics-period{
      border:1px solid #514529;
      background:#14110d;
      color:#cbbfa9;
      border-radius:999px;
      padding:8px 11px;
      font-size:9px;
      text-transform:uppercase;
      letter-spacing:.08em;
      cursor:pointer
    }

    .analytics-period.active{
      border-color:var(--gold);
      color:var(--gold)
    }

    .analytics-grid{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:10px;
      margin:0 0 22px
    }

    .analytics-stat{
      border:1px solid #40361f;
      border-radius:11px;
      padding:15px;
      background:#15120e;
      min-width:0
    }

    .analytics-stat span{
      display:block;
      color:#958a79;
      text-transform:uppercase;
      letter-spacing:.09em;
      font-size:8px;
      margin-bottom:6px
    }

    .analytics-stat strong{
      display:block;
      color:var(--cream);
      font:700 29px Georgia,serif
    }

    .analytics-sections{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:14px
    }

    .analytics-box{
      border:1px solid #40361f;
      border-radius:11px;
      padding:16px;
      background:#15120e;
      min-width:0
    }

    .analytics-box h3{
      font:700 23px Georgia,serif;
      margin:0 0 12px
    }

    .analytics-list{
      display:grid;
      gap:8px
    }

    .analytics-row{
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:12px;
      align-items:center;
      padding:8px 0;
      border-bottom:1px solid #302919
    }

    .analytics-row:last-child{
      border-bottom:0
    }

    .analytics-row b{
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      font-size:12px
    }

    .analytics-row span{
      color:var(--gold);
      font-weight:700;
      font-size:12px
    }

    .analytics-empty{
      color:#8f8473;
      font-size:11px;
      line-height:1.5
    }

    .analytics-note{
      color:#8f8473;
      font-size:10px;
      line-height:1.5;
      margin:8px 0 0
    }

    @media(max-width:850px){
      .analytics-grid{
        grid-template-columns:1fr 1fr
      }

      .analytics-sections{
        grid-template-columns:1fr
      }

      .eng-dig-card{
        left:7px;
        top:7px;
        padding:6px 8px;
        font-size:8px
      }
    }
  `;

  document.head.appendChild(style);

  function mediaInfo(id) {
    if (!UUID_RE.test(String(id || ''))) return null;

    let item = null;

    try {
      if (typeof get === 'function') item = get(String(id));
    } catch {}

    if (!item) {
      try {
        if (typeof items !== 'undefined' && Array.isArray(items)) {
          item = items.find(x => String(x[0]) === String(id));
        }
      } catch {}
    }

    return {
      id: String(id),
      type: item?.[5] === 'pod' ? 'podcast' : 'music',
      title: item?.[1] || ''
    };
  }

  function currentPagePath() {
    const active = qs('.page.on');
    const id = active?.id || 'home';

    if (id === 'track') return '/music/track';
    if (id === 'contributors') return '/contributors';

    return id === 'home' ? '/' : `/${id}`;
  }

  async function recordEvent(eventType, media = null) {
    const row = {
      visitor_id: visitor,
      event_type: eventType,
      page_path: currentPagePath()
    };

    if (media) {
      row.media_type = media.type;
      row.media_id = media.id;
    }

    try {
      const { error } = await sb
        .from('engagement_events')
        .insert(row);

      if (error) {
        console.warn(
          'Engagement event was not recorded:',
          error.message
        );
      }
    } catch (error) {
      console.warn(
        'Engagement event was not recorded:',
        error
      );
    }
  }

  let lastPage = '';
  let lastPageAt = 0;

  function recordPageView() {
    const path = currentPagePath();
    const now = Date.now();

    if (
      path === lastPage &&
      now - lastPageAt < 1500
    ) {
      return;
    }

    lastPage = path;
    lastPageAt = now;

    recordEvent('page_view');
  }

  const playedRecently = new Map();

  function recordPlay(id) {
    const media = mediaInfo(id);
    if (!media) return;

    const now = Date.now();
    const key = `${media.type}:${media.id}`;

    if (
      now - (playedRecently.get(key) || 0) <
      30000
    ) {
      return;
    }

    playedRecently.set(key, now);
    recordEvent('play', media);
  }

  function installPlayTracking() {
    const base = window.play;

    if (
      typeof base !== 'function' ||
      base.__tsmEngagement
    ) {
      return;
    }

    const wrapped = function (id) {
      const result = base.apply(this, arguments);
      recordPlay(id);
      return result;
    };

    wrapped.__tsmEngagement = true;
    window.play = wrapped;
  }

  function installSaveTracking() {
    if (
      Storage.prototype.setItem.__tsmEngagement
    ) {
      return;
    }

    const base = Storage.prototype.setItem;

    function wrapped(key, value) {
      let before = [];

      if (
        this === localStorage &&
        key === 'crate'
      ) {
        try {
          before = JSON.parse(
            this.getItem(key) || '[]'
          );

          if (!Array.isArray(before)) {
            before = [];
          }
        } catch {
          before = [];
        }
      }

      const result = base.apply(
        this,
        arguments
      );

      if (
        this === localStorage &&
        key === 'crate'
      ) {
        let after = [];

        try {
          after = JSON.parse(
            String(value) || '[]'
          );

          if (!Array.isArray(after)) {
            after = [];
          }
        } catch {
          after = [];
        }

        after
          .filter(
            id =>
              !before.some(
                old =>
                  String(old) ===
                  String(id)
              )
          )
          .forEach(id => {
            const media =
              mediaInfo(id);

            if (media) {
              recordEvent(
                'save',
                media
              );
            }
          });
      }

      return result;
    }

    wrapped.__tsmEngagement = true;
    Storage.prototype.setItem = wrapped;
  }

  async function getDigState(media) {
    if (!media) return null;

    const { data, error } =
      await sb.rpc('get_dig_state', {
        p_media_type: media.type,
        p_media_id: media.id,
        p_visitor_id: visitor
      });

    if (error) return null;

    return Array.isArray(data)
      ? data[0]
      : data;
  }

  async function toggleDig(
    button,
    media
  ) {
    if (
      !media ||
      button.disabled
    ) {
      return;
    }

    button.disabled = true;

    const { data, error } =
      await sb.rpc('toggle_dig', {
        p_media_type: media.type,
        p_media_id: media.id,
        p_visitor_id: visitor
      });

    button.disabled = false;

    if (error) {
      console.warn(
        'Dig It could not be updated:',
        error.message
      );
      return;
    }

    const state =
      Array.isArray(data)
        ? data[0]
        : data;

    applyDigState(
      button,
      state
    );
  }

  function applyDigState(
    button,
    state
  ) {
    if (!button || !state) return;

    const count =
      Number(state.dig_count) || 0;

    const dug = !!state.dug;

    button.classList.toggle(
      'dug',
      dug
    );

    button.textContent =
      `${dug ? 'Dug ✓' : 'Dig It'}` +
      `${count ? ` · ${count}` : ''}`;

    button.setAttribute(
      'aria-pressed',
      dug ? 'true' : 'false'
    );
  }

  function bindDigButton(
    button,
    media
  ) {
    if (
      !button ||
      !media ||
      button.dataset.engBound === 'yes'
    ) {
      return;
    }

    button.dataset.engBound = 'yes';
    button.dataset.mediaId = media.id;
    button.dataset.mediaType = media.type;

    button.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();

        toggleDig(
          button,
          media
        );
      }
    );

    getDigState(media).then(
      state =>
        applyDigState(
          button,
          state
        )
    );
  }

  function decorateMusicCards() {
    qsa('.cover[data-play]').forEach(
      cover => {
        const media =
          mediaInfo(
            cover.dataset.play
          );

        if (
          !media ||
          media.type !== 'music' ||
          qs(
            '.eng-dig-card',
            cover
          )
        ) {
          return;
        }

        const btn =
          document.createElement(
            'button'
          );

        btn.type = 'button';
        btn.className =
          'eng-dig-card';

        btn.textContent =
          'Dig It';

        btn.setAttribute(
          'aria-label',
          'Dig this track'
        );

        cover.appendChild(btn);

        bindDigButton(
          btn,
          media
        );
      }
    );
  }

  function decorateTrackDetail() {
    const actions =
      qs('.track-actions');

    if (
      !actions ||
      qs('#trackDig', actions)
    ) {
      return;
    }

    const id =
      new URL(
        location.href
      ).searchParams.get('track');

    const media =
      mediaInfo(id);

    if (!media) return;

    const share =
      qs(
        '#trackShare',
        actions
      );

    const btn =
      document.createElement(
        'button'
      );

    btn.type = 'button';
    btn.className =
      'btn eng-dig';

    btn.id = 'trackDig';
    btn.textContent = 'Dig It';

    btn.setAttribute(
      'aria-label',
      'Dig this track'
    );

    if (share) {
      actions.insertBefore(
        btn,
        share
      );
    } else {
      actions.appendChild(btn);
    }

    bindDigButton(
      btn,
      media
    );
  }

  async function sharePodcast(
    media,
    title
  ) {
    const url =
      `${location.origin}` +
      `${location.pathname}`;

    const payload = {
      title:
        `${title ||
          'Crate Diggers Podcast'}` +
        ' — #TheSoulMixtape',

      text:
        `Listen to ${
          title ||
          'Crate Diggers Podcast'
        } on #TheSoulMixtape.`,

      url
    };

    try {
      if (navigator.share) {
        await navigator.share(
          payload
        );
      } else if (
        navigator.clipboard
          ?.writeText
      ) {
        await navigator.clipboard
          .writeText(url);
      } else {
        window.prompt(
          'Copy this link:',
          url
        );
      }

      recordEvent(
        'share',
        media
      );
    } catch (error) {
      if (
        error?.name !==
        'AbortError'
      ) {
        console.warn(
          'Podcast share failed:',
          error
        );
      }
    }
  }

  function decoratePodcastCards() {
    qsa('.episode-card').forEach(
      card => {
        const play =
          qs(
            '[data-play]',
            card
          );

        const actions =
          qs(
            '.episode-actions',
            card
          );

        const media =
          mediaInfo(
            play?.dataset.play
          );

        if (
          !media ||
          media.type !==
            'podcast' ||
          !actions
        ) {
          return;
        }

        if (
          !qs(
            '.eng-dig',
            actions
          )
        ) {
          const dig =
            document.createElement(
              'button'
            );

          dig.type = 'button';
          dig.className =
            'btn eng-dig';

          dig.textContent =
            'Dig It';

          actions.appendChild(
            dig
          );

          bindDigButton(
            dig,
            media
          );
        }

        if (
          !qs(
            '.eng-share',
            actions
          )
        ) {
          const share =
            document.createElement(
              'button'
            );

          share.type =
            'button';

          share.className =
            'btn eng-share';

          share.textContent =
            'Share';

          share.addEventListener(
            'click',
            event => {
              event.preventDefault();
              event.stopPropagation();

              sharePodcast(
                media,
                qs(
                  'h3',
                  card
                )?.textContent ||
                  ''
              );
            }
          );

          actions.appendChild(
            share
          );
        }
      }
    );
  }

  function decorate() {
    decorateMusicCards();
    decorateTrackDetail();
    decoratePodcastCards();
  }

    document.addEventListener(
    'click',
    event => {
      const share =
        event.target.closest(
          '#trackShare, .eng-share'
        );

      if (!share) return;

      let media = null;

      if (share.id === 'trackShare') {
        const id =
          new URL(
            location.href
          ).searchParams.get(
            'track'
          );

        media = mediaInfo(id);
      } else {
        const card =
          share.closest(
            '.episode-card'
          );

        const play =
          card
            ? qs(
                '[data-play]',
                card
              )
            : null;

        media =
          mediaInfo(
            play?.dataset.play
          );
      }

      if (media) {
        recordEvent(
          'share',
          media
        );
      }
    },
    true
  );

  function installNavigationTracking() {
  document.addEventListener(
    'click',
    event => {
      const nav =
        event.target.closest('[data-go]');

      if (!nav) return;

      setTimeout(() => {
        recordPageView();
        decorate();
      }, 50);
    },
    true
  );

  window.addEventListener(
    'popstate',
    () => {
      setTimeout(() => {
        recordPageView();
        decorate();
      }, 50);
    }
  );
}

  function nicePage(path) {
    const map = {
      '/': 'Home',
      '/music': 'Music',
      '/music/track':
        'Track detail',
      '/crates':
        'From The Crates',
      '/mycrate': 'My Crate',
      '/counter':
        'The Counter',
      '/about': 'About',
      '/contributors':
        'Contributors'
    };

    return (
      map[path] ||
      path ||
      'Unknown'
    );
  }

  function mediaName(
    id,
    type,
    trackMap,
    podMap
  ) {
    if (type === 'music') {
      return (
        trackMap.get(
          String(id)
        ) || 'Track'
      );
    }

    return (
      podMap.get(
        String(id)
      ) ||
      'Podcast episode'
    );
  }

  function topRows(
    events,
    eventType,
    mediaType,
    trackMap,
    podMap
  ) {
    const counts =
      new Map();

    events
      .filter(
        e =>
          e.event_type ===
            eventType &&
          (!mediaType ||
            e.media_type ===
              mediaType) &&
          e.media_id
      )
      .forEach(e => {
        const key =
          String(
            e.media_id
          );

        counts.set(
          key,
          (counts.get(key) ||
            0) + 1
        );
      });

    return [
      ...counts.entries()
    ]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 5)
      .map(
        ([id, count]) => ({
          name: mediaName(
            id,
            mediaType,
            trackMap,
            podMap
          ),
          count
        })
      );
  }
  function topDigs(
    digs,
    mediaType,
    trackMap,
    podMap
  ) {
    const counts = new Map();

    digs
      .filter(
        d =>
          d.media_type === mediaType &&
          d.media_id
      )
      .forEach(d => {
        const key = String(d.media_id);

        counts.set(
          key,
          (counts.get(key) || 0) + 1
        );
      });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        name: mediaName(
          id,
          mediaType,
          trackMap,
          podMap
        ),
        count
      }));
  }
  function listHtml(rows) {
    if (!rows.length) {
      return (
        '<div class="analytics-empty">' +
        'No activity recorded for this period yet.' +
        '</div>'
      );
    }

    return (
      '<div class="analytics-list">' +
      rows
        .map(
          r =>
            `<div class="analytics-row">` +
            `<b title="${esc(
              r.name
            )}">${esc(
              r.name
            )}</b>` +
            `<span>${r.count}</span>` +
            `</div>`
        )
        .join('') +
      '</div>'
    );
  }

  function periodStart(period) {
    const now = new Date();

    if (
      period === 'today'
    ) {
      const d =
        new Date(now);

      d.setHours(
        0,
        0,
        0,
        0
      );

      return d.toISOString();
    }

    if (period === '7') {
      return new Date(
        Date.now() -
          7 * 86400000
      ).toISOString();
    }

    if (period === '30') {
      return new Date(
        Date.now() -
          30 * 86400000
      ).toISOString();
    }

    return '';
  }

  let analyticsPeriod =
    '30';

  async function loadAnalytics() {
    const root =
      qs('#analyticsBody');

    if (!root) return;

    root.innerHTML =
      '<div class="analytics-empty">Loading analytics…</div>';

    let eventQuery =
      sb
        .from(
          'engagement_events'
        )
        .select(
          'event_type,media_type,media_id,page_path,visitor_id,created_at'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(10000);

    let digQuery =
      sb
        .from(
          'content_digs'
        )
        .select(
          'media_type,media_id,visitor_id,created_at'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(10000);

    const start =
      periodStart(
        analyticsPeriod
      );

    if (start) {
      eventQuery =
        eventQuery.gte(
          'created_at',
          start
        );

      digQuery =
        digQuery.gte(
          'created_at',
          start
        );
    }

    const [
      eventsRes,
      digsRes,
      tracksRes,
      podsRes
    ] = await Promise.all([
      eventQuery,
      digQuery,

      sb
        .from('tracks')
        .select(
          'id,title,artist'
        ),

      sb
        .from(
          'podcast_episodes'
        )
        .select('id,title')
    ]);

    if (
      eventsRes.error ||
      digsRes.error
    ) {
      root.innerHTML =
        `<div class="analytics-empty">` +
        `Could not load analytics. ` +
        `${esc(
          eventsRes.error
            ?.message ||
            digsRes.error
              ?.message ||
            ''
        )}</div>`;

      return;
    }

    const events =
      eventsRes.data || [];

    const digs =
      digsRes.data || [];

    const trackMap =
      new Map(
        (
          tracksRes.data ||
          []
        ).map(x => [
          String(x.id),
          `${x.title}${
            x.artist
              ? ` — ${x.artist}`
              : ''
          }`
        ])
      );

    const podMap =
      new Map(
        (
          podsRes.data ||
          []
        ).map(x => [
          String(x.id),
          x.title
        ])
      );

    const pageViews =
      events.filter(
        e =>
          e.event_type ===
          'page_view'
      );

    const visitors =
      new Set(
        pageViews
          .map(
            e =>
              e.visitor_id
          )
          .filter(Boolean)
      ).size;

    const musicPlays =
      events.filter(
        e =>
          e.event_type ===
            'play' &&
          e.media_type ===
            'music'
      ).length;

    const podcastPlays =
      events.filter(
        e =>
          e.event_type ===
            'play' &&
          e.media_type ===
            'podcast'
      ).length;

    const saves =
      events.filter(
        e =>
          e.event_type ===
          'save'
      ).length;

    const shares =
      events.filter(
        e =>
          e.event_type ===
          'share'
      ).length;

    const pageCounts =
      new Map();

    pageViews.forEach(e => {
      const k =
        e.page_path || '/';

      pageCounts.set(
        k,
        (pageCounts.get(k) ||
          0) + 1
      );
    });

    const pages = [
      ...pageCounts.entries()
    ]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 5)
      .map(
        ([path, count]) => ({
          name: nicePage(
            path
          ),
          count
        })
      );

    const topMusic =
      topRows(
        events,
        'play',
        'music',
        trackMap,
        podMap
      );

    const topPods =
      topRows(
        events,
        'play',
        'podcast',
        trackMap,
        podMap
      );
    const topDugMusic =
      topDigs(
        digs,
        'music',
        trackMap,
        podMap
      );

    const topDugPods =
      topDigs(
        digs,
        'podcast',
        trackMap,
        podMap
      );
    root.innerHTML = `
      <div class="analytics-grid">

        <div class="analytics-stat">
          <span>Visitors</span>
          <strong>${visitors}</strong>
        </div>

        <div class="analytics-stat">
          <span>Page views</span>
          <strong>${pageViews.length}</strong>
        </div>

        <div class="analytics-stat">
          <span>Music plays</span>
          <strong>${musicPlays}</strong>
        </div>

        <div class="analytics-stat">
          <span>Podcast plays</span>
          <strong>${podcastPlays}</strong>
        </div>

        <div class="analytics-stat">
          <span>Total plays</span>
          <strong>${musicPlays + podcastPlays}</strong>
        </div>

        <div class="analytics-stat">
          <span>My Crate saves</span>
          <strong>${saves}</strong>
        </div>

        <div class="analytics-stat">
          <span>Shares</span>
          <strong>${shares}</strong>
        </div>

        <div class="analytics-stat">
          <span>Dig Its</span>
          <strong>${digs.length}</strong>
        </div>

      </div>

      <div class="analytics-sections">

        <div class="analytics-box">
          <h3>Most visited pages</h3>
          ${listHtml(pages)}
        </div>

        <div class="analytics-box">
          <h3>Most played tracks</h3>
          ${listHtml(topMusic)}
        </div>

        <div class="analytics-box">
          <h3>Most played podcast episodes</h3>
          ${listHtml(topPods)}
        </div>
        <div class="analytics-box">
          <h3>Most dug tracks</h3>
          ${listHtml(topDugMusic)}
        </div>

        <div class="analytics-box">
          <h3>Most dug podcast episodes</h3>
          ${listHtml(topDugPods)}
        </div>
        <div class="analytics-box">
          <h3>What this measures</h3>

          <div class="analytics-empty">
            Anonymous first-party activity on
            #TheSoulMixtape: page visits,
            media plays, My Crate saves,
            shares and Dig It reactions.
            No names, email addresses or
            IP addresses are stored in this
            engagement table.
          </div>

          <p class="analytics-note">
            Figures begin from the deployment
            of v44.12; they do not reconstruct
            earlier listening activity.
          </p>
        </div>

      </div>
    `;
  }

  function ensureAnalyticsPanel() {
    const dash =
      qs(
        '#contributorDashboard'
      );

    const tabs =
      qs(
        '.dash-tabs',
        dash
      );

    if (
      !dash ||
      !tabs ||
      qs('#analyticsPanel')
    ) {
      return;
    }

    const tab =
      document.createElement(
        'button'
      );

    tab.type = 'button';
    tab.className =
      'dash-tab';

    tab.dataset.dash =
      'analyticsPanel';

    tab.textContent =
      'Analytics';

    const contentTab =
      qs(
        '[data-dash="contentPanel"]',
        tabs
      );

    if (contentTab) {
      contentTab.insertAdjacentElement(
        'afterend',
        tab
      );
    } else {
      tabs.appendChild(tab);
    }

    const panel =
      document.createElement(
        'section'
      );

    panel.className =
      'dash-panel';

    panel.id =
      'analyticsPanel';

    panel.innerHTML = `
      <div class="dash-content-head">

        <h2>Analytics</h2>

        <button
          class="btn"
          id="analyticsRefresh"
          type="button"
        >
          Refresh
        </button>

      </div>

      <div
        class="analytics-toolbar"
        aria-label="Analytics period"
      >

        <button
          class="analytics-period"
          data-period="today"
        >
          Today
        </button>

        <button
          class="analytics-period"
          data-period="7"
        >
          7 days
        </button>

        <button
          class="analytics-period active"
          data-period="30"
        >
          30 days
        </button>

        <button
          class="analytics-period"
          data-period="all"
        >
          All time
        </button>

      </div>

      <div id="analyticsBody">
        <div class="analytics-empty">
          Open Analytics to load activity.
        </div>
      </div>
    `;

    const account =
      qs(
        '#accountPanel',
        dash
      );

    if (account) {
      dash.insertBefore(
        panel,
        account
      );
    } else {
      dash.appendChild(
        panel
      );
    }

    tab.addEventListener(
      'click',
      () => {
        qsa(
          '.dash-tab',
          dash
        ).forEach(
          x =>
            x.classList.toggle(
              'active',
              x === tab
            )
        );

        qsa(
          '.dash-panel',
          dash
        ).forEach(
          x =>
            x.classList.toggle(
              'on',
              x === panel
            )
        );

        loadAnalytics();
      }
    );

    qs(
      '#analyticsRefresh',
      panel
    ).addEventListener(
      'click',
      loadAnalytics
    );

    qsa(
      '.analytics-period',
      panel
    ).forEach(
      btn =>
        btn.addEventListener(
          'click',
          () => {
            analyticsPeriod =
              btn.dataset.period;

            qsa(
              '.analytics-period',
              panel
            ).forEach(
              x =>
                x.classList.toggle(
                  'active',
                  x === btn
                )
            );

            loadAnalytics();
          }
        )
    );
  }

  function boot() {
    installPlayTracking();
    installSaveTracking();
    installNavigationTracking();
    ensureAnalyticsPanel();
    decorate();
    recordPageView();

    const observer =
      new MutationObserver(
        () => {
          decorate();
          ensureAnalyticsPanel();
          installPlayTracking();
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
