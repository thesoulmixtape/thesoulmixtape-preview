(() => {
  'use strict';

  const style = document.createElement('style');
  style.id = 'my-crate-v446';
  style.textContent = `
    .crate-wrap{padding:42px 0 70px}
    .crate-hero{display:grid;grid-template-columns:190px minmax(0,1fr) auto;gap:30px;align-items:center;padding:8px 0 30px;border-bottom:1px solid var(--line)}
    .crate-hero img{width:190px;aspect-ratio:1;object-fit:cover;border:1px solid #493c23;border-radius:14px;box-shadow:0 18px 36px #0008}
    .crate-hero h1{font:700 clamp(52px,7vw,78px) Georgia,serif;line-height:.95;margin:4px 0 12px}
    .crate-hero .copy{max-width:650px;margin:0}
    .crate-device{margin:12px 0 0;color:#8f8473;font-size:11px;text-transform:uppercase;letter-spacing:.1em}
    .crate-total{min-width:150px;text-align:center;border:1px solid var(--line);border-radius:14px;padding:20px 18px;background:#14110d}
    .crate-total strong{display:block;color:var(--gold);font:700 48px/1 Georgia,serif}
    .crate-total span{display:block;margin-top:7px;color:#aaa092;font-size:10px;text-transform:uppercase;letter-spacing:.13em}
    .crate-toolbar{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:24px 0 18px;flex-wrap:wrap}
    .crate-filters,.crate-bulk{display:flex;gap:8px;flex-wrap:wrap}
    .crate-filter{border:1px solid #554a35;background:#14110d;color:#cbbfa9;padding:10px 13px;border-radius:999px;cursor:pointer;font-size:10px;text-transform:uppercase;letter-spacing:.1em}
    .crate-filter.active{border-color:var(--gold);color:var(--gold);background:#1b160d}
    .crate-filter span{opacity:.7;margin-left:4px}
    .crate-bulk .btn:disabled{opacity:.35;cursor:default}
    .crate-clear{border-color:#714139!important;color:#e6aa9d!important}
    .crate-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:4px 0 65px}
    .crate-item{display:grid;grid-template-columns:132px minmax(0,1fr);gap:18px;align-items:center;border:1px solid #493c23;border-radius:14px;padding:14px;background:radial-gradient(circle at 92% 8%,#6e542422,transparent 32%),#14110d;min-width:0}
    .crate-art{width:132px;height:132px;border:0;padding:0;border-radius:9px;overflow:hidden;background:#211b13;cursor:pointer;position:relative}
    .crate-art:after{content:"▶";position:absolute;right:8px;bottom:8px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#111d;border:1px solid #fff;color:#fff;font-size:12px}
    .crate-art img{width:100%;height:100%;object-fit:cover;display:block}
    .crate-copy{min-width:0}
    .crate-kicker{color:var(--gold);font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:700;margin-bottom:5px}
    .crate-copy h3{font:700 25px/1.05 Georgia,serif;margin:0 0 7px;overflow-wrap:anywhere}
    .crate-meta{color:#9f9482;font-size:11px;line-height:1.45;margin:0 0 10px}
    .crate-desc{color:#b9ad9a;font-size:12px;line-height:1.45;margin:0 0 11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .crate-actions{display:flex;gap:6px;flex-wrap:wrap}
    .crate-actions .btn{padding:8px 9px;font-size:8px}
    .crate-remove{border-color:#714139!important;color:#e6aa9d!important}
    .crate-empty{grid-column:1/-1;border:1px dashed var(--line);border-radius:14px;padding:45px 24px;text-align:center;color:#a99d89}
    .crate-empty h3{font:700 28px Georgia,serif;color:var(--cream);margin:0 0 8px}
    .crate-empty p{margin:0 0 18px;line-height:1.55}
    .crate-toast{position:fixed;left:50%;bottom:155px;z-index:80;transform:translate(-50%,15px);background:#1b160e;border:1px solid var(--gold);color:var(--cream);padding:10px 14px;border-radius:9px;font-size:11px;opacity:0;pointer-events:none;transition:.2s;box-shadow:0 10px 30px #0009}
    .crate-toast.on{opacity:1;transform:translate(-50%,0)}
    @media(max-width:850px){
      .crate-wrap{padding:26px 0 48px}
      .crate-hero{grid-template-columns:100px minmax(0,1fr);gap:16px;padding-bottom:22px}
      .crate-hero img{width:100px;border-radius:10px}
      .crate-hero h1{font-size:43px;margin:3px 0 8px}
      .crate-hero .copy{font-size:13px;line-height:1.45}
      .crate-device{font-size:8px;margin-top:8px}
      .crate-total{grid-column:1/-1;display:flex;align-items:baseline;justify-content:center;gap:8px;min-width:0;padding:12px}
      .crate-total strong{font-size:31px}
      .crate-total span{margin:0}
      .crate-toolbar{align-items:flex-start;padding:18px 0 14px;gap:12px}
      .crate-filters{width:100%;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px;-webkit-overflow-scrolling:touch}
      .crate-filter{white-space:nowrap;padding:9px 11px}
      .crate-bulk{width:100%}
      .crate-bulk .btn{flex:1 1 auto;text-align:center;padding:9px 8px;font-size:8px}
      .crate-list{grid-template-columns:1fr;gap:11px;padding-bottom:50px}
      .crate-item{grid-template-columns:92px minmax(0,1fr);gap:12px;padding:11px;border-radius:11px}
      .crate-art{width:92px;height:92px}
      .crate-art:after{width:28px;height:28px;right:6px;bottom:6px;font-size:10px}
      .crate-copy h3{font-size:20px}
      .crate-meta{font-size:9px;margin-bottom:8px}
      .crate-desc{font-size:10px;margin-bottom:8px}
      .crate-actions{gap:5px}
      .crate-actions .btn{padding:7px 7px;font-size:7px}
      .crate-toast{bottom:128px;max-width:calc(100vw - 28px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    }
  `;
  document.head.appendChild(style);

  const esc = (value='') => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  let crateFilter = 'all';
  let toastTimer = null;

  function isPodcast(item){
    return !!item && item[5] === 'pod';
  }

  function currentSavedItems(){
    return saved.map(id => get(id)).filter(Boolean);
  }

  function filteredItems(){
    const all = currentSavedItems();
    if(crateFilter === 'music') return all.filter(x => !isPodcast(x));
    if(crateFilter === 'podcasts') return all.filter(isPodcast);
    return all;
  }

  function artwork(item){
    if(item && item[7]){
      return `<img src="${esc(item[7])}" alt="${esc(item[1])}">`;
    }
    if(isPodcast(item)){
      return `<img src="pod.png" alt="${esc(item[1])}">`;
    }
    const cls = /^art[1-5]$/.test(item?.[5] || '') ? item[5] : 'art1';
    return `<div class="${cls}" style="width:100%;height:100%;position:relative"><span class="ctxt">${esc(item?.[1] || '')}</span></div>`;
  }

  function toast(message){
    let el = document.querySelector('#crateToast');
    if(!el){
      el = document.createElement('div');
      el.id = 'crateToast';
      el.className = 'crate-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1500);
  }

  function saveCrate(){
    localStorage.setItem('crate', JSON.stringify(saved));
  }

  function removeSaved(id){
    saved = saved.filter(x => String(x) !== String(id));
    saveCrate();
    drawSaved();
    toast('Removed from My Crate');
  }

  function addToQueue(id){
    if(!q.includes(id)) q.push(id);
    renderQ();
    toast('Added to Up Next');
  }

  function queueVisible(){
    const ids = filteredItems().map(x => x[0]);
    if(!ids.length) return;
    let added = 0;
    ids.forEach(id => {
      if(!q.includes(id)){
        q.push(id);
        added += 1;
      }
    });
    renderQ();
    toast(added ? `${added} added to Up Next` : 'Already in Up Next');
  }

  function playCollection(shuffle=false){
    let xs = filteredItems().slice();
    if(!xs.length) return;
    if(shuffle){
      for(let i=xs.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [xs[i],xs[j]]=[xs[j],xs[i]];
      }
    }
    q = xs.slice(1).map(x => x[0]);
    renderQ();
    play(xs[0][0]);
    toast(shuffle ? 'Shuffling My Crate' : 'Playing My Crate');
  }

  function itemCard(item){
    const podcast = isPodcast(item);
    const kind = podcast ? 'Podcast' : 'Music';
    const meta = podcast
      ? ['Crate Diggers', item[9] ? `Episode ${item[9]}` : '', item[4]].filter(Boolean).join(' · ')
      : [item[2], item[3], item[4]].filter(Boolean).join(' · ');
    const desc = podcast && item[8] ? `<p class="crate-desc">${esc(item[8])}</p>` : '';
    return `
      <article class="crate-item">
        <button class="crate-art" type="button" data-crate-play="${esc(item[0])}" aria-label="Play ${esc(item[1])}">
          ${artwork(item)}
        </button>
        <div class="crate-copy">
          <div class="crate-kicker">${kind}</div>
          <h3>${esc(item[1])}</h3>
          <p class="crate-meta">${esc(meta)}</p>
          ${desc}
          <div class="crate-actions">
            <button class="btn" type="button" data-crate-play="${esc(item[0])}">Play</button>
            <button class="btn" type="button" data-crate-queue="${esc(item[0])}">Up Next</button>
            <button class="btn crate-remove" type="button" data-crate-remove="${esc(item[0])}">Remove</button>
          </div>
        </div>
      </article>`;
  }

  function renderShell(){
    const page = document.querySelector('#mycrate');
    if(!page) return;
    page.innerHTML = `
      <div class="wrap crate-wrap">
        <div class="crate-hero">
          <img src="crate.png" alt="My Crate">
          <div>
            <div class="ey">Your collection</div>
            <h1>My Crate</h1>
            <p class="copy">Keep the music and Crate Diggers episodes you want to come back to, then play or queue the whole crate whenever you like.</p>
            <p class="crate-device">Saved privately on this device</p>
          </div>
          <div class="crate-total"><strong id="crateCount">0</strong><span>saved</span></div>
        </div>
        <div class="crate-toolbar">
          <div class="crate-filters" aria-label="Filter My Crate">
            <button class="crate-filter active" type="button" data-crate-filter="all">All <span id="crateAllCount">0</span></button>
            <button class="crate-filter" type="button" data-crate-filter="music">Music <span id="crateMusicCount">0</span></button>
            <button class="crate-filter" type="button" data-crate-filter="podcasts">Podcasts <span id="cratePodcastCount">0</span></button>
          </div>
          <div class="crate-bulk">
            <button class="btn" type="button" id="cratePlayAll">Play All</button>
            <button class="btn" type="button" id="crateShuffle">Shuffle</button>
            <button class="btn" type="button" id="crateQueueAll">Add All to Up Next</button>
            <button class="btn crate-clear" type="button" id="crateClear">Clear</button>
          </div>
        </div>
        <div class="crate-list" id="saved"></div>
      </div>`;

    page.querySelectorAll('[data-crate-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        crateFilter = btn.dataset.crateFilter || 'all';
        drawSaved();
      });
    });

    document.querySelector('#cratePlayAll')?.addEventListener('click', () => playCollection(false));
    document.querySelector('#crateShuffle')?.addEventListener('click', () => playCollection(true));
    document.querySelector('#crateQueueAll')?.addEventListener('click', queueVisible);
    document.querySelector('#crateClear')?.addEventListener('click', () => {
      if(!currentSavedItems().length) return;
      if(!confirm('Clear everything from My Crate?')) return;
      saved = [];
      saveCrate();
      drawSaved();
      toast('My Crate cleared');
    });
  }

  function bindCrate(){
    const root = document.querySelector('#saved');
    if(!root) return;
    root.querySelectorAll('[data-crate-play]').forEach(btn => {
      btn.addEventListener('click', () => play(btn.dataset.cratePlay));
    });
    root.querySelectorAll('[data-crate-queue]').forEach(btn => {
      btn.addEventListener('click', () => addToQueue(btn.dataset.crateQueue));
    });
    root.querySelectorAll('[data-crate-remove]').forEach(btn => {
      btn.addEventListener('click', () => removeSaved(btn.dataset.crateRemove));
    });
  }

  function draw(){
    const root = document.querySelector('#saved');
    if(!root) return;

    const all = currentSavedItems();
    const music = all.filter(x => !isPodcast(x));
    const podcasts = all.filter(isPodcast);
    const visible = filteredItems().slice().reverse();

    const setText = (sel, value) => {
      const el = document.querySelector(sel);
      if(el) el.textContent = String(value);
    };
    setText('#crateCount', all.length);
    setText('#crateAllCount', all.length);
    setText('#crateMusicCount', music.length);
    setText('#cratePodcastCount', podcasts.length);

    document.querySelectorAll('[data-crate-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.crateFilter === crateFilter);
    });

    ['#cratePlayAll','#crateShuffle','#crateQueueAll'].forEach(sel => {
      const el = document.querySelector(sel);
      if(el) el.disabled = visible.length === 0;
    });
    const clear = document.querySelector('#crateClear');
    if(clear) clear.disabled = all.length === 0;

    if(!all.length){
      root.innerHTML = `
        <div class="crate-empty">
          <h3>Your crate is empty.</h3>
          <p>Use the + button on music or podcast episodes and choose “Add to My Crate”.</p>
          <button class="btn" type="button" data-crate-browse>Dig the shelves</button>
        </div>`;
      root.querySelector('[data-crate-browse]')?.addEventListener('click', () => go('music'));
      return;
    }

    if(!visible.length){
      const label = crateFilter === 'music' ? 'music' : 'podcast episodes';
      root.innerHTML = `
        <div class="crate-empty">
          <h3>No ${label} saved yet.</h3>
          <p>Your other saved items are still in My Crate.</p>
        </div>`;
      return;
    }

    root.innerHTML = visible.map(itemCard).join('');
    bindCrate();
  }

  // Add real playback history so Previous can move backwards through
  // tracks/episodes that have already left the Up Next queue.
  const basePlay = window.play;
  let playHistory = [];
  let historyNavigation = false;

  window.play = function(id){
    const nextId = id == null ? '' : String(id);
    const currentId = cur && cur[0] != null ? String(cur[0]) : '';
    if(!historyNavigation && currentId && nextId && currentId !== nextId){
      playHistory.push(currentId);
      if(playHistory.length > 100) playHistory.shift();
    }
    historyNavigation = false;
    return basePlay(id);
  };

  const previousButton = document.querySelector('#prev');
  if(previousButton){
    previousButton.onclick = () => {
      if(!playHistory.length){
        if(cur) window.play(cur[0]);
        return;
      }
      const currentId = cur && cur[0] != null ? cur[0] : null;
      const previousId = playHistory.pop();
      if(currentId != null && String(currentId) !== String(previousId)){
        q.unshift(currentId);
        renderQ();
      }
      historyNavigation = true;
      window.play(previousId);
    };
  }

  renderShell();

  // Replace the original basic renderer while preserving the same global name
  // used by navigation and the existing Add-to-My-Crate menu.
  window.drawSaved = draw;

  // Re-render after the database-backed catalogue has hydrated.
  if(window.renderMusicShelves){
    const originalRender = window.renderMusicShelves;
    window.renderMusicShelves = function(...args){
      const result = originalRender.apply(this, args);
      draw();
      return result;
    };
  }

  const eps = document.querySelector('#eps');
  if(eps){
    new MutationObserver(() => draw()).observe(eps, {childList:true});
  }

  draw();
  setTimeout(draw, 500);
  setTimeout(draw, 1500);
})();
