(() => {
  'use strict';

  const ARTICLE_PARAM = 'article';
  const DEFAULT_CATEGORY = 'Features';
  const SITE_TITLE = '#TheSoulMixtape';
  const sb = window.tsmSupabase;
  if (!sb) return;

  let publishedArticles = [];
  let activeArticle = null;
  let featureFilter = 'All';
  let latestContent = { track: null, podcast: null };
  let reloadTimer = null;

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const text = v => v == null ? '' : String(v);
  const esc = (v='') => text(v).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function formatDate(value){
    if(!value) return '';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB',{
      day:'numeric', month:'short', year:'numeric', timeZone:'UTC'
    }).format(d);
  }

  function slugify(value){
    return text(value).trim().toLowerCase()
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  function categoryOf(row){
    return text(row?.category).trim() || DEFAULT_CATEGORY;
  }

  function authorOf(row){
    return text(row?.author_name).trim() || SITE_TITLE;
  }

  function articleBodyHtml(value){
    const body = text(value).trim();
    if(!body) return '<p>Article text coming soon.</p>';
    return body.split(/\n{2,}/).filter(Boolean)
      .map(block => `<p>${esc(block).replace(/\n/g,'<br>')}</p>`).join('');
  }

  const style = document.createElement('style');
  style.id = 'editorial-v449';
  style.textContent = `
    /* v44.9 — From The Crates + Homepage */
    .home-latest{border-top:1px solid #2f281a;border-bottom:1px solid #2f281a;background:#11100d;padding:28px 0 31px}
    .home-latest-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:16px}
    .home-latest-head h2{font:700 33px Georgia,serif;margin:2px 0 0}
    .home-latest-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .home-latest-card{border:1px solid #41371f;border-radius:12px;padding:16px;background:#15120e;min-height:148px;display:flex;flex-direction:column}
    .home-latest-card .latest-type{color:var(--gold);text-transform:uppercase;letter-spacing:.13em;font-size:9px;font-weight:700}
    .home-latest-card h3{font:700 22px/1.08 Georgia,serif;margin:7px 0 5px}
    .home-latest-card p{color:#9f9482;font-size:11px;line-height:1.45;margin:0 0 14px}
    .home-latest-card .btn{margin-top:auto;align-self:flex-start;padding:8px 10px;font-size:8px}
    .home-crates-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,.8fr);gap:20px}
    .home-feature-lead{border:1px solid #a8985855;border-radius:15px;overflow:hidden;background:#14110d;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(260px,.92fr)}
    .home-feature-cover{border:0;padding:0;min-height:330px;background:#211b13;cursor:pointer;overflow:hidden}
    .home-feature-cover img{width:100%;height:100%;object-fit:cover;display:block}
    .home-feature-placeholder{height:100%;min-height:330px;display:grid;place-items:center;background:radial-gradient(circle at 75% 20%,#6e542455,transparent 34%),linear-gradient(145deg,#211b13,#0e0c09);color:var(--gold);font:700 30px Georgia,serif}
    .home-feature-copy{padding:28px;display:flex;flex-direction:column;justify-content:center}
    .home-feature-copy h3{font:700 clamp(29px,3vw,42px)/1.02 Georgia,serif;margin:7px 0 10px}
    .home-feature-copy p{color:#a99d89;line-height:1.6;margin:0 0 15px}
    .feature-meta-line{color:var(--gold);font-size:9px;text-transform:uppercase;letter-spacing:.11em;font-weight:700}
    .home-crate-links{display:grid;grid-template-rows:1fr 1fr;gap:14px}
    .home-crate-link{border:1px solid #5e512f;border-radius:14px;padding:22px;background:#15120e;display:flex;flex-direction:column;justify-content:flex-end;cursor:pointer}
    .home-crate-link:hover{border-color:var(--gold)}
    .home-crate-link h3{font:700 29px Georgia,serif;margin:5px 0 7px}
    .home-crate-link p{color:#9f9482;line-height:1.5;margin:0 0 12px}
    .crate-jumpnav{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0 4px}
    .crate-jumpnav button,.feature-filter button{border:1px solid #5e512f;background:#14110d;color:#cbbfa9;border-radius:999px;padding:8px 11px;text-transform:uppercase;letter-spacing:.1em;font-size:8px;cursor:pointer}
    .crate-jumpnav button:hover,.feature-filter button.active{border-color:var(--gold);color:var(--gold)}
    .feature-filter{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 18px}
    #featureList.feature-grid-v449{grid-template-columns:repeat(3,minmax(0,1fr))}
    .feature-card-v449{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#14110d;display:flex;flex-direction:column;min-height:100%}
    .feature-card-v449.feature-lead-v449{grid-column:span 2;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr)}
    .feature-card-v449 .feature-cover{aspect-ratio:16/10}
    .feature-card-v449.feature-lead-v449 .feature-cover{height:100%;aspect-ratio:auto;min-height:390px}
    .feature-card-v449 .feature-copy h3{font-size:28px}
    .feature-card-v449.feature-lead-v449 .feature-copy{justify-content:center;padding:28px}
    .feature-card-v449.feature-lead-v449 .feature-copy h3{font-size:clamp(32px,4vw,46px)}
    .feature-author{color:#8f8473;font-size:10px;margin:-2px 0 12px}
    .crate-section-title{scroll-margin-top:100px}
    .radio-grid .station,.playlist-grid .station{background:#14110d}
    .article-info-row{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:12px 0 6px;padding:14px 0;border-top:1px solid #3f351f;border-bottom:1px solid #3f351f}
    .article-byline{color:#b9ad9a;font:16px Georgia,serif}
    .article-share{white-space:nowrap}
    .article-direct-note{font-size:9px;color:#8f8473;margin-top:7px}
    .article-missing{max-width:720px;margin:65px auto;border:1px solid var(--line);border-radius:14px;padding:34px;text-align:center}
    .article-missing h2{font:700 38px Georgia,serif;margin:0 0 10px}
    .editorial-meta-fields{margin:0}
    @media(max-width:850px){
      .home-latest{padding:22px 0}.home-latest-grid{grid-template-columns:1fr}.home-latest-head{align-items:flex-start}
      .home-crates-layout{grid-template-columns:1fr}.home-feature-lead{grid-template-columns:1fr}.home-feature-cover,.home-feature-placeholder{min-height:230px}
      .home-feature-copy{padding:21px}.home-crate-links{grid-template-rows:auto;grid-template-columns:1fr 1fr}.home-crate-link{padding:17px}.home-crate-link h3{font-size:24px}
      #featureList.feature-grid-v449{grid-template-columns:1fr}
      .feature-card-v449.feature-lead-v449{grid-column:auto;grid-template-columns:1fr}
      .feature-card-v449.feature-lead-v449 .feature-cover{min-height:0;aspect-ratio:16/10}
      .feature-card-v449.feature-lead-v449 .feature-copy{padding:20px}
      .article-info-row{align-items:flex-start;flex-direction:column}.article-share{width:100%;text-align:center}
    }
    @media(max-width:520px){.home-crate-links{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function ensureArticleUi(){
    const article = qs('#article');
    if(!article) return;

    const back = qs('.article-back', article);
    if(back){
      back.removeAttribute('data-go');
      back.onclick = () => {
        clearArticleUrl(true);
        activeArticle = null;
        document.title = SITE_TITLE;
        window.go('crates');
      };
    }

    const excerpt = qs('#articleExcerpt', article);
    if(excerpt && !qs('#articleInfoRow', article)){
      const row = document.createElement('div');
      row.id = 'articleInfoRow';
      row.className = 'article-info-row';
      row.innerHTML = `
        <div><div class="article-byline" id="articleByline"></div><div class="article-direct-note">This feature has a direct link you can bookmark or share.</div></div>
        <button class="btn article-share" type="button" id="articleShare">Share feature</button>`;
      excerpt.insertAdjacentElement('afterend', row);
    }
  }

  function ensureCratesUi(){
    const crates = qs('#crates');
    if(!crates) return;
    const head = qs('.viewhead', crates);
    if(head && !qs('#crateJumpNav', crates)){
      const nav = document.createElement('div');
      nav.id = 'crateJumpNav';
      nav.className = 'crate-jumpnav';
      nav.innerHTML = `
        <button type="button" data-crate-jump="crateFeatures">Features</button>
        <button type="button" data-crate-jump="crateRadio">Radio Shows</button>
        <button type="button" data-crate-jump="cratePlaylists">Playlists</button>`;
      head.insertAdjacentElement('afterend', nav);
    }

    const headings = qsa(':scope > .wrap > h2', crates);
    if(headings[0]){ headings[0].id='crateFeatures'; headings[0].classList.add('crate-section-title'); }
    if(headings[1]){ headings[1].id='crateRadio'; headings[1].classList.add('crate-section-title'); }
    if(headings[2]){ headings[2].id='cratePlaylists'; headings[2].classList.add('crate-section-title'); }

    qsa('[data-crate-jump]', crates).forEach(btn => {
      btn.onclick = () => {
        window.go('crates');
        setTimeout(()=>qs(`#${btn.dataset.crateJump}`)?.scrollIntoView({behavior:'smooth',block:'start'}),50);
      };
    });

    const root = qs('#featureList', crates);
    if(root && !qs('#featureFilter', crates)){
      const filter = document.createElement('div');
      filter.id='featureFilter';
      filter.className='feature-filter';
      root.insertAdjacentElement('beforebegin', filter);
    }
  }

  function ensureHomeUi(){
    const home = qs('#home');
    if(!home) return;

    const hero = qs(':scope > .wrap.hero', home);
    if(hero && !qs('#homeLatest', home)){
      const section = document.createElement('section');
      section.id='homeLatest';
      section.className='home-latest';
      section.innerHTML = `
        <div class="wrap">
          <div class="home-latest-head"><div><div class="ey">Just in</div><h2>Latest from #TheSoulMixtape</h2></div></div>
          <div class="home-latest-grid" id="homeLatestGrid"></div>
        </div>`;
      hero.insertAdjacentElement('afterend', section);
    }

    const papers = qsa(':scope > section.paper', home);
    const cratesPaper = papers[1];
    if(cratesPaper){
      const head = qs('.sectionhead', cratesPaper);
      if(head){
        head.innerHTML = `<h2>From The Crates</h2><button class="btn" type="button" data-home-crates-all>Browse all</button>`;
        qs('[data-home-crates-all]',head).onclick=()=>window.go('crates');
      }
      const old = qs('.cards', cratesPaper);
      if(old && !qs('#homeCratesLayout', cratesPaper)){
        const layout=document.createElement('div');
        layout.id='homeCratesLayout';
        layout.className='home-crates-layout';
        old.replaceWith(layout);
      }
    }
  }

  function canonicalArticleUrl(slug){
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set(ARTICLE_PARAM, slug);
    return url.toString();
  }

  function setArticleUrl(slug, push=true){
    const url = new URL(location.href);
    url.searchParams.delete('track');
    url.searchParams.set(ARTICLE_PARAM, slug);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if(push) history.pushState({tsmArticle:true,slug},'',next);
    else history.replaceState(history.state,'',next);
  }

  function clearArticleUrl(replace=false){
    const url = new URL(location.href);
    url.searchParams.delete(ARTICLE_PARAM);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if(replace) history.replaceState({},'',next);
    else history.pushState({},'',next);
  }

  async function shareArticle(row){
    const url = canonicalArticleUrl(row.slug);
    const payload = {
      title: row.title || SITE_TITLE,
      text: row.excerpt || `Read ${row.title} on ${SITE_TITLE}.`,
      url
    };
    try{
      if(navigator.share){ await navigator.share(payload); return; }
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(url);
        const btn=qs('#articleShare');
        if(btn){const old=btn.textContent;btn.textContent='Link copied ✓';setTimeout(()=>btn.textContent=old,1500);}
        return;
      }
      window.prompt('Copy this feature link:',url);
    }catch(error){
      if(error?.name!=='AbortError') window.prompt('Copy this feature link:',url);
    }
  }

  function renderArticle(row){
    ensureArticleUi();
    activeArticle=row;
    const title=qs('#articleTitle'), excerpt=qs('#articleExcerpt'), cover=qs('#articleCover');
    const body=qs('#articleBody'), meta=qs('#articleMeta'), byline=qs('#articleByline');
    if(title) title.textContent=row.title || 'Feature';
    if(excerpt){excerpt.textContent=row.excerpt || '';excerpt.hidden=!row.excerpt;}
    if(meta) meta.textContent=[categoryOf(row),formatDate(row.published_at || row.created_at)].filter(Boolean).join(' · ');
    if(byline) byline.textContent=`By ${authorOf(row)}`;
    if(cover){
      if(row.cover_url){cover.src=row.cover_url;cover.alt=row.title || 'Feature cover';cover.hidden=false;}
      else{cover.removeAttribute('src');cover.alt='';cover.hidden=true;}
    }
    if(body) body.innerHTML=articleBodyHtml(row.body);
    const share=qs('#articleShare');
    if(share) share.onclick=()=>shareArticle(row);
    document.title=`${row.title || 'Feature'} | ${SITE_TITLE}`;
  }

  function showMissingArticle(){
    const root=qs('.article-view');
    if(!root) return;
    activeArticle=null;
    root.innerHTML=`
      <div class="article-missing">
        <div class="ey">From The Crates</div>
        <h2>That feature isn't in the crate.</h2>
        <p class="copy">It may have been unpublished or the link may be out of date.</p>
        <button class="btn" type="button" id="missingArticleBack">Back to From The Crates</button>
      </div>`;
    qs('#missingArticleBack')?.addEventListener('click',()=>{
      clearArticleUrl(true);document.title=SITE_TITLE;window.go('crates');
    });
  }

  function openArticleBySlug(slug, options={}){
    const row=publishedArticles.find(x=>x.slug===slug);
    if(!row){if(options.final) showMissingArticle();return false;}
    renderArticle(row);
    if(options.url!==false) setArticleUrl(row.slug,options.push!==false);
    window.go('article');
    scrollTo(0,0);
    return true;
  }

  function openArticleById(id){
    const row=publishedArticles.find(x=>String(x.id)===String(id));
    if(!row) return;
    openArticleBySlug(row.slug);
  }

  function syncArticleRoute(final=false){
    const slug=new URLSearchParams(location.search).get(ARTICLE_PARAM);
    if(!slug) return;
    if(openArticleBySlug(slug,{url:false,push:false})) return;
    if(final) { window.go('article'); showMissingArticle(); }
  }

  function articleCard(row,index,lead=false){
    const cover=row.cover_url
      ? `<button class="feature-cover" type="button" data-v449-article="${esc(row.id)}"><img src="${esc(row.cover_url)}" alt="${esc(row.title)}"></button>`
      : `<button class="feature-cover" type="button" data-v449-article="${esc(row.id)}"><span class="feature-cover-placeholder">From The Crates</span></button>`;
    const meta=[categoryOf(row),formatDate(row.published_at || row.created_at)].filter(Boolean).join(' · ');
    return `<article class="feature-card-v449${lead?' feature-lead-v449':''}">
      ${cover}
      <div class="feature-copy">
        <div class="feature-meta-line">${esc(meta)}</div>
        <h3>${esc(row.title)}</h3>
        <div class="feature-author">By ${esc(authorOf(row))}</div>
        ${row.excerpt?`<p>${esc(row.excerpt)}</p>`:''}
        <button class="btn" type="button" data-v449-article="${esc(row.id)}">Read feature</button>
      </div>
    </article>`;
  }

  function renderFeatureFilter(){
    const root=qs('#featureFilter');
    if(!root) return;
    const cats=[...new Set(publishedArticles.map(categoryOf))].sort((a,b)=>a.localeCompare(b));
    if(cats.length<=1){root.innerHTML='';return;}
    const values=['All',...cats];
    root.innerHTML=values.map(cat=>`<button type="button" class="${featureFilter===cat?'active':''}" data-feature-filter="${esc(cat)}">${esc(cat)}</button>`).join('');
    qsa('[data-feature-filter]',root).forEach(btn=>btn.onclick=()=>{
      featureFilter=btn.dataset.featureFilter;
      renderFeatureList();
    });
  }

  function bindEditorialArticles(root){
    qsa('[data-v449-article]',root).forEach(btn=>btn.onclick=()=>openArticleById(btn.dataset.v449Article));
  }

  function renderFeatureList(){
    ensureCratesUi();
    renderFeatureFilter();
    const root=qs('#featureList');
    if(!root) return;
    root.classList.add('feature-grid-v449');
    const rows=featureFilter==='All' ? publishedArticles : publishedArticles.filter(x=>categoryOf(x)===featureFilter);
    if(!rows.length){
      root.innerHTML='<div class="empty" style="grid-column:1/-1">No features in this category yet.</div>';
      root.dataset.v449='empty';
      return;
    }
    root.dataset.v449='yes';
    root.innerHTML=rows.map((row,index)=>articleCard(row,index,featureFilter==='All'&&index===0)).join('');
    bindEditorialArticles(root);
  }

  function renderHomeCrates(){
    ensureHomeUi();
    const root=qs('#homeCratesLayout');
    if(!root) return;
    const row=publishedArticles[0];
    const lead=row ? `
      <article class="home-feature-lead">
        <button class="home-feature-cover" type="button" data-v449-article="${esc(row.id)}">
          ${row.cover_url?`<img src="${esc(row.cover_url)}" alt="${esc(row.title)}">`:`<span class="home-feature-placeholder">From The Crates</span>`}
        </button>
        <div class="home-feature-copy">
          <div class="feature-meta-line">${esc([categoryOf(row),formatDate(row.published_at||row.created_at)].filter(Boolean).join(' · '))}</div>
          <h3>${esc(row.title)}</h3>
          <div class="feature-author">By ${esc(authorOf(row))}</div>
          ${row.excerpt?`<p>${esc(row.excerpt)}</p>`:''}
          <button class="btn" type="button" data-v449-article="${esc(row.id)}">Read latest feature</button>
        </div>
      </article>` :
      `<div class="empty">Features will appear here as the crate grows.</div>`;
    root.innerHTML=`${lead}<div class="home-crate-links">
      <article class="home-crate-link" data-home-crate-jump="crateRadio"><div class="ey">On air</div><h3>Radio Shows</h3><p>SoulNRnB on Nuwave Radio and Grizz on Our Music Radio.</p><span class="btn">Explore radio</span></article>
      <article class="home-crate-link" data-home-crate-jump="cratePlaylists"><div class="ey">Selections</div><h3>Playlists</h3><p>Spotify selections and Grizz's mixes on Mixcloud.</p><span class="btn">Explore playlists</span></article>
    </div>`;
    bindEditorialArticles(root);
    qsa('[data-home-crate-jump]',root).forEach(card=>card.onclick=()=>{
      window.go('crates');
      setTimeout(()=>qs(`#${card.dataset.homeCrateJump}`)?.scrollIntoView({behavior:'smooth',block:'start'}),70);
    });
  }

  function latestCard(type,title,copy,action,label){
    return `<article class="home-latest-card"><div class="latest-type">${esc(type)}</div><h3>${esc(title||'Coming soon')}</h3><p>${esc(copy||'More on the way.')}</p><button class="btn" type="button" data-latest-action="${esc(action)}">${esc(label)}</button></article>`;
  }

  function renderHomeLatest(){
    ensureHomeUi();
    const root=qs('#homeLatestGrid');
    if(!root) return;
    const article=publishedArticles[0];
    const track=latestContent.track;
    const pod=latestContent.podcast;
    root.innerHTML=[
      latestCard('Latest music',track?.title || 'New music in the racks',track ? [track.artist,track.genre,track.release_year].filter(Boolean).join(' · ') : 'Dig through the latest records.','music','Explore music'),
      latestCard('Latest podcast',pod?.title || 'Crate Diggers',pod ? [pod.episode_number?`Episode ${pod.episode_number}`:'',formatDate(pod.published_at)].filter(Boolean).join(' · ') : 'SoulNRnB and Grizz go crate digging.','podcast','Listen'),
      latestCard('Latest feature',article?.title || 'From The Crates',article ? `${categoryOf(article)} · By ${authorOf(article)}` : 'Stories, discoveries and things worth sharing.',article?`article:${article.id}`:'crates',article?'Read feature':'Explore')
    ].join('');
    qsa('[data-latest-action]',root).forEach(btn=>btn.onclick=()=>{
      const action=btn.dataset.latestAction;
      if(action.startsWith('article:')) openArticleById(action.slice(8));
      else window.go(action);
    });
  }

  async function loadEditorialData(){
    try{
      const [a,t,p]=await Promise.all([
        sb.from('articles').select('id,title,slug,excerpt,body,cover_url,published_at,created_at,created_by,author_name,category').eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}),
        sb.from('tracks').select('id,title,artist,genre,release_year,artwork_url,created_at').eq('status','published').order('created_at',{ascending:false}).limit(1),
        sb.from('podcast_episodes').select('id,title,description,episode_number,published_at,artwork_url,created_at').eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(1)
      ]);
      if(a.error) throw a.error;
      publishedArticles=a.data || [];
      latestContent.track=t.data?.[0] || null;
      latestContent.podcast=p.data?.[0] || null;
      renderFeatureList();
      renderHomeCrates();
      renderHomeLatest();
      syncArticleRoute(true);
    }catch(error){
      console.warn('v44.9 editorial data could not load',error);
    }
  }

  function scheduleEditorialReload(){
    clearTimeout(reloadTimer);
    reloadTimer=setTimeout(loadEditorialData,180);
  }

  function addMetaFields(form,isEdit=false){
    if(!form || form.querySelector('[name="author_name"]')) return;
    const slugInput=form.querySelector('[name="slug"]');
    const anchor=slugInput?.closest('label');
    if(!anchor) return;
    const wrap=document.createElement('div');
    wrap.className='form-grid editorial-meta-fields';
    wrap.innerHTML=`
      <label>Author<input name="author_name" placeholder="e.g. SoulNRnB"></label>
      <label>Category<input name="category" value="${DEFAULT_CATEGORY}" placeholder="e.g. Features"></label>`;
    anchor.insertAdjacentElement('afterend',wrap);
  }

  async function defaultArticleAuthor(){
    const form=qs('#articleForm');
    if(!form?.elements.author_name || form.elements.author_name.value.trim()) return;
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session?.user) return;
      const {data}=await sb.from('profiles').select('display_name').eq('user_id',session.user.id).maybeSingle();
      if(data?.display_name){
        form.elements.author_name.value=data.display_name;
        form.elements.author_name.defaultValue=data.display_name;
      }
    }catch{}
  }

  function waitForSuccess(form,successText,onSuccess){
    const msg=qs('.form-message',form);
    if(!msg) return;
    const observer=new MutationObserver(async()=>{
      if(msg.textContent.trim()===successText){
        observer.disconnect();
        await onSuccess();
      }
      if(msg.classList.contains('error')) observer.disconnect();
    });
    observer.observe(msg,{childList:true,subtree:true,characterData:true});
    setTimeout(()=>observer.disconnect(),120000);
  }

  function installArticleMetadataPersistence(){
    const add=qs('#articleForm'), edit=qs('#articleEditForm');
    addMetaFields(add,false);
    addMetaFields(edit,true);
    defaultArticleAuthor();

    add?.addEventListener('submit',()=>{
      const raw=Object.fromEntries(new FormData(add).entries());
      const slug=slugify(raw.slug || raw.title);
      const author=text(raw.author_name).trim();
      const category=text(raw.category).trim() || DEFAULT_CATEGORY;
      waitForSuccess(add,'Saved.',async()=>{
        if(!slug) return;
        const {data}=await sb.from('articles').select('id').eq('slug',slug).order('created_at',{ascending:false}).limit(1).maybeSingle();
        if(data?.id){
          const {error}=await sb.from('articles').update({author_name:author||null,category}).eq('id',data.id);
          if(!error) scheduleEditorialReload();
        }
        defaultArticleAuthor();
      });
    },true);

    edit?.addEventListener('submit',()=>{
      const raw=Object.fromEntries(new FormData(edit).entries());
      const id=text(raw.id);
      const author=text(raw.author_name).trim();
      const category=text(raw.category).trim() || DEFAULT_CATEGORY;
      waitForSuccess(edit,'Article changes saved.',async()=>{
        if(!id) return;
        const {error}=await sb.from('articles').update({author_name:author||null,category}).eq('id',id);
        if(!error) scheduleEditorialReload();
      });
    },true);

    document.addEventListener('click',event=>{
      const btn=event.target.closest('[data-edit-article]');
      if(!btn) return;
      const id=btn.dataset.editArticle;
      setTimeout(async()=>{
        try{
          const {data}=await sb.from('articles').select('author_name,category').eq('id',id).maybeSingle();
          if(!data || !edit) return;
          for(let attempt=0;attempt<8;attempt++){
            if(String(edit.elements.id?.value)===String(id)) break;
            await new Promise(r=>setTimeout(r,120));
          }
          if(String(edit.elements.id?.value)!==String(id)) return;
          edit.elements.author_name.value=data.author_name || '';
          edit.elements.category.value=data.category || DEFAULT_CATEGORY;
        }catch{}
      },40);
    },true);
  }

  ensureArticleUi();
  ensureCratesUi();
  ensureHomeUi();
  installArticleMetadataPersistence();

  // Preserve the v44.8 navigation wrapper and add article URL cleanup on top.
  if(typeof window.go==='function'){
    const baseGo=window.go;
    window.go=function(id){
      if(id!=='article' && new URLSearchParams(location.search).has(ARTICLE_PARAM)){
        const url=new URL(location.href);
        url.searchParams.delete(ARTICLE_PARAM);
        history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`);
        activeArticle=null;
        document.title=SITE_TITLE;
      }
      const result=baseGo(id);
      if(id==='contributors') setTimeout(defaultArticleAuthor,120);
      return result;
    };
  }

  window.addEventListener('popstate',()=>syncArticleRoute(true));

  const features=qs('#featureList');
  if(features){
    new MutationObserver(()=>{
      // backend.js will occasionally repaint this area after a content change.
      // Re-query only when that older renderer has replaced the v44.9 cards.
      if(features.querySelector('.feature-card') && !features.querySelector('.feature-card-v449')) scheduleEditorialReload();
    }).observe(features,{childList:true,subtree:false});
  }

  loadEditorialData();
  setTimeout(loadEditorialData,650);
  setTimeout(loadEditorialData,1600);
})();
