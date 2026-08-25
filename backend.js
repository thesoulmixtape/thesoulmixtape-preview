(() => {
  const SUPABASE_URL = 'https://yzeprmubwogcscmnvoow.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_aMVnZ7Bjz0SVES1T3TNy0Q_S1z-juft';
  const PRODUCTION_AUDIO_WORKER_URL = 'https://thesoulmixtape-media.thesoulmixtape.workers.dev';
  const requestedAudioWorker = new URLSearchParams(location.search).get('audioWorker') || '';
  const AUDIO_WORKER_URL = /^https:\/\/(?:[a-z0-9-]+-)?thesoulmixtape-media\.thesoulmixtape\.workers\.dev$/i.test(requestedAudioWorker)
    ? requestedAudioWorker.replace(/\/$/,'')
    : PRODUCTION_AUDIO_WORKER_URL;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.tsmSupabase = sb;
  let profile = null;
  let audioEngine = null;
  let userSeeking = false;

  function formatTime(seconds){
    if(!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total=Math.floor(seconds);
    const hours=Math.floor(total/3600);
    const mins=Math.floor((total%3600)/60);
    const secs=total%60;
    return hours ? `${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}` : `${mins}:${String(secs).padStart(2,'0')}`;
  }

  function syncSeek(){
    const seek=qs('#seek'), elapsed=qs('#elapsed'), duration=qs('#duration');
    if(!seek || !elapsed || !duration) return;
    const a=audioEngine;
    const valid=!!(a && Number.isFinite(a.duration) && a.duration > 0);
    if(!valid){
      seek.disabled=true;
      seek.value='0';
      seek.style.setProperty('--seek','0%');
      elapsed.textContent='0:00';
      duration.textContent='0:00';
      return;
    }
    seek.disabled=false;
    duration.textContent=formatTime(a.duration);
    if(userSeeking) return;
    const ratio=Math.max(0,Math.min(1,(a.currentTime||0)/a.duration));
    seek.value=String(Math.round(ratio*1000));
    seek.style.setProperty('--seek',`${ratio*100}%`);
    elapsed.textContent=formatTime(a.currentTime||0);
  }

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const textValue = (v) => typeof v === 'string' ? v : (v == null ? '' : String(v));
  const esc = (v='') => textValue(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function showMessage(form, msg, isError=false){
    const el = qs('.form-message', form) || qs('#loginMessage');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('error', !!isError);
  }

  async function loadSiteSettings(){
    const { data, error } = await sb.from('site_settings').select('key,value');
    if (error || !data) return;
    const map = Object.fromEntries(data.map(x => [x.key, x.value]));
    if (map.home_headline_gold && qs('#heroGold')) qs('#heroGold').textContent = textValue(map.home_headline_gold);
    if (map.home_headline_rest && qs('#heroRest')) qs('#heroRest').textContent = textValue(map.home_headline_rest);
    if (map.home_supporting && qs('#heroSupporting')) qs('#heroSupporting').textContent = textValue(map.home_supporting);
    if (map.soulnrnb_bio && qs('#soulnrnbBio')) qs('#soulnrnbBio').textContent = textValue(map.soulnrnb_bio);
    if (map.grizz_bio && qs('#grizzBio')) qs('#grizzBio').textContent = textValue(map.grizz_bio);
    const f = qs('#settingsForm');
    if (f) {
      ['home_headline_gold','home_headline_rest','home_supporting','soulnrnb_bio','grizz_bio'].forEach(k => {
        if (map[k] != null && f.elements[k]) f.elements[k].value = textValue(map[k]);
      });
    }
  }

  function remoteTrack(row, idx){
    return [row.id,row.title,row.artist || '#TheSoulMixtape',row.genre || 'Soul',String(row.release_year || ''),`art${(idx%5)+1}`,row.audio_url || '',row.artwork_url || ''];
  }
  function remotePod(row){
    return [row.id,row.title,'Crate Diggers Podcast','Podcast',row.published_at ? String(new Date(row.published_at).getFullYear()) : '', 'pod', row.audio_url || '', row.artwork_url || '', row.description || '', row.episode_number || '', row.published_at || '', row.duration_seconds || 0];
  }
  function podcastDate(value){
    if(!value) return '';
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d);
  }

  let publishedArticles=[];
  function slugifyArticle(value){
    return textValue(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }
  function articleBodyHtml(value){
    const text=textValue(value).trim();
    if(!text) return '<p class="copy">Article text coming soon.</p>';
    return text.split(/\n{2,}/).filter(Boolean).map(block=>`<p>${esc(block).replace(/\n/g,'<br>')}</p>`).join('');
  }
  function renderPublishedArticles(rows){
    publishedArticles=rows || [];
    const root=qs('#featureList');
    if(!root) return;
    if(!publishedArticles.length){
      root.innerHTML='<div class="empty" style="grid-column:1/-1">Features will live here as the site grows.</div>';
      return;
    }
    root.innerHTML=publishedArticles.map(row=>{
      const date=podcastDate(row.published_at || row.created_at);
      const cover=row.cover_url
        ? `<button class="feature-cover" type="button" data-open-article="${esc(row.id)}"><img src="${esc(row.cover_url)}" alt="${esc(row.title)}"></button>`
        : `<button class="feature-cover" type="button" data-open-article="${esc(row.id)}"><span class="feature-cover-placeholder">From The Crates</span></button>`;
      return `<article class="feature-card">${cover}<div class="feature-copy"><div class="feature-kicker">${esc(date || 'From The Crates')}</div><h3>${esc(row.title)}</h3>${row.excerpt?`<p>${esc(row.excerpt)}</p>`:''}<button class="btn" type="button" data-open-article="${esc(row.id)}">Read feature</button></div></article>`;
    }).join('');
    qsa('[data-open-article]',root).forEach(btn=>btn.onclick=()=>openPublishedArticle(btn.dataset.openArticle));
  }
  function openPublishedArticle(id){
    const row=publishedArticles.find(x=>String(x.id)===String(id));
    if(!row) return;
    const title=qs('#articleTitle'), excerpt=qs('#articleExcerpt'), cover=qs('#articleCover'), body=qs('#articleBody'), meta=qs('#articleMeta');
    if(title) title.textContent=row.title || 'Feature';
    if(excerpt){ excerpt.textContent=row.excerpt || ''; excerpt.hidden=!row.excerpt; }
    if(meta) meta.textContent=['From The Crates',podcastDate(row.published_at || row.created_at)].filter(Boolean).join(' · ');
    if(cover){
      if(row.cover_url){cover.src=row.cover_url;cover.alt=row.title || 'Feature cover';cover.hidden=false;}
      else{cover.removeAttribute('src');cover.alt='';cover.hidden=true;}
    }
    if(body) body.innerHTML=articleBodyHtml(row.body);
    if(typeof window.go==='function') window.go('article');
  }

  // Upgrade artwork rendering for database-backed items.
  const originalArt = window.art;
  window.art = function(x){
    if (x && x[7]) return `<img src="${esc(x[7])}" alt="${esc(x[1])}" style="width:100%;height:100%;object-fit:cover">`;
    return originalArt(x);
  };

  async function loadPublishedContent(){
    const [{data:t},{data:p},{data:a}] = await Promise.all([
      sb.from('tracks').select('*').eq('status','published').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
      sb.from('podcast_episodes').select('*').eq('status','published').order('published_at',{ascending:false,nullsFirst:false}),
      sb.from('articles').select('id,title,slug,excerpt,body,cover_url,published_at,created_at').eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})
    ]);
    if (t && t.length){
      const hydrated=await Promise.all(t.map(async row=>({...row,audio_url:await signedAudioUrl(row.audio_url,row.id,'track')})));
      const mapped=hydrated.map(remoteTrack);
      tracks.splice(0, tracks.length, ...mapped);
      items=[...tracks,...pods];
      const hs=qs('#homeShelf'), mg=qs('#musicGrid');
      if(hs){hs.innerHTML=tracks.slice(0,5).map(card).join('');bind(hs)}
      if(mg){ if(window.renderMusicShelves) window.renderMusicShelves(); else {mg.innerHTML=tracks.map(card).join('');bind(mg)} }
    }
    if (p && p.length){
      const hydrated=await Promise.all(p.map(async row=>({...row,audio_url:await signedAudioUrl(row.audio_url,row.id,'podcast')})));
      const mapped=hydrated.map(remotePod);
      pods.splice(0, pods.length, ...mapped);
      items=[...tracks,...pods];
      const ep=qs('#eps');
      if(ep){ep.innerHTML=pods.map(x=>{
        const meta=[x[9]?`Episode ${x[9]}`:'',podcastDate(x[10])].filter(Boolean).join(' · ');
        return `<article class="episode-card"><img class="episode-art" src="${esc(x[7]||'pod.png')}" alt="${esc(x[1])}"><div class="episode-copy"><div class="episode-kicker">${esc(meta||'Crate Diggers Podcast')}</div><h3>${esc(x[1])}</h3>${x[8]?`<p>${esc(x[8])}</p>`:''}<div class="episode-actions"><button class="btn" data-play="${esc(x[0])}">Play episode</button><button class="btn" data-add="${esc(x[0])}">+ Queue</button></div></div></article>`;
      }).join('');bind(ep)}
    }
    renderPublishedArticles(a || []);
  }

  function ensureAudio(){
    if (!audioEngine){
      audioEngine = new Audio();
      audioEngine.preload='metadata';
      audioEngine.addEventListener('ended',()=>{ if(q.length){ play(q.shift()); renderQ(); } else qs('#pp').textContent='▶'; syncSeek(); });
      audioEngine.addEventListener('play',()=>qs('#pp').textContent='❚❚');
      audioEngine.addEventListener('pause',()=>qs('#pp').textContent='▶');
      audioEngine.addEventListener('loadedmetadata',syncSeek);
      audioEngine.addEventListener('durationchange',syncSeek);
      audioEngine.addEventListener('timeupdate',syncSeek);
      audioEngine.addEventListener('emptied',syncSeek);
    }
    return audioEngine;
  }

  const originalPlay = window.play;
  window.play = function(id){
    const x=get(id);
    originalPlay(id);
    if (!x) return;

    // Keep the persistent player artwork in sync with database-backed tracks.
    const nowCover=qs('#nowCover');
    if(nowCover){
      if(x[7]){
        nowCover.className='nowcover';
        nowCover.style.backgroundImage=`url(${JSON.stringify(x[7])})`;
        nowCover.style.backgroundSize='cover';
        nowCover.style.backgroundPosition='center';
        nowCover.style.backgroundRepeat='no-repeat';
      }else{
        nowCover.style.backgroundImage='';
        nowCover.style.backgroundSize='';
        nowCover.style.backgroundPosition='';
        nowCover.style.backgroundRepeat='';
      }
    }

    const url=x[6];
    const a=ensureAudio();
    if(url){
      if(a.src!==url){ a.src=url; userSeeking=false; syncSeek(); }
      a.play().catch(()=>{ qs('#pp').textContent='▶'; });
    }
  };
  const pp=qs('#pp');
  if(pp){
    pp.onclick=()=>{
      if(!cur){ play(tracks[0]?.[0]); return; }
      const a=ensureAudio();
      if(cur[6]){ a.paused ? a.play().catch(()=>{}) : a.pause(); }
      else pp.textContent=pp.textContent==='▶'?'❚❚':'▶';
    };
  }
  const seek=qs('#seek');
  if(seek){
    seek.addEventListener('input',()=>{
      const a=ensureAudio();
      if(!Number.isFinite(a.duration) || a.duration<=0) return;
      userSeeking=true;
      const ratio=Number(seek.value)/1000;
      seek.style.setProperty('--seek',`${ratio*100}%`);
      const elapsed=qs('#elapsed');
      if(elapsed) elapsed.textContent=formatTime(ratio*a.duration);
    });
    seek.addEventListener('change',()=>{
      const a=ensureAudio();
      if(Number.isFinite(a.duration) && a.duration>0) a.currentTime=(Number(seek.value)/1000)*a.duration;
      userSeeking=false;
      syncSeek();
    });
  }

  async function getProfile(userId){
    const {data,error}=await sb.from('profiles').select('user_id,display_name,role,active').eq('user_id',userId).maybeSingle();
    if(error) throw error;
    return data;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function getProfileWithRetry(userId){
    let lastError=null;
    for(let attempt=0; attempt<3; attempt++){
      try{
        const p=await getProfile(userId);
        return p;
      }catch(error){
        lastError=error;
        if(attempt<2) await wait(180*(attempt+1));
      }
    }
    throw lastError;
  }

  function setDashboardState(user, p){
    profile=p;
    const login=qs('#contributorLogin'), dash=qs('#contributorDashboard');
    const allowed=!!(user && p && p.active);
    if(login) login.hidden=allowed;
    if(dash) dash.hidden=!allowed;
    if(allowed){
      qs('#welcomeContributor').textContent=`Signed in as ${p.display_name} · ${p.role}`;
      qsa('.admin-only').forEach(el=>el.classList.toggle('admin-hidden',p.role!=='admin'));
      loadContentList();
    }
  }

  let authRefreshPromise=null;
  async function refreshSessionUI(showApprovalMessage=false){
    if(authRefreshPromise) return authRefreshPromise;
    authRefreshPromise=(async()=>{
      const {data:{session}}=await sb.auth.getSession();
      if(!session){ setDashboardState(null,null); return false; }
      try{
        const p=await getProfileWithRetry(session.user.id);
        if(!p || !p.active){
          await sb.auth.signOut();
          setDashboardState(null,null);
          if(showApprovalMessage){
            const m=qs('#loginMessage'); if(m){m.textContent='This account is not approved as a contributor.';m.classList.add('error');}
          }
          return false;
        }
        setDashboardState(session.user,p);
        return true;
      }catch(error){
        // A transient profile/API error must never be treated as failed approval.
        setDashboardState(null,null);
        const m=qs('#loginMessage');
        if(m){m.textContent='Signed in, but the contributor profile could not be loaded. Please try again.';m.classList.add('error');}
        return false;
      }
    })();
    try{return await authRefreshPromise;}finally{authRefreshPromise=null;}
  }

  const login=qs('#login');
  if(login){
    login.onsubmit=async e=>{
      e.preventDefault(); showMessage(login,'Signing in…');
      const email=qs('#loginEmail').value.trim(), password=qs('#loginPassword').value;
      const {error}=await sb.auth.signInWithPassword({email,password});
      if(error){showMessage(login,error.message,true);return;}
      // Give Safari/Supabase a moment to persist the new access token before the profile query.
      await wait(120);
      const ok=await refreshSessionUI(true);
      if(ok) showMessage(login,'');
    };
  }
  const logout=qs('#logoutBtn');
  if(logout) logout.onclick=async()=>{await sb.auth.signOut();setDashboardState(null,null)};

  qsa('.dash-tab').forEach(btn=>btn.addEventListener('click',()=>{
    qsa('.dash-tab').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
    qsa('.dash-panel').forEach(x=>x.classList.toggle('on',x.id===btn.dataset.dash));
  }));

  const IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp']);
  const AUDIO_TYPES = new Set(['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/flac','audio/x-flac']);
  const IMAGE_MAX = 12 * 1024 * 1024;
  const SINGLE_UPLOAD_MAX = 50 * 1024 * 1024;
  const AUDIO_MAX = 200 * 1024 * 1024;
  const MULTIPART_PART_SIZE = 10 * 1024 * 1024;

  function pickedFile(form, name){
    const f=form.elements[name]?.files?.[0];
    return f && f.size ? f : null;
  }
  function cleanExt(file){
    let ext=(file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(!ext){
      const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','audio/mpeg':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/wav':'wav','audio/x-wav':'wav','audio/flac':'flac','audio/x-flac':'flac'};
      ext=map[file.type] || 'bin';
    }
    return ext.slice(0,8);
  }
  function publicObjectUrl(bucket,path){
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  async function signedAudioUrl(path,id,kind='track'){
    if(!path) return '';
    if(/^https?:\/\//i.test(path)) return path;
    if(String(path).startsWith('r2:')){
      if(!id) return '';
      return kind==='podcast'
        ? `${AUDIO_WORKER_URL}/audio/podcast/${encodeURIComponent(id)}`
        : `${AUDIO_WORKER_URL}/audio/${encodeURIComponent(id)}`;
    }
    const {data,error}=await sb.storage.from('tsm-audio').createSignedUrl(path,3600);
    if(error) return '';
    return data?.signedUrl || '';
  }
  async function responseJson(response){
    let data=null;
    try{data=await response.json();}catch{}
    return data;
  }
  async function uploadR2Single(file,session,onProgress){
    const contentType=file.type || ({mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',flac:'audio/flac'}[cleanExt(file)] || 'application/octet-stream');
    if(onProgress) onProgress(0);
    const response=await fetch(`${AUDIO_WORKER_URL}/upload`,{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${session.access_token}`,
        'Content-Type':contentType,
        'X-Filename':`audio.${cleanExt(file)}`
      },
      body:file
    });
    const data=await responseJson(response);
    if(!response.ok || !data?.audio_url) throw new Error(data?.error || `R2 upload failed (${response.status}).`);
    if(onProgress) onProgress(100);
    return {bucket:'r2-audio',path:data.audio_url,url:data.audio_url};
  }
  async function uploadR2Multipart(file,session,onProgress){
    const contentType=file.type || ({mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',flac:'audio/flac'}[cleanExt(file)] || 'application/octet-stream');
    const auth={'Authorization':`Bearer ${session.access_token}`};
    let key='', uploadId='', audioUrl='';
    try{
      if(onProgress) onProgress(1);
      const createResponse=await fetch(`${AUDIO_WORKER_URL}/multipart/create`,{
        method:'POST',
        headers:{...auth,'Content-Type':'application/json'},
        body:JSON.stringify({filename:`audio.${cleanExt(file)}`,content_type:contentType,size:file.size})
      });
      const created=await responseJson(createResponse);
      if(!createResponse.ok || !created?.upload_id || !created?.key) throw new Error(created?.error || `Could not start multipart upload (${createResponse.status}).`);
      key=created.key; uploadId=created.upload_id; audioUrl=created.audio_url || `r2:${key}`;
      const partSize=Number(created.part_size)||MULTIPART_PART_SIZE;
      const totalParts=Math.ceil(file.size/partSize);
      const parts=[];
      for(let index=0;index<totalParts;index++){
        const start=index*partSize, end=Math.min(start+partSize,file.size);
        const chunk=file.slice(start,end,contentType);
        let uploaded=null, lastError=null;
        for(let attempt=1;attempt<=3;attempt++){
          try{
            const partResponse=await fetch(`${AUDIO_WORKER_URL}/multipart/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${index+1}`,{
              method:'PUT',headers:auth,body:chunk
            });
            const partData=await responseJson(partResponse);
            if(!partResponse.ok || !partData?.etag) throw new Error(partData?.error || `Part ${index+1} failed (${partResponse.status}).`);
            uploaded={partNumber:Number(partData.partNumber||index+1),etag:partData.etag};
            break;
          }catch(error){
            lastError=error;
            if(attempt<3) await wait(500*attempt);
          }
        }
        if(!uploaded) throw lastError || new Error(`Part ${index+1} failed.`);
        parts.push(uploaded);
        if(onProgress) onProgress(Math.min(95,Math.round(((index+1)/totalParts)*95)));
      }
      const completeResponse=await fetch(`${AUDIO_WORKER_URL}/multipart/complete`,{
        method:'POST',
        headers:{...auth,'Content-Type':'application/json'},
        body:JSON.stringify({key,upload_id:uploadId,parts})
      });
      const completed=await responseJson(completeResponse);
      if(!completeResponse.ok || !completed?.audio_url) throw new Error(completed?.error || `Could not finish multipart upload (${completeResponse.status}).`);
      if(onProgress) onProgress(100);
      return {bucket:'r2-audio',path:completed.audio_url||audioUrl,url:completed.audio_url||audioUrl};
    }catch(error){
      if(key && uploadId){
        try{
          await fetch(`${AUDIO_WORKER_URL}/multipart/abort`,{
            method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({key,upload_id:uploadId})
          });
        }catch{}
      }
      throw error;
    }
  }
  async function uploadR2Audio(file,session,onProgress){
    return file.size<=SINGLE_UPLOAD_MAX
      ? uploadR2Single(file,session,onProgress)
      : uploadR2Multipart(file,session,onProgress);
  }
  async function deleteR2Audio(audioUrl){
    if(!audioUrl || !String(audioUrl).startsWith('r2:')) return;
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token) throw new Error('Your contributor session has expired. Please sign in again.');
    const response=await fetch(`${AUDIO_WORKER_URL}/object`,{
      method:'DELETE',
      headers:{'Authorization':`Bearer ${session.access_token}`,'Content-Type':'application/json'},
      body:JSON.stringify({audio_url:audioUrl})
    });
    if(!response.ok){
      let data=null; try{data=await response.json();}catch{}
      throw new Error(data?.error || `Could not remove old R2 audio (${response.status}).`);
    }
  }
  async function uploadMedia(file,bucket,kind,onProgress){
    if(!file) return null;
    if(kind==='image'){
      if(!IMAGE_TYPES.has(file.type)) throw new Error('Artwork must be a JPEG, PNG or WebP image.');
      if(file.size>IMAGE_MAX) throw new Error('Artwork is larger than the 12 MB limit.');
    } else {
      const ok=AUDIO_TYPES.has(file.type) || /\.(mp3|m4a|wav|flac)$/i.test(file.name);
      if(!ok) throw new Error('Audio must be MP3, M4A, WAV or FLAC.');
      if(file.size>AUDIO_MAX) throw new Error('Audio is larger than the current 200 MB limit.');
    }
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.user) throw new Error('Your contributor session has expired. Please sign in again.');
    if(!profile?.active) throw new Error('This account is not approved for uploads.');
    if(kind==='audio' && bucket==='r2-audio') return uploadR2Audio(file,session,onProgress);
    const token=(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36));
    const path=`${session.user.id}/${Date.now()}-${token}.${cleanExt(file)}`;
    const {error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type || undefined});
    if(error) throw error;
    return {bucket,path,url:kind==='audio' ? path : publicObjectUrl(bucket,path)};
  }
  async function cleanupUploads(items){
    await Promise.allSettled((items||[]).map(x=>x.bucket==='r2-audio' ? deleteR2Audio(x.path || x.url) : sb.storage.from(x.bucket).remove([x.path])));
  }

  function artworkStoragePath(url){
    if(!url) return '';
    const marker='/storage/v1/object/public/tsm-artwork/';
    const i=String(url).indexOf(marker);
    return i<0 ? '' : decodeURIComponent(String(url).slice(i+marker.length));
  }
  function shortMediaName(value){
    if(!value) return '';
    const clean=String(value).split('?')[0];
    return decodeURIComponent(clean.slice(clean.lastIndexOf('/')+1));
  }

  let editingTrack=null;
  function closeTrackEditor(){
    const wrap=qs('#trackEditWrap'), form=qs('#trackEditForm');
    if(wrap) wrap.hidden=true;
    if(form){ form.reset(); showMessage(form,''); }
    editingTrack=null;
  }
  async function openTrackEditor(id){
    const wrap=qs('#trackEditWrap'), form=qs('#trackEditForm');
    if(!wrap || !form) return;
    wrap.hidden=false;
    showMessage(form,'Loading track…');
    wrap.scrollIntoView({behavior:'smooth',block:'start'});
    const {data,error}=await sb.from('tracks').select('id,title,artist,genre,release_year,artwork_url,audio_url,status,created_by').eq('id',id).single();
    if(error){showMessage(form,error.message,true);return;}
    editingTrack=data;
    form.elements.id.value=data.id;
    form.elements.title.value=data.title || '';
    form.elements.artist.value=data.artist || '#TheSoulMixtape';
    form.elements.genre.value=data.genre || '';
    form.elements.release_year.value=data.release_year || '';
    const img=qs('#editTrackArtworkPreview');
    if(img){
      if(data.artwork_url){img.src=data.artwork_url;img.style.visibility='visible';}
      else{img.removeAttribute('src');img.style.visibility='hidden';}
    }
    const title=qs('#editTrackCurrentTitle'); if(title) title.textContent=data.title || 'Track';
    const status=qs('#editTrackStatus'); if(status) status.textContent=`Current status: ${data.status}. Saving edits will not change it.`;
    const audio=qs('#editTrackAudioCurrent'); if(audio) audio.textContent=data.audio_url ? `Current audio: ${shortMediaName(data.audio_url)}` : 'No audio currently attached.';
    showMessage(form,'');
  }

  async function saveTrackEdits(form){
    if(!editingTrack) return;
    const submit=qs('button[type="submit"]',form);
    const uploads=[];
    if(submit) submit.disabled=true;
    try{
      const raw=Object.fromEntries(new FormData(form).entries());
      const title=textValue(raw.title).trim();
      const artist=textValue(raw.artist).trim();
      if(!title) throw new Error('Track title is required.');
      if(!artist) throw new Error('Artist is required.');
      let artworkUrl=editingTrack.artwork_url || null;
      let audioPath=editingTrack.audio_url || null;
      const artFile=pickedFile(form,'artwork_file');
      const audioFile=pickedFile(form,'audio_file');
      if(artFile){
        showMessage(form,'Uploading replacement artwork…');
        const up=await uploadMedia(artFile,'tsm-artwork','image'); uploads.push(up); artworkUrl=up.url;
      }
      if(audioFile){
        showMessage(form,'Uploading replacement audio…');
        const up=await uploadMedia(audioFile,'r2-audio','audio',pct=>showMessage(form,`Uploading replacement audio… ${pct}%`)); uploads.push(up); audioPath=up.url;
      }
      showMessage(form,'Saving changes…');
      const patch={
        title,
        artist,
        genre:textValue(raw.genre).trim()||null,
        release_year:raw.release_year?Number(raw.release_year):null,
        artwork_url:artworkUrl,
        audio_url:audioPath
      };
      const {error}=await sb.from('tracks').update(patch).eq('id',editingTrack.id);
      if(error) throw error;

      // Only remove superseded media after the database points safely at the replacements.
      const old=[];
      if(artFile && editingTrack.artwork_url){
        const path=artworkStoragePath(editingTrack.artwork_url);
        if(path) old.push({bucket:'tsm-artwork',path});
      }
      if(audioFile && editingTrack.audio_url){
        if(String(editingTrack.audio_url).startsWith('r2:')) old.push({bucket:'r2-audio',path:editingTrack.audio_url});
        else if(!/^https?:\/\//i.test(editingTrack.audio_url)) old.push({bucket:'tsm-audio',path:editingTrack.audio_url});
      }
      if(old.length) await cleanupUploads(old);

      showMessage(form,'Changes saved.');
      await loadContentList();
      await loadPublishedContent();
      setTimeout(closeTrackEditor,350);
    }catch(error){
      if(uploads.length) await cleanupUploads(uploads);
      showMessage(form,error?.message || 'Could not save changes.',true);
    }finally{
      if(submit) submit.disabled=false;
    }
  }
  let editingPodcast=null;
  function closePodcastEditor(){
    const wrap=qs('#podcastEditWrap'), form=qs('#podcastEditForm');
    if(wrap) wrap.hidden=true;
    if(form){ form.reset(); showMessage(form,''); }
    editingPodcast=null;
  }
  async function openPodcastEditor(id){
    closeTrackEditor();
    const wrap=qs('#podcastEditWrap'), form=qs('#podcastEditForm');
    if(!wrap || !form) return;
    wrap.hidden=false;
    showMessage(form,'Loading episode…');
    wrap.scrollIntoView({behavior:'smooth',block:'start'});
    const {data,error}=await sb.from('podcast_episodes').select('id,title,description,episode_number,published_at,artwork_url,audio_url,status,created_by').eq('id',id).single();
    if(error){showMessage(form,error.message,true);return;}
    editingPodcast=data;
    form.elements.id.value=data.id;
    form.elements.title.value=data.title || '';
    form.elements.description.value=data.description || '';
    form.elements.episode_number.value=data.episode_number || '';
    form.elements.published_at.value=data.published_at ? new Date(data.published_at).toISOString().slice(0,10) : '';
    const img=qs('#editPodcastArtworkPreview');
    if(img){
      if(data.artwork_url){img.src=data.artwork_url;img.style.visibility='visible';}
      else{img.src='pod.png';img.style.visibility='visible';}
    }
    const title=qs('#editPodcastCurrentTitle'); if(title) title.textContent=data.title || 'Episode';
    const status=qs('#editPodcastStatus'); if(status) status.textContent=`Current status: ${data.status}. Saving edits will not change it.`;
    const audio=qs('#editPodcastAudioCurrent'); if(audio) audio.textContent=data.audio_url ? `Current audio: ${shortMediaName(data.audio_url)}` : 'No audio currently attached.';
    showMessage(form,'');
  }

  async function savePodcastEdits(form){
    if(!editingPodcast) return;
    const submit=qs('button[type="submit"]',form);
    const uploads=[];
    if(submit) submit.disabled=true;
    try{
      const raw=Object.fromEntries(new FormData(form).entries());
      const title=textValue(raw.title).trim();
      if(!title) throw new Error('Episode title is required.');
      let artworkUrl=editingPodcast.artwork_url || null;
      let audioPath=editingPodcast.audio_url || null;
      const artFile=pickedFile(form,'artwork_file');
      const audioFile=pickedFile(form,'audio_file');
      if(artFile){
        showMessage(form,'Uploading replacement artwork…');
        const up=await uploadMedia(artFile,'tsm-artwork','image'); uploads.push(up); artworkUrl=up.url;
      }
      if(audioFile){
        showMessage(form,'Uploading replacement audio…');
        const up=await uploadMedia(audioFile,'r2-audio','audio',pct=>showMessage(form,`Uploading replacement audio… ${pct}%`)); uploads.push(up); audioPath=up.url;
      }
      if(editingPodcast.status==='published' && !audioPath) throw new Error('A published episode must have an audio file.');
      showMessage(form,'Saving episode…');
      const patch={
        title,
        description:textValue(raw.description).trim()||null,
        episode_number:raw.episode_number?Number(raw.episode_number):null,
        published_at:raw.published_at?new Date(raw.published_at+'T12:00:00Z').toISOString():editingPodcast.published_at,
        artwork_url:artworkUrl,
        audio_url:audioPath
      };
      const {error}=await sb.from('podcast_episodes').update(patch).eq('id',editingPodcast.id);
      if(error) throw error;

      const old=[];
      if(artFile && editingPodcast.artwork_url){
        const path=artworkStoragePath(editingPodcast.artwork_url);
        if(path) old.push({bucket:'tsm-artwork',path});
      }
      if(audioFile && editingPodcast.audio_url){
        if(String(editingPodcast.audio_url).startsWith('r2:')) old.push({bucket:'r2-audio',path:editingPodcast.audio_url});
        else if(!/^https?:\/\//i.test(editingPodcast.audio_url)) old.push({bucket:'tsm-audio',path:editingPodcast.audio_url});
      }
      if(old.length) await cleanupUploads(old);

      showMessage(form,'Episode changes saved.');
      await loadContentList();
      await loadPublishedContent();
      setTimeout(closePodcastEditor,350);
    }catch(error){
      if(uploads.length) await cleanupUploads(uploads);
      showMessage(form,error?.message || 'Could not save episode.',true);
    }finally{
      if(submit) submit.disabled=false;
    }
  }

  let editingArticle=null;
  function closeArticleEditor(){
    const wrap=qs('#articleEditWrap'), form=qs('#articleEditForm');
    if(wrap) wrap.hidden=true;
    if(form){form.reset();showMessage(form,'');}
    const img=qs('#editArticleCoverPreview');
    if(img){img.removeAttribute('src');img.classList.add('is-empty');}
    editingArticle=null;
  }
  async function openArticleEditor(id){
    closeTrackEditor();
    closePodcastEditor();
    const wrap=qs('#articleEditWrap'), form=qs('#articleEditForm');
    if(!wrap || !form) return;
    wrap.hidden=false;
    showMessage(form,'Loading article…');
    wrap.scrollIntoView({behavior:'smooth',block:'start'});
    const {data,error}=await sb.from('articles').select('id,title,slug,excerpt,body,cover_url,status,published_at,created_by').eq('id',id).single();
    if(error){showMessage(form,error.message,true);return;}
    editingArticle=data;
    form.elements.id.value=data.id;
    form.elements.title.value=data.title || '';
    form.elements.slug.value=data.slug || '';
    form.elements.excerpt.value=data.excerpt || '';
    form.elements.body.value=data.body || '';
    const img=qs('#editArticleCoverPreview');
    if(img){
      if(data.cover_url){img.src=data.cover_url;img.classList.remove('is-empty');}
      else{img.removeAttribute('src');img.classList.add('is-empty');}
    }
    const title=qs('#editArticleCurrentTitle'); if(title) title.textContent=data.title || 'Feature';
    const status=qs('#editArticleStatus'); if(status) status.textContent=`Current status: ${data.status}.`;
    showMessage(form,'');
  }
  async function saveArticleEdits(form){
    if(!editingArticle) return;
    const submit=qs('button[type="submit"]',form);
    const uploads=[];
    if(submit) submit.disabled=true;
    try{
      const raw=Object.fromEntries(new FormData(form).entries());
      const title=textValue(raw.title).trim();
      if(!title) throw new Error('Article title is required.');
      const slug=slugifyArticle(raw.slug || title);
      if(!slug) throw new Error('A valid article slug is required.');
      let coverUrl=editingArticle.cover_url || null;
      const coverFile=pickedFile(form,'cover_file');
      if(coverFile){
        showMessage(form,'Uploading replacement cover…');
        const up=await uploadMedia(coverFile,'tsm-artwork','image');uploads.push(up);coverUrl=up.url;
      }
      showMessage(form,'Saving article…');
      const patch={
        title,slug,
        excerpt:textValue(raw.excerpt).trim()||null,
        body:textValue(raw.body).trim()||null,
        cover_url:coverUrl
      };
      const {error}=await sb.from('articles').update(patch).eq('id',editingArticle.id);
      if(error) throw error;
      if(coverFile && editingArticle.cover_url){
        const oldPath=artworkStoragePath(editingArticle.cover_url);
        if(oldPath) await cleanupUploads([{bucket:'tsm-artwork',path:oldPath}]);
      }
      showMessage(form,'Article changes saved.');
      await loadContentList();
      await loadPublishedContent();
      setTimeout(closeArticleEditor,350);
    }catch(error){
      if(uploads.length) await cleanupUploads(uploads);
      showMessage(form,error?.message || 'Could not save article.',true);
    }finally{
      if(submit) submit.disabled=false;
    }
  }

  async function saveWithUploads(form,table,buildPayload,specs){
    const submit=qs('button[type="submit"]',form);
    const uploads=[];
    if(submit) submit.disabled=true;
    try{
      const raw=Object.fromEntries(new FormData(form).entries());
      const urls={};
      for(const spec of specs){
        const file=pickedFile(form,spec.input);
        if(!file){ urls[spec.key]=null; continue; }
        showMessage(form,`Uploading ${spec.label}…`);
        const uploaded=await uploadMedia(file,spec.bucket,spec.kind,spec.kind==='audio'?pct=>showMessage(form,`Uploading ${spec.label}… ${pct}%`):null);
        uploads.push(uploaded); urls[spec.key]=uploaded.url;
      }
      showMessage(form,'Saving content…');
      const payload=buildPayload(raw,urls);
      const {error}=await sb.from(table).insert(payload);
      if(error) throw error;
      showMessage(form,'Saved.');
      form.reset();
      await loadContentList();
      await loadPublishedContent();
      return true;
    }catch(error){
      if(uploads.length) await cleanupUploads(uploads);
      showMessage(form,error?.message || 'Upload failed.',true);
      return false;
    }finally{
      if(submit) submit.disabled=false;
    }
  }

  const trackForm=qs('#trackForm');
  if(trackForm) trackForm.onsubmit=e=>{
    e.preventDefault();
    saveWithUploads(trackForm,'tracks',(r,u)=>({
      title:textValue(r.title).trim(),
      artist:textValue(r.artist).trim()||'#TheSoulMixtape',
      genre:textValue(r.genre).trim()||null,
      release_year:r.release_year?Number(r.release_year):null,
      artwork_url:u.artwork_url,
      audio_url:u.audio_url,
      status:r.status
    }),[
      {input:'artwork_file',key:'artwork_url',bucket:'tsm-artwork',kind:'image',label:'artwork'},
      {input:'audio_file',key:'audio_url',bucket:'r2-audio',kind:'audio',label:'audio'}
    ]);
  };

  const podcastForm=qs('#podcastForm');
  if(podcastForm) podcastForm.onsubmit=e=>{
    e.preventDefault();
    saveWithUploads(podcastForm,'podcast_episodes',(r,u)=>{
      const title=textValue(r.title).trim();
      if(!title) throw new Error('Episode title is required.');
      if(r.status==='published' && !u.audio_url) throw new Error('A published episode must have an audio file.');
      return {
        title,
        description:textValue(r.description).trim()||null,
        episode_number:r.episode_number?Number(r.episode_number):null,
        published_at:r.published_at?new Date(r.published_at+'T12:00:00Z').toISOString():(r.status==='published'?new Date().toISOString():null),
        artwork_url:u.artwork_url,
        audio_url:u.audio_url,
        status:r.status
      };
    },[
      {input:'artwork_file',key:'artwork_url',bucket:'tsm-artwork',kind:'image',label:'artwork'},
      {input:'audio_file',key:'audio_url',bucket:'r2-audio',kind:'audio',label:'audio'}
    ]);
  };

  const articleForm=qs('#articleForm');
  if(articleForm) articleForm.onsubmit=e=>{
    e.preventDefault();
    saveWithUploads(articleForm,'articles',(r,u)=>{
      const title=textValue(r.title).trim();
      if(!title) throw new Error('Article title is required.');
      const slug=slugifyArticle(r.slug || title);
      if(!slug) throw new Error('A valid article slug is required.');
      return {
        title,
        slug,
        excerpt:textValue(r.excerpt).trim()||null,
        body:textValue(r.body).trim()||null,
        cover_url:u.cover_url,
        status:r.status,
        published_at:r.status==='published'?new Date().toISOString():null
      };
    },[
      {input:'cover_file',key:'cover_url',bucket:'tsm-artwork',kind:'image',label:'cover image'}
    ]);
  };

  const settingsForm=qs('#settingsForm');
  if(settingsForm) settingsForm.onsubmit=async e=>{
    e.preventDefault(); if(profile?.role!=='admin'){showMessage(settingsForm,'Admin access required.',true);return;}
    showMessage(settingsForm,'Saving…');
    const fd=new FormData(settingsForm); const rows=[...fd.entries()].map(([key,value])=>({key,value:String(value)}));
    for(const row of rows){ const {error}=await sb.from('site_settings').upsert(row,{onConflict:'key'}); if(error){showMessage(settingsForm,error.message,true);return;} }
    showMessage(settingsForm,'Site info saved.'); await loadSiteSettings();
  };

  const trackEditForm=qs('#trackEditForm');
  if(trackEditForm) trackEditForm.onsubmit=e=>{e.preventDefault();saveTrackEdits(trackEditForm)};
  const cancelTrackEdit=qs('#cancelTrackEdit'); if(cancelTrackEdit) cancelTrackEdit.onclick=closeTrackEditor;
  const cancelTrackEditTop=qs('#cancelTrackEditTop'); if(cancelTrackEditTop) cancelTrackEditTop.onclick=closeTrackEditor;
  const podcastEditForm=qs('#podcastEditForm');
  if(podcastEditForm) podcastEditForm.onsubmit=e=>{e.preventDefault();savePodcastEdits(podcastEditForm)};
  const cancelPodcastEdit=qs('#cancelPodcastEdit'); if(cancelPodcastEdit) cancelPodcastEdit.onclick=closePodcastEditor;
  const cancelPodcastEditTop=qs('#cancelPodcastEditTop'); if(cancelPodcastEditTop) cancelPodcastEditTop.onclick=closePodcastEditor;
  const articleEditForm=qs('#articleEditForm');
  if(articleEditForm) articleEditForm.onsubmit=e=>{e.preventDefault();saveArticleEdits(articleEditForm)};
  const cancelArticleEdit=qs('#cancelArticleEdit'); if(cancelArticleEdit) cancelArticleEdit.onclick=closeArticleEditor;
  const cancelArticleEditTop=qs('#cancelArticleEditTop'); if(cancelArticleEditTop) cancelArticleEditTop.onclick=closeArticleEditor;

  async function loadContentList(){
    const list=qs('#contentList'); if(!list || !profile) return;
    list.innerHTML='<div class="empty">Loading…</div>';
    const [tr,po,ar]=await Promise.all([
      sb.from('tracks').select('id,title,status,created_by,created_at').order('created_at',{ascending:false}).limit(50),
      sb.from('podcast_episodes').select('id,title,status,created_by,created_at,published_at,audio_url').order('created_at',{ascending:false}).limit(50),
      sb.from('articles').select('id,title,status,created_by,created_at,published_at,cover_url').order('created_at',{ascending:false}).limit(50)
    ]);
    const rows=[...(tr.data||[]).map(x=>({...x,type:'Music',table:'tracks'})),...(po.data||[]).map(x=>({...x,type:'Podcast',table:'podcast_episodes'})),...(ar.data||[]).map(x=>({...x,type:'Article',table:'articles'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    if(!rows.length){list.innerHTML='<div class="empty">No database content yet. The demo sleeves on the public site remain as placeholders until you publish your first real item.</div>';return;}
    list.innerHTML=rows.map(x=>{
      const canManage=profile.role==='admin'||x.created_by===profile.user_id;
      const statusMeta=x.table==='podcast_episodes' ? ` data-published-at="${esc(x.published_at||'')}" data-has-audio="${x.audio_url?'1':'0'}"` : '';
      const primary=x.status==='published'
        ? `<button class="btn" data-status-table="${esc(x.table)}" data-status-id="${esc(x.id)}" data-status="draft"${statusMeta}>Unpublish</button>`
        : `<button class="btn" data-status-table="${esc(x.table)}" data-status-id="${esc(x.id)}" data-status="published"${statusMeta}>Publish</button>`;
      const archive=x.status==='archived'
        ? `<button class="btn" data-status-table="${esc(x.table)}" data-status-id="${esc(x.id)}" data-status="draft">Restore draft</button>`
        : `<button class="btn" data-status-table="${esc(x.table)}" data-status-id="${esc(x.id)}" data-status="archived">Archive</button>`;
      const edit=x.table==='tracks' ? `<button class="btn" data-edit-track="${esc(x.id)}">Edit</button>` : x.table==='podcast_episodes' ? `<button class="btn" data-edit-podcast="${esc(x.id)}">Edit</button>` : x.table==='articles' ? `<button class="btn" data-edit-article="${esc(x.id)}">Edit</button>` : '';
      return `<div class="content-row"><div><b>${esc(x.title)}</b><small>${esc(x.type)} · <span class="status-pill">${esc(x.status)}</span></small></div><div class="content-actions">${canManage?`${edit}${primary}${archive}<button class="btn danger" data-delete-table="${esc(x.table)}" data-delete-id="${esc(x.id)}">Delete</button>`:''}</div></div>`;
    }).join('');
    qsa('[data-edit-track]',list).forEach(btn=>btn.onclick=()=>{closePodcastEditor();closeArticleEditor();openTrackEditor(btn.dataset.editTrack)});
    qsa('[data-edit-podcast]',list).forEach(btn=>btn.onclick=()=>{closeArticleEditor();openPodcastEditor(btn.dataset.editPodcast)});
    qsa('[data-edit-article]',list).forEach(btn=>btn.onclick=()=>openArticleEditor(btn.dataset.editArticle));
    qsa('[data-status-id]',list).forEach(btn=>btn.onclick=async()=>{
      const next=btn.dataset.status;
      const label=next==='published'?'Publish this item?':next==='draft'?'Move this item back to Draft?':'Archive this item?';
      if(!confirm(label)) return;
      if(btn.dataset.statusTable==='podcast_episodes' && next==='published' && btn.dataset.hasAudio!=='1'){
        alert('Add an audio file before publishing this episode.');
        return;
      }
      btn.disabled=true;
      const patch={status:next};
      if(btn.dataset.statusTable==='articles'){
        patch.published_at=next==='published'?new Date().toISOString():null;
      }else if(btn.dataset.statusTable==='podcast_episodes' && next==='published' && !btn.dataset.publishedAt){
        patch.published_at=new Date().toISOString();
      }
      const {error}=await sb.from(btn.dataset.statusTable).update(patch).eq('id',btn.dataset.statusId);
      btn.disabled=false;
      if(error){alert(error.message);return;}
      await loadContentList();
      await loadPublishedContent();
    });
    qsa('[data-delete-id]',list).forEach(btn=>btn.onclick=async()=>{
      if(!confirm('Delete this item?')) return;
      let media=null;
      if(btn.dataset.deleteTable==='podcast_episodes'){
        const r=await sb.from('podcast_episodes').select('artwork_url,audio_url').eq('id',btn.dataset.deleteId).maybeSingle();
        if(r.error){alert(r.error.message);return;}
        media=r.data;
      }else if(btn.dataset.deleteTable==='articles'){
        const r=await sb.from('articles').select('cover_url').eq('id',btn.dataset.deleteId).maybeSingle();
        if(r.error){alert(r.error.message);return;}
        media=r.data ? {artwork_url:r.data.cover_url} : null;
      }
      const {error}=await sb.from(btn.dataset.deleteTable).delete().eq('id',btn.dataset.deleteId);
      if(error){alert(error.message);return;}
      if(media){
        const old=[];
        const artPath=artworkStoragePath(media.artwork_url);
        if(artPath) old.push({bucket:'tsm-artwork',path:artPath});
        if(media.audio_url){
          if(String(media.audio_url).startsWith('r2:')) old.push({bucket:'r2-audio',path:media.audio_url});
          else if(!/^https?:\/\//i.test(media.audio_url)) old.push({bucket:'tsm-audio',path:media.audio_url});
        }
        if(old.length) await cleanupUploads(old);
      }
      await loadContentList(); await loadPublishedContent();
    });
  }
  const refresh=qs('#refreshContent'); if(refresh) refresh.onclick=loadContentList;

  let authEventTimer=null;
  sb.auth.onAuthStateChange((event)=>{
    clearTimeout(authEventTimer);
    if(event==='SIGNED_OUT'){
      setDashboardState(null,null);
      return;
    }
    // Debounce auth events so sign-in/profile checks cannot race each other on Safari.
    authEventTimer=setTimeout(()=>refreshSessionUI(false),220);
  });
  loadSiteSettings();
  loadPublishedContent();
  setTimeout(()=>refreshSessionUI(false),80);
})();
