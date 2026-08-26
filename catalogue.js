(() => {
  'use strict';

  const root = document.querySelector('#musicGrid');
  if (!root) return;

  const style = document.createElement('style');
  style.id = 'catalogue-v447';
  style.textContent = `
    .catalog-tools{margin:0 0 28px;padding:18px;border:1px solid #c9b98a;background:#f1ead9;border-radius:12px;box-shadow:0 8px 24px #4a392219}
    .catalog-tools-main{display:grid;grid-template-columns:minmax(240px,1.6fr) repeat(3,minmax(145px,.72fr)) auto;gap:10px;align-items:end}
    .catalog-field{display:grid;gap:6px;min-width:0}
    .catalog-field label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.13em;color:#6d624f}
    .catalog-field input,.catalog-field select{width:100%;height:43px;border:1px solid #a99b7e;border-radius:7px;background:#fffdf8;color:#17130f;padding:0 12px;font-size:13px;outline:none}
    .catalog-field input:focus,.catalog-field select:focus{border-color:#75683f;box-shadow:0 0 0 2px #a898582c}
    .catalog-field input::placeholder{color:#8c826f}
    .catalog-clear{height:43px;border:1px solid #75683f;background:transparent;color:#51472e;border-radius:7px;padding:0 14px;text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap}
    .catalog-clear:disabled{opacity:.38;cursor:default}
    .catalog-status{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-top:13px;padding-top:13px;border-top:1px solid #cfc3a9;color:#6d624f;font-size:11px}
    .catalog-status strong{color:#2c2519}
    .catalog-empty{border:1px dashed #9d8e70;border-radius:12px;padding:42px 20px;text-align:center;color:#675d4d;background:#eee5d2}
    .catalog-empty h3{font:700 27px Georgia,serif;margin:0 0 8px;color:#211b13}
    .catalog-empty p{margin:0 0 18px;line-height:1.5}
    .catalog-empty button{border:1px solid #75683f;background:none;color:#51472e;padding:10px 13px;text-transform:uppercase;letter-spacing:.1em;font-size:9px;cursor:pointer}
    @media(max-width:1000px){
      .catalog-tools-main{grid-template-columns:minmax(220px,1.4fr) repeat(2,minmax(135px,.8fr))}
      .catalog-field-sort{grid-column:2}
      .catalog-clear{grid-column:3}
    }
    @media(max-width:850px){
      .catalog-tools{margin-bottom:20px;padding:13px;border-radius:10px}
      .catalog-tools-main{grid-template-columns:1fr 1fr;gap:9px}
      .catalog-field-search{grid-column:1/-1}
      .catalog-field-sort{grid-column:auto}
      .catalog-clear{grid-column:auto;width:100%}
      .catalog-field input,.catalog-field select,.catalog-clear{height:41px;font-size:11px}
      .catalog-field label{font-size:8px}
      .catalog-status{font-size:9px;margin-top:11px;padding-top:11px}
    }
    @media(max-width:480px){
      .catalog-tools-main{grid-template-columns:1fr}
      .catalog-field-search,.catalog-field-sort,.catalog-clear{grid-column:auto}
      .catalog-status{align-items:flex-start;flex-direction:column;gap:4px}
    }
  `;
  document.head.appendChild(style);

  const tools = document.createElement('div');
  tools.className = 'catalog-tools';
  tools.innerHTML = `
    <div class="catalog-tools-main">
      <div class="catalog-field catalog-field-search">
        <label for="catalogSearch">Search catalogue</label>
        <input id="catalogSearch" type="search" placeholder="Track title or artist" autocomplete="off" spellcheck="false">
      </div>
      <div class="catalog-field">
        <label for="catalogGenre">Genre</label>
        <select id="catalogGenre"><option value="">All genres</option></select>
      </div>
      <div class="catalog-field">
        <label for="catalogYear">Year</label>
        <select id="catalogYear"><option value="">All years</option></select>
      </div>
      <div class="catalog-field catalog-field-sort">
        <label for="catalogSort">Sort</label>
        <select id="catalogSort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">Title A–Z</option>
        </select>
      </div>
      <button class="catalog-clear" id="catalogClear" type="button">Clear filters</button>
    </div>
    <div class="catalog-status">
      <span id="catalogCount">Loading catalogue…</span>
      <span id="catalogHint">Search title or artist, then narrow by genre or year.</span>
    </div>
  `;
  root.parentNode.insertBefore(tools, root);

  const search = document.querySelector('#catalogSearch');
  const genre = document.querySelector('#catalogGenre');
  const year = document.querySelector('#catalogYear');
  const sort = document.querySelector('#catalogSort');
  const clear = document.querySelector('#catalogClear');
  const count = document.querySelector('#catalogCount');

  let originalOrder = new Map();
  let lastTrackSignature = '';

  function normalise(value){
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function trackSignature(){
    return tracks.map(x => String(x?.[0] ?? '')).join('|');
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function syncCatalogueMetadata(){
    const sig = trackSignature();
    if(sig === lastTrackSignature) return;
    lastTrackSignature = sig;
    originalOrder = new Map(tracks.map((x, i) => [String(x[0]), i]));

    const genres = [...new Set(tracks.map(x => String(x[3] || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));
    const years = [...new Set(tracks.map(x => String(x[4] || '').trim()).filter(Boolean))]
      .sort((a,b) => Number(b) - Number(a) || b.localeCompare(a));

    const keepGenre = genre.value;
    const keepYear = year.value;

    genre.innerHTML = '<option value="">All genres</option>' +
      genres.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    year.innerHTML = '<option value="">All years</option>' +
      years.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');

    if(genres.includes(keepGenre)) genre.value = keepGenre;
    if(years.includes(keepYear)) year.value = keepYear;
  }

  function filteredTracks(){
    const term = normalise(search.value);
    const wantedGenre = genre.value;
    const wantedYear = year.value;

    let xs = tracks.filter(x => {
      const matchesSearch = !term || normalise(`${x[1]} ${x[2]}`).includes(term);
      const matchesGenre = !wantedGenre || String(x[3] || '') === wantedGenre;
      const matchesYear = !wantedYear || String(x[4] || '') === wantedYear;
      return matchesSearch && matchesGenre && matchesYear;
    });

    if(sort.value === 'az'){
      xs.sort((a,b) =>
        String(a[1] || '').localeCompare(String(b[1] || ''), undefined, {sensitivity:'base'}) ||
        (originalOrder.get(String(a[0])) ?? 0) - (originalOrder.get(String(b[0])) ?? 0)
      );
    } else {
      const direction = sort.value === 'oldest' ? 1 : -1;
      xs.sort((a,b) => {
        const ay = Number.parseInt(a[4], 10);
        const by = Number.parseInt(b[4], 10);
        const aYear = Number.isFinite(ay) ? ay : 0;
        const bYear = Number.isFinite(by) ? by : 0;
        if(aYear !== bYear) return (aYear - bYear) * direction;
        return (originalOrder.get(String(a[0])) ?? 0) - (originalOrder.get(String(b[0])) ?? 0);
      });
    }
    return xs;
  }

  function hasActiveFilters(){
    return !!(search.value.trim() || genre.value || year.value || sort.value !== 'newest');
  }

  function render(){
    syncCatalogueMetadata();
    const xs = filteredTracks();
    const total = tracks.length;
    const n = matchMedia('(max-width:850px)').matches ? 2 : 5;

    if(!xs.length){
      root.innerHTML = `
        <div class="catalog-empty">
          <h3>No records found.</h3>
          <p>Try another title, artist, genre or year.</p>
          <button type="button" data-catalog-reset>Clear filters</button>
        </div>`;
      root.querySelector('[data-catalog-reset]')?.addEventListener('click', reset);
    } else {
      const rows = [];
      for(let i=0;i<xs.length;i+=n){
        rows.push(`<div class="shelf catalog-shelf">${xs.slice(i,i+n).map(card).join('')}</div>`);
      }
      root.innerHTML = rows.join('');
      bind(root);
    }

    count.innerHTML = xs.length === total
      ? `<strong>${total}</strong> ${total === 1 ? 'release' : 'releases'}`
      : `Showing <strong>${xs.length}</strong> of ${total} ${total === 1 ? 'release' : 'releases'}`;
    clear.disabled = !hasActiveFilters();
  }

  function reset(){
    search.value = '';
    genre.value = '';
    year.value = '';
    sort.value = 'newest';
    render();
    try{ search.focus({preventScroll:true}); }catch(_){ search.focus(); }
  }

  let searchTimer = null;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 90);
  });
  genre.addEventListener('change', render);
  year.addEventListener('change', render);
  sort.addEventListener('change', render);
  clear.addEventListener('click', reset);

  // Supabase calls this public renderer after published tracks hydrate.
  window.renderMusicShelves = render;

  // The original page has its own breakpoint renderer. It runs first;
  // this listener immediately restores the filtered view afterwards.
  let shelfSize = matchMedia('(max-width:850px)').matches ? 2 : 5;
  addEventListener('resize', () => {
    const nextSize = matchMedia('(max-width:850px)').matches ? 2 : 5;
    if(nextSize !== shelfSize){
      shelfSize = nextSize;
      render();
    }
  });

  // Cover the initial asynchronous Supabase handoff as well.
  render();
  setTimeout(render, 500);
  setTimeout(render, 1500);
})();
