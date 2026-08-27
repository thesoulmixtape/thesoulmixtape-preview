(() => {
  'use strict';

  const STORAGE_KEY = 'tsm-podcast-progress-v1';
  const TRACK_PARAM = 'track';

  const style = document.createElement('style');
  style.id = 'listening-v448';
  style.textContent = `
    /* v44.8 — Listening Experience */
    .track-open-title{cursor:pointer}
    .track-open-title:after{content:" ↗";color:var(--gold);font:700 10px Arial,sans-serif}
    .track-open-title:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:2px}
    #track{min-height:65vh}
    .track-view{padding:34px 0 70px}
    .track-back{margin:0 0 28px}
    .track-detail{display:grid;grid-template-columns:minmax(280px,520px) minmax(0,1fr);gap:clamp(32px,6vw,76px);align-items:center}
    .track-detail-art{width:100%;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#211b13;box-shadow:0 24px 54px #000a;border:1px solid #4c4027}
    .track-detail-art img{display:block;width:100%;height:100%;object-fit:cover}
    .track-detail-copy{min-width:0}
    .track-detail-copy h1{font:700 clamp(48px,7vw,82px)/.98 Georgia,serif;margin:8px 0 13px;overflow-wrap:anywhere}
    .track-artist{font:700 clamp(23px,3vw,34px) Georgia,serif;margin:0 0 11px;color:#d7cab2}
    .track-meta-line{color:#a99d89;text-transform:uppercase;letter-spacing:.13em;font-size:10px;margin:0 0 26px}
    .track-actions{display:flex;gap:9px;flex-wrap:wrap}
    .track-actions .btn.primary{background:var(--gold);color:#111}
    .track-actions .btn.saved{background:#1e1a10}
    .track-share-note{min-height:18px;margin:12px 0 0;color:#9f9482;font-size:11px}
    .track-more{margin-top:62px;padding-top:36px;border-top:1px solid var(--line)}
    .track-more-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:18px}
    .track-more-head h2{font:700 clamp(32px,4vw,44px) Georgia,serif;margin:0}
    .track-more-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px}
    .track-more-card{min-width:0}
    .track-more-art{width:100%;aspect-ratio:1;border:0;padding:0;border-radius:7px;overflow:hidden;background:#211b13;cursor:pointer;box-shadow:0 14px 28px #0007}
    .track-more-art img{width:100%;height:100%;object-fit:cover;display:block}
    .track-more-card h3{font:700 20px/1.08 Georgia,serif;margin:12px 0 5px;overflow-wrap:anywhere}
    .track-more-card p{margin:0 0 9px;color:#9f9482;font-size:10px;line-height:1.4}
    .track-more-actions{display:flex;gap:6px;flex-wrap:wrap}
    .track-more-actions .btn{padding:7px 8px;font-size:7px}
    .track-missing{max-width:650px;margin:60px auto;text-align:center;border:1px solid var(--line);border-radius:14px;padding:34px}
    .track-missing h2{font:700 35px Georgia,serif;margin:0 0 10px}
    .track-missing p{color:#a99d89;line-height:1.55}
    .listening-toast{position:fixed;left:50%;bottom:155px;z-index:85;transform:translate(-50%,14px);opacity:0;pointer-events:none;background:#17130ef8;border:1px solid var(--gold);color:var(--cream);padding:10px 14px;border-radius:9px;font-size:11px;box-shadow:0 12px 30px #000a;transition:.18s;max-width:calc(100vw - 28px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .listening-toast.on{opacity:1;transform:translate(-50%,0)}
    .queue-summary{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:5px 0 12px;border-bottom:1px solid #3f351f;margin-bottom:3px}
    .queue-summary span{color:#9f9482;font-size:10px;text-transform:uppercase;letter-spacing:.1em}
    .queue-clear{border:0;background:none;color:var(--gold);font-size:9px;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;padding:7px}
    .qitem.v448{display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;align-items:center;padding:11px 0}
    .qthumb{width:52px;height:52px;border-radius:6px;overflow:hidden;background:#211b13}
    .qthumb img{width:100%;height:100%;object-fit:cover;display:block}
    .qcopy{min-width:0}
    .qcopy b{display:block;font:700 16px/1.05 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .qcopy small{display:block;color:#8f8473;font-size:9px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .qactions{display:flex;gap:5px;margin-top:7px}
    .qactions button{border:1px solid #5e512f;background:none;color:#cbbfa9;border-radius:5px;padding:5px 7px;font-size:7px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}
    .qactions button:last-child{color:#e2aa9d;border-color:#714139}
    .mobile-queue-btn{display:none!important}
    .pod-skip-row{display:none;align-items:center;justify-content:center;gap:9px;padding:0 3vw 7px}
    body.tsm-podcast-active .pod-skip-row{display:flex}
    body.tsm-podcast-active .drawer{bottom:142px}
    .pod-skip-row button{border:1px solid #5e512f;background:#17130e;color:var(--cream);border-radius:999px;padding:6px 11px;font-size:9px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}
    .podcast-resume-note{display:block;margin-top:5px;color:var(--gold);font-size:9px;text-transform:uppercase;letter-spacing:.09em}
    .episode-actions .pod-start-over{border-color:#5e512f;color:#b9ad9a}
    #nowCover.listening-open,#nowTitle.listening-open{cursor:pointer}
    #nowTitle.listening-open{text-decoration:underline;text-decoration-color:#a8985866;text-underline-offset:3px}
    @media(max-width:850px){
      body.tsm-podcast-active{padding-bottom:156px}
      .track-view{padding:24px 0 52px}
      .track-detail{grid-template-columns:1fr;gap:25px}
      .track-detail-art{width:min(100%,520px);margin:auto}
      .track-detail-copy h1{font-size:47px}
      .track-actions .btn{flex:1 1 calc(50% - 6px);text-align:center;padding:10px 8px;font-size:8px}
      .track-more{margin-top:42px;padding-top:28px}
      .track-more-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .track-more-card h3{font-size:18px}
      .listening-toast{bottom:128px}
      body.tsm-podcast-active .listening-toast{bottom:162px}
      .mobile-queue-btn{display:inline-flex!important;position:relative;align-items:center;justify-content:center;border:0!important;background:none!important;color:var(--cream)!important;font-size:18px!important;padding:4px!important}
      .mobile-queue-btn span{position:absolute;right:-2px;top:-2px;min-width:15px;height:15px;padding:0 3px;border-radius:999px;background:var(--gold);color:#111;font:700 8px/15px Arial,sans-serif;text-align:center}
      .drawer{top:62px;bottom:122px}
      body.tsm-podcast-active .drawer{bottom:156px}
      .pod-skip-row{padding-bottom:5px}
    }
  `;
  document.head.appendChild(style);

  const esc = (value='') => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function isPodcast(item){
    return !!item && item[5] === 'pod';
  }

  function toast(message){
    let el = document.querySelector('#listeningToast');
    if(!el){
      el = document.createElement('div');
      el.id = 'listeningToast';
      el.className = 'listening-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('on'), 1600);
  }

  function artworkHtml(item){
    if(!item) return '';
    if(item[7]) return `<img src="${esc(item[7])}" alt="${esc(item[1])}">`;
    if(isPodcast(item)) return `<img src="pod.png" alt="${esc(item[1])}">`;
    const cls = /^art[1-5]$/.test(item[5] || '') ? item[5] : 'art1';
    return `<div class="${cls}" style="width:100%;height:100%;position:relative"><span class="ctxt">${esc(item[1])}</span></div>`;
  }

  function parseTime(text){
    const parts = String(text || '').trim().split(':').map(Number);
    if(!parts.length || parts.some(n => !Number.isFinite(n))) return 0;
    if(parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if(parts.length === 2) return parts[0]*60 + parts[1];
    return parts[0] || 0;
  }

  function formatTime(seconds){
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total/3600);
    const m = Math.floor((total%3600)/60);
    const s = total%60;
    return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  }

  // ---------- Track detail pages / direct links ----------
  const main = document.querySelector('main');
  if(main && !document.querySelector('#track')){
    const section = document.createElement('section');
    section.className = 'page';
    section.id = 'track';
    section.innerHTML = `<div class="wrap track-view" id="trackView"><div class="track-missing"><h2>Loading track…</h2><p>Opening the record from the catalogue.</p></div></div>`;
    main.appendChild(section);
  }

  let activeTrackId = '';
  let routeAttempts = 0;

  function canonicalTrackUrl(id){
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set(TRACK_PARAM, id);
    return url.toString();
  }

  function setTrackUrl(id, push=true){
    const url = new URL(location.href);
    url.searchParams.set(TRACK_PARAM, id);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if(push) history.pushState({tsmTrack:true,id:String(id)}, '', next);
    else history.replaceState(history.state, '', next);
  }

  function clearTrackUrl(replace=false){
    const url = new URL(location.href);
    url.searchParams.delete(TRACK_PARAM);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if(replace) history.replaceState({}, '', next);
    else history.pushState({}, '', next);
  }

  function moreTracksFor(track){
    const same = tracks.filter(x => String(x[0]) !== String(track[0]) && x[3] === track[3]);
    const others = tracks.filter(x => String(x[0]) !== String(track[0]) && x[3] !== track[3]);
    return [...same, ...others].slice(0,4);
  }

  function updateTrackSaveButton(){
    const btn = document.querySelector('#trackSave');
    if(!btn || !activeTrackId) return;
    const yes = saved.some(id => String(id) === String(activeTrackId));
    btn.textContent = yes ? 'Saved to My Crate ✓' : 'Save to My Crate';
    btn.classList.toggle('saved', yes);
  }

  function addUpNext(id){
    if(!q.some(x => String(x) === String(id))) q.push(id);
    renderQ();
    toast('Added to Up Next');
  }

  function toggleSaved(id){
    const found = saved.some(x => String(x) === String(id));
    if(found) saved = saved.filter(x => String(x) !== String(id));
    else saved = [...saved, id];
    localStorage.setItem('crate', JSON.stringify(saved));
    if(typeof drawSaved === 'function') drawSaved();
    updateTrackSaveButton();
    toast(found ? 'Removed from My Crate' : 'Saved to My Crate');
  }

  async function shareTrack(track){
    const url = canonicalTrackUrl(track[0]);
    const payload = {
      title: `${track[1]} — ${track[2]}`,
      text: `Listen to ${track[1]} by ${track[2]} on #TheSoulMixtape.`,
      url
    };
    try{
      if(navigator.share){
        await navigator.share(payload);
        return;
      }
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(url);
        toast('Track link copied');
        return;
      }
      window.prompt('Copy this track link:', url);
    }catch(error){
      if(error?.name !== 'AbortError') toast('Could not share this track');
    }
  }

  function renderTrackPage(track){
    const root = document.querySelector('#trackView');
    if(!root || !track) return;
    activeTrackId = String(track[0]);
    const more = moreTracksFor(track);
    root.innerHTML = `
      <button class="btn track-back" type="button" id="trackBack">← Back to Music</button>
      <div class="track-detail">
        <div class="track-detail-art">${artworkHtml(track)}</div>
        <div class="track-detail-copy">
          <div class="ey">#TheSoulMixtape Records</div>
          <h1>${esc(track[1])}</h1>
          <p class="track-artist">${esc(track[2])}</p>
          <p class="track-meta-line">${esc([track[3],track[4]].filter(Boolean).join(' · '))}</p>
          <div class="track-actions">
            <button class="btn primary" type="button" id="trackPlay">▶ Play</button>
            <button class="btn" type="button" id="trackQueue">Add to Up Next</button>
            <button class="btn" type="button" id="trackSave">Save to My Crate</button>
            <button class="btn" type="button" id="trackShare">Share</button>
          </div>
          <p class="track-share-note">This track has a direct link you can bookmark or share.</p>
        </div>
      </div>
      ${more.length ? `
      <section class="track-more">
        <div class="track-more-head"><div><div class="ey">Keep digging</div><h2>More from #TheSoulMixtape</h2></div></div>
        <div class="track-more-grid">
          ${more.map(x => `
            <article class="track-more-card">
              <button class="track-more-art" type="button" data-detail-track="${esc(x[0])}" aria-label="View ${esc(x[1])}">
                ${artworkHtml(x)}
              </button>
              <h3>${esc(x[1])}</h3>
              <p>${esc([x[2],x[3],x[4]].filter(Boolean).join(' · '))}</p>
              <div class="track-more-actions">
                <button class="btn" type="button" data-play-more="${esc(x[0])}">Play</button>
                <button class="btn" type="button" data-detail-track="${esc(x[0])}">View</button>
              </div>
            </article>`).join('')}
        </div>
      </section>` : ''}
    `;

    document.querySelector('#trackBack')?.addEventListener('click', () => {
      if(history.state?.tsmTrack && history.length > 1) history.back();
      else {
        clearTrackUrl(true);
        go('music');
      }
    });
    document.querySelector('#trackPlay')?.addEventListener('click', () => window.play(track[0]));
    document.querySelector('#trackQueue')?.addEventListener('click', () => addUpNext(track[0]));
    document.querySelector('#trackSave')?.addEventListener('click', () => toggleSaved(track[0]));
    document.querySelector('#trackShare')?.addEventListener('click', () => shareTrack(track));
    root.querySelectorAll('[data-detail-track]').forEach(btn => btn.addEventListener('click', () => openTrackPage(btn.dataset.detailTrack)));
    root.querySelectorAll('[data-play-more]').forEach(btn => btn.addEventListener('click', () => window.play(btn.dataset.playMore)));
    updateTrackSaveButton();
  }

  function showMissingTrack(){
    const root = document.querySelector('#trackView');
    if(!root) return;
    activeTrackId = '';
    root.innerHTML = `
      <div class="track-missing">
        <h2>That record isn't on the shelf.</h2>
        <p>It may have been unpublished or the link may be out of date.</p>
        <button class="btn" type="button" id="missingBack">Back to Music</button>
      </div>`;
    document.querySelector('#missingBack')?.addEventListener('click', () => {
      clearTrackUrl(true);
      go('music');
    });
  }

  function openTrackPage(id, options={}){
    const track = tracks.find(x => String(x[0]) === String(id));
    if(!track){
      if(options.final) showMissingTrack();
      return false;
    }
    renderTrackPage(track);
    if(options.url !== false) setTrackUrl(track[0], options.push !== false);
    go('track');
    return true;
  }

  function syncTrackRoute(final=false){
    const id = new URLSearchParams(location.search).get(TRACK_PARAM);
    if(!id){
      if(document.querySelector('#track')?.classList.contains('on')) go('music');
      return;
    }
    if(openTrackPage(id,{url:false,push:false})) {
      routeAttempts = 0;
      return;
    }
    routeAttempts += 1;
    go('track');
    if(final || routeAttempts > 7) showMissingTrack();
  }

  window.addEventListener('popstate', () => syncTrackRoute(true));

  // Leaving a track page through the normal site navigation should also
  // remove the track query parameter so a later refresh opens the page the
  // visitor is actually looking at.
  if(typeof window.go === 'function'){
    const baseGo = window.go;
    window.go = function(id){
      if(id !== 'track' && new URLSearchParams(location.search).has(TRACK_PARAM)){
        const url = new URL(location.href);
        url.searchParams.delete(TRACK_PARAM);
        history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
      return baseGo(id);
    };
  }

  function decorateTrackCards(root){
    if(!root) return;
    root.querySelectorAll('.rel').forEach(cardEl => {
      const playEl = cardEl.querySelector('[data-play]');
      const title = cardEl.querySelector('.meta b');
      if(!playEl || !title) return;
      const id = playEl.dataset.play;
      const item = get(id);
      if(!item || isPodcast(item)) return;
      if(title.dataset.trackDetail === String(id)) return;
      title.dataset.trackDetail = String(id);
      title.classList.add('track-open-title');
      title.setAttribute('role','link');
      title.setAttribute('tabindex','0');
      title.setAttribute('title','View track details');
      const open = () => openTrackPage(id);
      title.addEventListener('click', open);
      title.addEventListener('keydown', event => {
        if(event.key === 'Enter' || event.key === ' '){
          event.preventDefault();
          open();
        }
      });
    });
  }

  const musicGrid = document.querySelector('#musicGrid');
  const homeShelf = document.querySelector('#homeShelf');
  if(musicGrid) new MutationObserver(() => decorateTrackCards(musicGrid)).observe(musicGrid,{childList:true,subtree:true});
  if(homeShelf) new MutationObserver(() => decorateTrackCards(homeShelf)).observe(homeShelf,{childList:true,subtree:true});

  if(window.renderMusicShelves){
    const baseRenderShelves = window.renderMusicShelves;
    window.renderMusicShelves = function(...args){
      const result = baseRenderShelves.apply(this,args);
      decorateTrackCards(document.querySelector('#musicGrid'));
      syncTrackRoute(false);
      return result;
    };
  }

  // ---------- Queue polish ----------
  const controls = document.querySelector('.controls');
  if(controls && !document.querySelector('#mobileQueue')){
    const btn = document.createElement('button');
    btn.id = 'mobileQueue';
    btn.className = 'mobile-queue-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label','Open Up Next');
    btn.innerHTML = `☰<span id="mobileQc">0</span>`;
    btn.addEventListener('click', () => document.querySelector('#drawer')?.classList.add('on'));
    controls.appendChild(btn);
  }

  window.renderQ = function(){
    const root = document.querySelector('#qlist');
    const count = document.querySelector('#qc');
    const mobileCount = document.querySelector('#mobileQc');
    if(count) count.textContent = String(q.length);
    if(mobileCount) mobileCount.textContent = String(q.length);
    if(!root) return;

    if(!q.length){
      root.innerHTML = `<div class="queue-summary"><span>Nothing waiting</span></div><div class="empty">Your queue is empty.</div>`;
      return;
    }

    const valid = q.map((id,index) => ({item:get(id),id,index})).filter(x => x.item);
    root.innerHTML = `
      <div class="queue-summary">
        <span>${valid.length} ${valid.length===1?'item':'items'} waiting</span>
        <button class="queue-clear" type="button" id="queueClearV448">Clear</button>
      </div>
      ${valid.map(({item,id,index}) => `
        <div class="qitem v448" data-q-index="${index}">
          <div class="qthumb">${artworkHtml(item)}</div>
          <div class="qcopy">
            <b>${esc(item[1])}</b>
            <small>${esc(item[2])}</small>
            <div class="qactions">
              <button type="button" data-q-play="${index}">Play now</button>
              <button type="button" data-q-remove="${index}">Remove</button>
            </div>
          </div>
        </div>`).join('')}
    `;

    root.querySelector('#queueClearV448')?.addEventListener('click', () => {
      q = [];
      renderQ();
      toast('Up Next cleared');
    });
    root.querySelectorAll('[data-q-play]').forEach(btn => btn.addEventListener('click', () => {
      const index = Number(btn.dataset.qPlay);
      if(!Number.isInteger(index) || index < 0 || index >= q.length) return;
      const id = q.splice(index,1)[0];
      renderQ();
      window.play(id);
    }));
    root.querySelectorAll('[data-q-remove]').forEach(btn => btn.addEventListener('click', () => {
      const index = Number(btn.dataset.qRemove);
      if(!Number.isInteger(index) || index < 0 || index >= q.length) return;
      q.splice(index,1);
      renderQ();
    }));
  };

  const nextButton = document.querySelector('#next');
  function playNextFallback(){
    if(!cur) return;
    const list = isPodcast(cur) ? pods : tracks;
    const index = list.findIndex(x => String(x[0]) === String(cur[0]));
    if(index >= 0 && index + 1 < list.length) window.play(list[index+1][0]);
  }
  if(nextButton){
    nextButton.onclick = () => {
      if(q.length){
        const id = q.shift();
        renderQ();
        window.play(id);
      }else{
        playNextFallback();
      }
    };
  }

  // ---------- Podcast skip / remembered position ----------
  function readProgress(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    }catch{
      return {};
    }
  }
  function writeProgress(map){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }catch{}
  }
  function progressFor(id){
    const entry = readProgress()[String(id)];
    return entry && Number.isFinite(Number(entry.seconds)) ? Math.max(0,Number(entry.seconds)) : 0;
  }
  function clearProgress(id){
    const map = readProgress();
    delete map[String(id)];
    writeProgress(map);
  }
  function saveProgress(id, seconds){
    if(!id || seconds < 5) return;
    const map = readProgress();
    map[String(id)] = {seconds:Math.floor(seconds),updated_at:Date.now()};
    writeProgress(map);
  }

  function seekToSeconds(seconds){
    const seek = document.querySelector('#seek');
    const duration = parseTime(document.querySelector('#duration')?.textContent);
    if(!seek || seek.disabled || !duration) return false;
    const target = Math.max(0,Math.min(duration,Number(seconds)||0));
    seek.value = String(Math.round((target/duration)*1000));
    seek.dispatchEvent(new Event('input',{bubbles:true}));
    seek.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function skipSeconds(delta){
    if(!cur || !isPodcast(cur)) return;
    const seek = document.querySelector('#seek');
    const duration = parseTime(document.querySelector('#duration')?.textContent);
    if(!seek || seek.disabled || !duration) return;
    const current = (Number(seek.value)/1000)*duration;
    seekToSeconds(current + delta);
  }

  const player = document.querySelector('.player');
  const seekRow = document.querySelector('.seekrow');
  if(player && seekRow && !document.querySelector('#podSkipRow')){
    const row = document.createElement('div');
    row.id = 'podSkipRow';
    row.className = 'pod-skip-row';
    row.innerHTML = `
      <button type="button" id="podBack15" aria-label="Back 15 seconds">↶ 15s</button>
      <button type="button" id="podForward15" aria-label="Forward 15 seconds">15s ↷</button>`;
    player.insertBefore(row,seekRow);
    document.querySelector('#podBack15')?.addEventListener('click',()=>skipSeconds(-15));
    document.querySelector('#podForward15')?.addEventListener('click',()=>skipSeconds(15));
  }

  let playToken = 0;
  const basePlay = window.play;
  window.play = function(id){
    const token = ++playToken;
    const item = get(id);
    const result = basePlay(id);
    updateNowInteraction(item);

    if(item && isPodcast(item)){
      document.body.classList.add('tsm-podcast-active');
      const savedAt = progressFor(item[0]);
      if(savedAt >= 5){
        const attemptResume = (attempt=0) => {
          if(token !== playToken || !cur || String(cur[0]) !== String(item[0])) return;
          const duration = parseTime(document.querySelector('#duration')?.textContent);
          if(duration > 0){
            if(savedAt < duration - 30){
              seekToSeconds(savedAt);
              toast(`Resuming at ${formatTime(savedAt)}`);
            }else{
              clearProgress(item[0]);
            }
            return;
          }
          if(attempt < 6) setTimeout(() => attemptResume(attempt+1),220);
        };
        setTimeout(()=>attemptResume(0),90);
      }
    }else{
      document.body.classList.remove('tsm-podcast-active');
    }

    setMediaSession(item);
    return result;
  };

  function updateNowInteraction(item){
    const cover = document.querySelector('#nowCover');
    const title = document.querySelector('#nowTitle');
    [cover,title].forEach(el => {
      if(!el) return;
      el.classList.toggle('listening-open', !!item);
      el.setAttribute('role', item ? 'button' : '');
      el.setAttribute('tabindex', item ? '0' : '-1');
    });
  }

  function openCurrentItem(){
    if(!cur) return;
    if(isPodcast(cur)) go('podcast');
    else openTrackPage(cur[0]);
  }
  document.querySelector('#nowCover')?.addEventListener('click',openCurrentItem);
  document.querySelector('#nowTitle')?.addEventListener('click',openCurrentItem);
  ['#nowCover','#nowTitle'].forEach(sel => document.querySelector(sel)?.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ') && cur){
      event.preventDefault();
      openCurrentItem();
    }
  }));

  function setMediaSession(item){
    if(!item || !('mediaSession' in navigator) || !('MediaMetadata' in window)) return;
    try{
      const artwork = item[7] ? [{src:item[7]}] : [];
      navigator.mediaSession.metadata = new MediaMetadata({
        title:item[1] || '',
        artist:item[2] || '',
        album:isPodcast(item) ? 'Crate Diggers Podcast' : '#TheSoulMixtape Records',
        artwork
      });
    }catch{}
  }

  if('mediaSession' in navigator){
    try{navigator.mediaSession.setActionHandler('seekbackward', details => skipSeconds(-(details.seekOffset || 15)));}catch{}
    try{navigator.mediaSession.setActionHandler('seekforward', details => skipSeconds(details.seekOffset || 15));}catch{}
    try{navigator.mediaSession.setActionHandler('nexttrack', () => nextButton?.click());}catch{}
    try{navigator.mediaSession.setActionHandler('previoustrack', () => document.querySelector('#prev')?.click());}catch{}
  }

  function decorateEpisodes(){
    const root = document.querySelector('#eps');
    if(!root) return;
    root.querySelectorAll('.episode-card').forEach(cardEl => {
      const playBtn = cardEl.querySelector('[data-play]');
      if(!playBtn) return;
      const id = playBtn.dataset.play;
      const seconds = progressFor(id);
      const kicker = cardEl.querySelector('.episode-kicker');
      let note = cardEl.querySelector('.podcast-resume-note');
      let restart = cardEl.querySelector('[data-pod-start-over]');
      if(seconds >= 5){
        if(playBtn.textContent.trim() !== 'Resume episode') playBtn.textContent = 'Resume episode';
        if(kicker && !note){
          note = document.createElement('span');
          note.className = 'podcast-resume-note';
          kicker.appendChild(note);
        }
        if(note){
          const label = `Resume from ${formatTime(seconds)}`;
          if(note.textContent !== label) note.textContent = label;
        }
        if(!restart){
          restart = document.createElement('button');
          restart.type = 'button';
          restart.className = 'btn pod-start-over';
          restart.dataset.podStartOver = id;
          restart.textContent = 'Start over';
          cardEl.querySelector('.episode-actions')?.appendChild(restart);
          restart.addEventListener('click', () => {
            clearProgress(id);
            window.play(id);
            setTimeout(()=>seekToSeconds(0),120);
            decorateEpisodes();
          });
        }
      }else{
        if(playBtn.textContent.trim() !== 'Play episode') playBtn.textContent = 'Play episode';
        note?.remove();
        restart?.remove();
      }
    });
  }

  const eps = document.querySelector('#eps');
  if(eps) new MutationObserver(decorateEpisodes).observe(eps,{childList:true,subtree:true});

  function persistCurrentPodcastPosition(){
    if(!cur || !isPodcast(cur)) return;
    const elapsed = parseTime(document.querySelector('#elapsed')?.textContent);
    const duration = parseTime(document.querySelector('#duration')?.textContent);
    if(!elapsed) return;
    if(duration && duration - elapsed <= 30) clearProgress(cur[0]);
    else saveProgress(cur[0], elapsed);
  }

  setInterval(persistCurrentPodcastPosition,4000);
  window.addEventListener('pagehide',persistCurrentPodcastPosition);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden') persistCurrentPodcastPosition();});
  setInterval(decorateEpisodes,30000);

  // Keep track-page save state current when My Crate changes elsewhere.
  if(typeof window.drawSaved === 'function'){
    const baseDrawSaved = window.drawSaved;
    window.drawSaved = function(...args){
      const result = baseDrawSaved.apply(this,args);
      updateTrackSaveButton();
      return result;
    };
  }

  // Initial polish and route resolution. Supabase hydration will trigger the
  // observers / render wrapper again when real catalogue data arrives.
  renderQ();
  decorateTrackCards(musicGrid);
  decorateTrackCards(homeShelf);
  decorateEpisodes();
  syncTrackRoute(false);
  setTimeout(()=>syncTrackRoute(false),400);
  setTimeout(()=>syncTrackRoute(false),1100);
  setTimeout(()=>syncTrackRoute(true),2400);
})();
