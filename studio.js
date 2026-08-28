(() => {
  'use strict';

  const sb = window.tsmSupabase;
  if (!sb) return;

  const AUDIO_WORKER_URL = 'https://thesoulmixtape-media.thesoulmixtape.workers.dev';
  const ONBOARDING_KEY = 'tsm-contributor-onboarding-v1';

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const text = v => v == null ? '' : String(v);
  const esc = (v='') => text(v).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  let identity = null;
  let contentMeta = new Map();
  let contentRefreshTimer = null;
  let previewObjectUrl = '';
  let disclosureRequest = 0;

  const style = document.createElement('style');
  style.id = 'studio-v4410';
  style.textContent = `
    /* v44.10 — Contributor & Content Management */
    .studio-onboarding{border:1px solid #a8985866;border-radius:14px;background:linear-gradient(145deg,#18140e,#11100d);padding:20px;margin:20px 0 4px}
    .studio-onboarding-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
    .studio-onboarding h3{font:700 28px Georgia,serif;margin:3px 0 7px}
    .studio-onboarding p{margin:0;color:#a99d89;line-height:1.5}
    .studio-onboarding-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:15px}
    .studio-step{border:1px solid #40361f;border-radius:9px;padding:12px;background:#14110d}
    .studio-step b{display:block;color:var(--cream);font:700 16px Georgia,serif;margin-bottom:4px}
    .studio-step span{display:block;color:#958a79;font-size:10px;line-height:1.45}
    .studio-onboarding .auth-link{white-space:nowrap;padding-top:2px}
    .studio-form-note{display:block;color:#928775;font-size:10px;text-transform:none;letter-spacing:normal;line-height:1.45;margin-top:4px}
    .studio-ai-box{border:1px solid #4c4027;border-radius:10px;padding:14px;background:#15120e}
    .studio-ai-box .form-grid{margin:0}
    .studio-file-preview{display:none;margin-top:9px;border:1px solid #40361f;border-radius:9px;padding:10px;background:#12100d;text-transform:none;letter-spacing:normal}
    .studio-file-preview.on{display:grid;grid-template-columns:74px minmax(0,1fr);gap:11px;align-items:center}
    .studio-file-preview.audio.on{grid-template-columns:1fr}
    .studio-file-preview img{width:74px;height:74px;object-fit:cover;border-radius:7px;background:#211b13}
    .studio-file-preview b{display:block;color:#d9cdb6;font-size:11px;overflow-wrap:anywhere}
    .studio-file-preview small{display:block;color:#8f8473;font-size:9px;margin-top:4px;line-height:1.4}
    .studio-file-preview audio{width:100%;margin-top:7px}
    .studio-file-warning{color:#d6c58e!important}
    .studio-content-tools{border:1px solid #40361f;border-radius:11px;padding:13px;margin:0 0 14px;background:#15120e}
    .studio-content-summary{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:11px}
    .studio-stat{border:1px solid #514529;border-radius:999px;padding:6px 9px;color:#b9ad9a;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
    .studio-content-filter{display:grid;grid-template-columns:minmax(160px,1fr) 155px 155px;gap:8px}
    .studio-content-filter input,.studio-content-filter select{width:100%;padding:10px 11px;background:#0f0e0b;border:1px solid #514529;color:#fff;border-radius:7px}
    .content-row.studio-row{grid-template-columns:minmax(0,1fr) auto}
    .studio-content-main{display:grid;grid-template-columns:70px minmax(0,1fr);gap:12px;align-items:center;min-width:0}
    .studio-content-thumb{width:70px;height:70px;border-radius:7px;overflow:hidden;background:#211b13;border:1px solid #40361f}
    .studio-content-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .studio-content-thumb .studio-placeholder{width:100%;height:100%;display:grid;place-items:center;color:var(--gold);font:700 10px Georgia,serif;text-align:center;padding:5px}
    .studio-content-copy{min-width:0}
    .studio-content-copy b{display:block;font:700 19px Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .studio-content-copy small{display:block;color:#958a79;margin-top:4px;line-height:1.45}
    .studio-content-copy .studio-detail{font-size:10px;color:#b1a591}
    .studio-ai-pill{display:inline-block;border:1px solid #756437;border-radius:999px;padding:3px 6px;color:#d6c58e;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-left:5px}
    .studio-readonly{display:inline-block;margin-left:7px;color:#8f8473;font-size:9px}
    .studio-preview-modal{display:none;position:fixed;inset:0;z-index:100;background:#000d;padding:18px;align-items:center;justify-content:center}
    .studio-preview-modal.on{display:flex}
    .studio-preview-card{width:min(720px,100%);max-height:90vh;overflow:auto;border:1px solid var(--gold);border-radius:14px;background:#14110e;padding:20px;box-shadow:0 24px 70px #000}
    .studio-preview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:14px}
    .studio-preview-head h3{font:700 30px Georgia,serif;margin:3px 0 0}
    .studio-preview-close{border:0;background:none;color:var(--cream);font-size:27px;cursor:pointer}
    .studio-preview-art{width:min(240px,55vw);aspect-ratio:1;margin:0 auto 16px;border-radius:9px;overflow:hidden;background:#211b13}
    .studio-preview-art img{width:100%;height:100%;object-fit:cover;display:block}
    .studio-preview-card audio{display:block;width:100%;margin:12px 0}
    .studio-preview-meta{color:#9f9482;font-size:11px;line-height:1.55}
    .studio-article-preview img{width:100%;max-height:330px;object-fit:cover;border-radius:9px;margin-bottom:16px}
    .studio-article-preview h2{font:700 38px Georgia,serif;margin:7px 0 10px}
    .studio-article-preview .deck{font:19px/1.5 Georgia,serif;color:#c6baa6}
    .studio-article-preview .body{font:17px/1.7 Georgia,serif;color:#d7cbb6}
    @media(max-width:850px){
      .studio-onboarding-grid{grid-template-columns:1fr 1fr}
      .studio-content-filter{grid-template-columns:1fr}
      .studio-content-main{grid-template-columns:58px minmax(0,1fr)}
      .studio-content-thumb{width:58px;height:58px}
      .content-row.studio-row{grid-template-columns:1fr}
    }
    @media(max-width:520px){.studio-onboarding-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function formatDate(value){
    if(!value) return '';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(d);
  }

  function formatBytes(bytes){
    const n = Number(bytes) || 0;
    if(n < 1024) return `${n} B`;
    if(n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    return `${(n/(1024*1024)).toFixed(1)} MB`;
  }

  async function refreshIdentity(){
    const {data:{session}} = await sb.auth.getSession();
    if(!session?.user){identity=null;return null;}
    const {data} = await sb.from('profiles')
      .select('user_id,display_name,role,active')
      .eq('user_id',session.user.id)
      .maybeSingle();
    identity = data ? {...data,email:session.user.email || ''} : null;
    ensureOnboarding();
    return identity;
  }

  function ensureOnboarding(){
    const dash = qs('#contributorDashboard');
    if(!dash || !identity?.user_id) return;
    const key = `${ONBOARDING_KEY}:${identity.user_id}`;
    const existing = qs('#studioOnboarding',dash);
    if(localStorage.getItem(key)==='done'){existing?.remove();return;}
    if(existing) return;

    const head = qs('.dash-head',dash);
    if(!head) return;
    const box = document.createElement('section');
    box.id='studioOnboarding';
    box.className='studio-onboarding';
    const permission = identity.role==='admin'
      ? 'As an administrator you can manage all contributor content and accounts.'
      : 'You can create, publish, edit and delete your own content. Other contributors’ work remains read-only.';
    box.innerHTML = `
      <div class="studio-onboarding-head">
        <div><div class="ey">Quick start</div><h3>Working in The Back Room</h3><p>${esc(permission)}</p></div>
        <button class="auth-link" type="button" id="studioOnboardingDone">Got it</button>
      </div>
      <div class="studio-onboarding-grid">
        <div class="studio-step"><b>1. Start as Draft</b><span>Upload privately while you finish metadata, artwork and audio.</span></div>
        <div class="studio-step"><b>2. Preview it</b><span>Use Preview in Content to hear saved draft audio before publishing.</span></div>
        <div class="studio-step"><b>3. Publish when ready</b><span>Published content becomes visible on the public site immediately.</span></div>
        <div class="studio-step"><b>4. Edit safely</b><span>Replacing media keeps the item and removes the superseded file after a successful save.</span></div>
      </div>`;
    head.insertAdjacentElement('afterend',box);
    qs('#studioOnboardingDone',box).onclick=()=>{
      localStorage.setItem(key,'done');
      box.remove();
    };
  }

  function addStatusNotes(){
    [
      ['#trackForm','Draft keeps a track private until you publish it.'],
      ['#podcastForm','Draft keeps an episode private until you publish it.'],
      ['#articleForm','Draft keeps an article private until you publish it.']
    ].forEach(([selector,note])=>{
      const form=qs(selector);
      const select=form?.elements.status;
      const label=select?.closest('label');
      if(!label || qs('.studio-form-note',label)) return;
      const span=document.createElement('span');
      span.className='studio-form-note';
      span.textContent=note;
      label.appendChild(span);
    });
  }

  function ensureAiFields(){
    ['#trackForm','#trackEditForm'].forEach((selector,index)=>{
      const form=qs(selector);
      if(!form || form.elements.ai_assisted) return;
      const box=document.createElement('div');
      box.className='studio-ai-box';
      box.innerHTML=`
        <div class="form-grid">
          <label>AI-assisted production
            <select name="ai_assisted">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
            <span class="studio-form-note">Internal Back Room metadata only. This is not shown beside the track to listeners.</span>
          </label>
          <label>Internal production note
            <textarea name="ai_disclosure" rows="3" placeholder="Optional production note for contributors"></textarea>
            <span class="studio-form-note">Optional and editorial-only. It is kept for your own records and is not displayed on the public music experience.</span>
          </label>
        </div>`;
      const status=form.elements.status?.closest('label');
      const submit=qs('button[type="submit"]',form);
      if(status) status.insertAdjacentElement('beforebegin',box);
      else if(submit) submit.insertAdjacentElement('beforebegin',box);
      else form.appendChild(box);

      const select=form.elements.ai_assisted;
      const note=form.elements.ai_disclosure;
      const sync=()=>{
        const yes=select.value==='true';
        note.disabled=!yes;
        note.closest('label').style.opacity=yes?'1':'.55';
      };
      select.addEventListener('change',sync);
      form.addEventListener('reset',()=>setTimeout(sync,0));
      sync();
    });
  }

  function waitForSuccess(form,successText,onSuccess){
    const msg=qs('.form-message',form);
    if(!msg) return;
    const observer=new MutationObserver(async()=>{
      if(msg.textContent.trim()===successText){
        observer.disconnect();
        try{await onSuccess();}catch(error){console.warn('v44.10 metadata save failed',error);}
      }else if(msg.classList.contains('error')){
        observer.disconnect();
      }
    });
    observer.observe(msg,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
    setTimeout(()=>observer.disconnect(),120000);
  }

  async function patchNewTrackAi(snapshot){
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.user || !snapshot.title) return;
    const {data,error}=await sb.from('tracks')
      .select('id')
      .eq('created_by',session.user.id)
      .eq('title',snapshot.title)
      .gte('created_at',snapshot.since)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error || !data?.id) return;
    await sb.from('tracks').update({
      ai_assisted:snapshot.ai_assisted,
      ai_disclosure:snapshot.ai_assisted ? (snapshot.ai_disclosure || null) : null
    }).eq('id',data.id);
    scheduleContentRefresh();
  }

  function installAiPersistence(){
    const add=qs('#trackForm');
    if(add && !add.dataset.studioAiBound){
      add.dataset.studioAiBound='yes';
      add.addEventListener('submit',()=>{
        const fd=new FormData(add);
        const snapshot={
          title:text(fd.get('title')).trim(),
          ai_assisted:text(fd.get('ai_assisted'))==='true',
          ai_disclosure:text(fd.get('ai_disclosure')).trim(),
          since:new Date(Date.now()-3000).toISOString()
        };
        waitForSuccess(add,'Saved.',()=>patchNewTrackAi(snapshot));
      },true);
    }

    const edit=qs('#trackEditForm');
    if(edit && !edit.dataset.studioAiBound){
      edit.dataset.studioAiBound='yes';
      edit.addEventListener('submit',()=>{
        const fd=new FormData(edit);
        const id=text(fd.get('id'));
        const patch={
          ai_assisted:text(fd.get('ai_assisted'))==='true',
          ai_disclosure:text(fd.get('ai_assisted'))==='true' ? (text(fd.get('ai_disclosure')).trim() || null) : null
        };
        waitForSuccess(edit,'Changes saved.',async()=>{
          if(id) await sb.from('tracks').update(patch).eq('id',id);
          scheduleContentRefresh();
        });
      },true);
    }

    document.addEventListener('click',event=>{
      const btn=event.target.closest('[data-edit-track]');
      if(!btn) return;
      const id=btn.dataset.editTrack;
      setTimeout(async()=>{
        const form=qs('#trackEditForm');
        if(!form?.elements.ai_assisted) return;
        for(let i=0;i<10;i++){
          if(String(form.elements.id?.value)===String(id)) break;
          await new Promise(r=>setTimeout(r,120));
        }
        if(String(form.elements.id?.value)!==String(id)) return;
        const {data}=await sb.from('tracks').select('ai_assisted,ai_disclosure').eq('id',id).maybeSingle();
        if(!data) return;
        form.elements.ai_assisted.value=data.ai_assisted?'true':'false';
        form.elements.ai_disclosure.value=data.ai_disclosure || '';
        form.elements.ai_assisted.dispatchEvent(new Event('change'));
      },30);
    },true);
  }

  function attachFilePreview(input){
    if(!input || input.dataset.studioPreviewBound) return;
    input.dataset.studioPreviewBound='yes';
    const label=input.closest('label');
    if(!label) return;

    const isImage=(input.accept||'').includes('image');
    const isAudio=(input.accept||'').includes('audio');
    if(!isImage && !isAudio) return;

    const box=document.createElement('div');
    box.className=`studio-file-preview ${isAudio?'audio':''}`;
    label.appendChild(box);

    let objectUrl='';
    const clear=()=>{
      if(objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl='';
      box.classList.remove('on');
      box.innerHTML='';
    };

    input.addEventListener('change',()=>{
      clear();
      const file=input.files?.[0];
      if(!file) return;
      objectUrl=URL.createObjectURL(file);
      box.classList.add('on');

      if(isImage){
        box.innerHTML=`<img alt="Selected artwork preview"><div><b>${esc(file.name)}</b><small>${esc(formatBytes(file.size))}</small><small class="studio-dimensions">Checking dimensions…</small></div>`;
        const img=qs('img',box);
        img.src=objectUrl;
        const probe=new Image();
        probe.onload=()=>{
          const dim=qs('.studio-dimensions',box);
          if(!dim) return;
          const square=probe.naturalWidth===probe.naturalHeight;
          dim.textContent=`${probe.naturalWidth} × ${probe.naturalHeight}px${square?' · square artwork':' · square artwork recommended'}`;
          dim.classList.toggle('studio-file-warning',!square);
        };
        probe.src=objectUrl;
      }else{
        box.innerHTML=`<div><b>${esc(file.name)}</b><small>${esc(formatBytes(file.size))} · local preview before upload</small><audio controls preload="metadata" src="${esc(objectUrl)}"></audio></div>`;
      }
    });

    input.form?.addEventListener('reset',()=>setTimeout(clear,0));
  }

  function installFilePreviews(){
    qsa('#contributorDashboard input[type="file"]').forEach(attachFilePreview);
  }

  function ensureContentTools(){
    const list=qs('#contentList');
    if(!list || qs('#studioContentTools')) return;
    const tools=document.createElement('div');
    tools.id='studioContentTools';
    tools.className='studio-content-tools';
    tools.innerHTML=`
      <div class="studio-content-summary" id="studioContentSummary"></div>
      <div class="studio-content-filter">
        <input id="studioContentSearch" type="search" placeholder="Search content" aria-label="Search contributor content">
        <select id="studioContentType" aria-label="Filter by content type">
          <option value="all">All types</option><option value="music">Music</option><option value="podcast">Podcast</option><option value="article">Article</option>
        </select>
        <select id="studioContentStatus" aria-label="Filter by status">
          <option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
        </select>
      </div>`;
    list.insertAdjacentElement('beforebegin',tools);
    ['studioContentSearch','studioContentType','studioContentStatus'].forEach(id=>{
      qs(`#${id}`)?.addEventListener('input',applyContentFilters);
      qs(`#${id}`)?.addEventListener('change',applyContentFilters);
    });
  }

  function inferRowIdentity(row){
    const status=qs('[data-status-id]',row);
    if(status) return {table:status.dataset.statusTable,id:status.dataset.statusId};
    const del=qs('[data-delete-id]',row);
    if(del) return {table:del.dataset.deleteTable,id:del.dataset.deleteId};
    const track=qs('[data-edit-track]',row);
    if(track) return {table:'tracks',id:track.dataset.editTrack};
    const pod=qs('[data-edit-podcast]',row);
    if(pod) return {table:'podcast_episodes',id:pod.dataset.editPodcast};
    const article=qs('[data-edit-article]',row);
    if(article) return {table:'articles',id:article.dataset.editArticle};
    return null;
  }

  function itemType(table){
    return table==='tracks'?'Music':table==='podcast_episodes'?'Podcast':'Article';
  }

  function itemDetail(meta){
    if(meta.table==='tracks') return [meta.artist,meta.genre,meta.release_year].filter(Boolean).join(' · ');
    if(meta.table==='podcast_episodes') return [meta.episode_number?`Episode ${meta.episode_number}`:'',formatDate(meta.published_at)].filter(Boolean).join(' · ');
    return [meta.category,meta.author_name?`By ${meta.author_name}`:'',formatDate(meta.published_at)].filter(Boolean).join(' · ');
  }

  function itemArtwork(meta){
    const url=meta.artwork_url || meta.cover_url || (meta.table==='podcast_episodes'?'pod.png':'');
    if(url) return `<img src="${esc(url)}" alt="">`;
    return `<div class="studio-placeholder">${esc(itemType(meta.table))}</div>`;
  }

  function decorateContentRows(){
    const list=qs('#contentList');
    if(!list) return;
    const rows=qsa('.content-row',list);

    rows.forEach(row=>{
      const ident=inferRowIdentity(row);
      const oldMain=row.children[0];
      const actions=qs('.content-actions',row);

      if(!ident){
        row.dataset.studioType=(oldMain?.textContent||'').toLowerCase().includes('podcast')?'podcast':
          (oldMain?.textContent||'').toLowerCase().includes('article')?'article':'music';
        const match=(oldMain?.textContent||'').toLowerCase().match(/\b(draft|published|archived)\b/);
        row.dataset.studioStatus=match?.[1]||'';
        row.dataset.studioSearch=(oldMain?.textContent||'').toLowerCase();
        if(oldMain && !qs('.studio-readonly',oldMain)){
          const ro=document.createElement('span');
          ro.className='studio-readonly';
          ro.textContent='Read-only team item';
          oldMain.appendChild(ro);
        }
        return;
      }

      const key=`${ident.table}:${ident.id}`;
      const meta=contentMeta.get(key);
      if(!meta || !oldMain || !actions) return;

      row.classList.add('studio-row');
      row.dataset.studioKey=key;
      row.dataset.studioType=ident.table==='tracks'?'music':ident.table==='podcast_episodes'?'podcast':'article';
      row.dataset.studioStatus=meta.status || '';
      row.dataset.studioSearch=[meta.title,itemDetail(meta),meta.status].filter(Boolean).join(' ').toLowerCase();

      if(!oldMain.classList.contains('studio-content-main')){
        oldMain.className='studio-content-main';
      }
      oldMain.innerHTML=`
        <div class="studio-content-thumb">${itemArtwork(meta)}</div>
        <div class="studio-content-copy">
          <b>${esc(meta.title || 'Untitled')}</b>
          <small>${esc(itemType(meta.table))} · <span class="status-pill">${esc(meta.status || '')}</span>${meta.table==='tracks'&&meta.ai_assisted?'<span class="studio-ai-pill">AI-assisted</span>':''}</small>
          <small class="studio-detail">${esc(itemDetail(meta) || 'No additional metadata')}</small>
        </div>`;

      if(!qs('[data-studio-preview]',actions)){
        const canPreviewArticle=meta.table==='articles';
        const hasAudio=(meta.table==='tracks'||meta.table==='podcast_episodes') && !!meta.audio_url;
        if(canPreviewArticle || hasAudio){
          const btn=document.createElement('button');
          btn.type='button';
          btn.className='btn';
          btn.dataset.studioPreview=key;
          btn.textContent='Preview';
          btn.onclick=()=>openContentPreview(meta);
          actions.insertBefore(btn,actions.firstChild);
        }
      }
    });

    updateContentSummary();
    applyContentFilters();
  }

  function updateContentSummary(){
    const root=qs('#studioContentSummary');
    if(!root) return;
    const rows=qsa('#contentList .content-row');
    const counts={all:rows.length,draft:0,published:0,archived:0};
    rows.forEach(row=>{if(counts[row.dataset.studioStatus]!=null) counts[row.dataset.studioStatus]++;});
    root.innerHTML=`
      <span class="studio-stat">${counts.all} items</span>
      <span class="studio-stat">${counts.draft} draft</span>
      <span class="studio-stat">${counts.published} published</span>
      <span class="studio-stat">${counts.archived} archived</span>`;
  }

  function applyContentFilters(){
    const search=text(qs('#studioContentSearch')?.value).trim().toLowerCase();
    const type=qs('#studioContentType')?.value || 'all';
    const status=qs('#studioContentStatus')?.value || 'all';
    qsa('#contentList .content-row').forEach(row=>{
      const okSearch=!search || (row.dataset.studioSearch||row.textContent.toLowerCase()).includes(search);
      const okType=type==='all' || row.dataset.studioType===type;
      const okStatus=status==='all' || row.dataset.studioStatus===status;
      row.style.display=okSearch&&okType&&okStatus?'':'none';
    });
  }

  async function loadContentMetadata(){
    if(!identity?.user_id) await refreshIdentity();
    if(!identity?.user_id) return;
    ensureContentTools();
    const [tr,po,ar]=await Promise.all([
      sb.from('tracks').select('id,title,artist,genre,release_year,artwork_url,audio_url,status,created_by,created_at,ai_assisted,ai_disclosure').order('created_at',{ascending:false}).limit(50),
      sb.from('podcast_episodes').select('id,title,description,episode_number,published_at,artwork_url,audio_url,status,created_by,created_at').order('created_at',{ascending:false}).limit(50),
      sb.from('articles').select('id,title,slug,excerpt,body,cover_url,status,published_at,created_by,created_at,author_name,category').order('created_at',{ascending:false}).limit(50)
    ]);
    contentMeta=new Map();
    (tr.data||[]).forEach(x=>contentMeta.set(`tracks:${x.id}`,{...x,table:'tracks'}));
    (po.data||[]).forEach(x=>contentMeta.set(`podcast_episodes:${x.id}`,{...x,table:'podcast_episodes'}));
    (ar.data||[]).forEach(x=>contentMeta.set(`articles:${x.id}`,{...x,table:'articles'}));
    decorateContentRows();
  }

  function scheduleContentRefresh(){
    clearTimeout(contentRefreshTimer);
    contentRefreshTimer=setTimeout(loadContentMetadata,180);
  }

  function ensurePreviewModal(){
    let modal=qs('#studioPreviewModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='studioPreviewModal';
    modal.className='studio-preview-modal';
    modal.innerHTML=`<div class="studio-preview-card" id="studioPreviewCard"></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal) closePreviewModal();});
    return modal;
  }

  function closePreviewModal(){
    const modal=qs('#studioPreviewModal');
    if(!modal) return;
    qs('audio',modal)?.pause();
    modal.classList.remove('on');
    if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl='';}
  }

  async function audioPreviewUrl(meta){
    if(!meta.audio_url) throw new Error('No audio is attached to this item.');
    if(meta.status==='published' && String(meta.audio_url).startsWith('r2:')){
      return meta.table==='podcast_episodes'
        ? `${AUDIO_WORKER_URL}/audio/podcast/${encodeURIComponent(meta.id)}`
        : `${AUDIO_WORKER_URL}/audio/${encodeURIComponent(meta.id)}`;
    }

    if(String(meta.audio_url).startsWith('r2:')){
      const {data:{session}}=await sb.auth.getSession();
      if(!session?.access_token) throw new Error('Your contributor session has expired. Please sign in again.');
      const kind=meta.table==='podcast_episodes'?'podcast':'track';
      const response=await fetch(`${AUDIO_WORKER_URL}/preview/${kind}/${encodeURIComponent(meta.id)}`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${session.access_token}`}
      });
      let data=null;
      try{data=await response.json();}catch{}
      if(!response.ok || !data?.preview_url) throw new Error(data?.error || 'Could not create the private preview.');
      return data.preview_url;
    }

    const {data,error}=await sb.storage.from('tsm-audio').createSignedUrl(meta.audio_url,600);
    if(error || !data?.signedUrl) throw new Error(error?.message || 'Could not create the private preview.');
    return data.signedUrl;
  }

  async function openContentPreview(meta){
    const modal=ensurePreviewModal();
    const card=qs('#studioPreviewCard',modal);
    modal.classList.add('on');

    if(meta.table==='articles'){
      card.innerHTML=`
        <div class="studio-preview-head"><div><div class="ey">Article preview · ${esc(meta.status)}</div><h3>${esc(meta.title)}</h3></div><button class="studio-preview-close" type="button">×</button></div>
        <div class="studio-article-preview">
          ${meta.cover_url?`<img src="${esc(meta.cover_url)}" alt="">`:''}
          <div class="studio-preview-meta">${esc([meta.category,meta.author_name?`By ${meta.author_name}`:'',formatDate(meta.published_at||meta.created_at)].filter(Boolean).join(' · '))}</div>
          ${meta.excerpt?`<p class="deck">${esc(meta.excerpt)}</p>`:''}
          <div class="body">${text(meta.body).trim()?text(meta.body).trim().split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join(''):'<p>Article text coming soon.</p>'}</div>
        </div>`;
      qs('.studio-preview-close',card).onclick=closePreviewModal;
      return;
    }

    card.innerHTML=`
      <div class="studio-preview-head"><div><div class="ey">Private audio preview · ${esc(meta.status)}</div><h3>${esc(meta.title)}</h3></div><button class="studio-preview-close" type="button">×</button></div>
      <div class="studio-preview-art">${itemArtwork(meta)}</div>
      <div class="studio-preview-meta">${esc(itemDetail(meta))}</div>
      <div class="empty" id="studioPreviewLoading">Preparing preview…</div>`;
    qs('.studio-preview-close',card).onclick=closePreviewModal;

    try{
      const url=await audioPreviewUrl(meta);
      const loading=qs('#studioPreviewLoading',card);
      if(loading) loading.outerHTML=`<audio controls autoplay preload="metadata" src="${esc(url)}"></audio><p class="studio-preview-meta">Saved draft previews are temporary and are not made public.</p>`;
      qs('audio',card)?.play().catch(()=>{});
    }catch(error){
      const loading=qs('#studioPreviewLoading',card);
      if(loading) loading.textContent=error?.message || 'Preview unavailable.';
    }
  }

  function watchContentList(){
    const list=qs('#contentList');
    if(!list) return;
    new MutationObserver(()=>scheduleContentRefresh()).observe(list,{childList:true});
    setTimeout(loadContentMetadata,500);
  }


  function initialise(){
    ensureAiFields();
    installAiPersistence();
    installFilePreviews();
    addStatusNotes();
    ensureContentTools();
    watchContentList();
    refreshIdentity().then(()=>loadContentMetadata());
  }

  initialise();

  sb.auth.onAuthStateChange((event)=>{
    if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED'){
      setTimeout(()=>{
        refreshIdentity();
        installFilePreviews();
        ensureAiFields();
        loadContentMetadata();
      },350);
    }
    if(event==='SIGNED_OUT'){
      identity=null;
      qs('#studioOnboarding')?.remove();
      contentMeta.clear();
    }
  });
})();