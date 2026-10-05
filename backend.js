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

  let passwordFlowActive=false;
  let teamUsers=[];

  function authReturnUrl(){
    return `${location.origin}${location.pathname}`;
  }

  function openDashPanel(id){
    qsa('.dash-tab').forEach(x=>x.classList.toggle('active',x.dataset.dash===id));
    qsa('.dash-panel').forEach(x=>x.classList.toggle('on',x.id===id));
    if(id==='teamPanel' && profile?.role==='admin') loadTeamList();
  }

  function showPasswordFlow(title, text){
    passwordFlowActive=true;
    if(typeof window.go==='function') window.go('contributors');
    const login=qs('#contributorLogin'), dash=qs('#contributorDashboard'), setup=qs('#passwordSetup');
    if(login) login.hidden=true;
    if(dash) dash.hidden=true;
    if(setup) setup.hidden=false;
    if(qs('#passwordSetupTitle')) qs('#passwordSetupTitle').textContent=title || 'Choose a new password';
    if(qs('#passwordSetupText')) qs('#passwordSetupText').textContent=text || 'Choose a strong new password for your contributor account.';
    const form=qs('#passwordSetupForm');
    if(form){ form.reset(); showMessage(form,''); }
  }

  function hidePasswordFlow(){
    passwordFlowActive=false;
    const setup=qs('#passwordSetup');
    if(setup) setup.hidden=true;
  }

  async function invokeTeamAdmin(action, payload={}){
    const {data,error}=await sb.functions.invoke('team-admin',{body:{action,...payload}});
    if(error){
      let message=error.message || 'Team administration request failed.';
      try{
        if(error.context && typeof error.context.json==='function'){
          const detail=await error.context.json();
          if(detail?.error) message=detail.error;
        }
      }catch{}
      throw new Error(message);
    }
    if(data?.error) throw new Error(data.error);
    return data || {};
  }

  function accountDate(value){
    if(!value) return 'Never';
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return 'Never';
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
  }

  function renderTeamList(users){
    teamUsers=users || [];
    const root=qs('#teamList');
    if(!root) return;
    if(!teamUsers.length){root.innerHTML='<div class="empty">No contributor accounts found.</div>';return;}
    root.innerHTML=teamUsers.map(u=>`<div class="team-row ${u.active?'':'inactive'}"><div class="team-person"><b>${esc(u.display_name||u.email||'Contributor')}${u.is_self?'<span class="team-self">You</span>':''}</b><span>${esc(u.email||'')}</span><small>${u.active?'Active':'Inactive'} · ${u.role==='admin'?'Administrator':'Contributor'} · Last sign-in: ${esc(accountDate(u.last_sign_in_at))}</small></div><div class="team-actions"><select data-team-role="${esc(u.id)}" ${u.is_self?'disabled':''} aria-label="Role for ${esc(u.display_name||u.email||'user')}"><option value="contributor" ${u.role==='contributor'?'selected':''}>Contributor</option><option value="admin" ${u.role==='admin'?'selected':''}>Administrator</option></select><button class="btn" type="button" data-team-reset="${esc(u.id)}">Send reset</button>${u.is_self?'':`<button class="btn ${u.active?'danger':''}" type="button" data-team-active="${esc(u.id)}" data-next-active="${u.active?'false':'true'}">${u.active?'Deactivate':'Reactivate'}</button>`}</div></div>`).join('');

    qsa('[data-team-role]',root).forEach(select=>select.addEventListener('change',async()=>{
      const user=teamUsers.find(x=>String(x.id)===String(select.dataset.teamRole));
      if(!user) return;
      const next=select.value;
      if(!confirm(`Change ${user.display_name || user.email} to ${next==='admin'?'Administrator':'Contributor'}?`)){renderTeamList(teamUsers);return;}
      select.disabled=true;
      try{await invokeTeamAdmin('set_role',{user_id:user.id,role:next});await loadTeamList();}
      catch(error){alert(error.message);await loadTeamList();}
    }));

    qsa('[data-team-active]',root).forEach(btn=>btn.addEventListener('click',async()=>{
      const user=teamUsers.find(x=>String(x.id)===String(btn.dataset.teamActive));
      if(!user) return;
      const active=btn.dataset.nextActive==='true';
      const verb=active?'reactivate':'deactivate';
      if(!confirm(`${verb[0].toUpperCase()+verb.slice(1)} ${user.display_name || user.email}?`)) return;
      btn.disabled=true;
      try{await invokeTeamAdmin('set_active',{user_id:user.id,active});await loadTeamList();}
      catch(error){alert(error.message);await loadTeamList();}
    }));

    qsa('[data-team-reset]',root).forEach(btn=>btn.addEventListener('click',async()=>{
      const user=teamUsers.find(x=>String(x.id)===String(btn.dataset.teamReset));
      if(!user?.email) return;
      btn.disabled=true;
      const {error}=await sb.auth.resetPasswordForEmail(user.email,{redirectTo:authReturnUrl()});
      btn.disabled=false;
      if(error){alert(error.message);return;}
      alert(`Password reset email sent to ${user.email}.`);
    }));
  }

  async function loadTeamList(){
    if(profile?.role!=='admin') return;
    const root=qs('#teamList');
    if(root) root.innerHTML='<div class="empty">Loading team…</div>';
    try{const data=await invokeTeamAdmin('list');renderTeamList(data.users || []);}
    catch(error){if(root) root.innerHTML=`<div class="empty">${esc(error.message)}</div>`;}
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
    const login=qs('#contributorLogin'), dash=qs('#contributorDashboard'), setup=qs('#passwordSetup');
    if(passwordFlowActive){
      if(login) login.hidden=true;
      if(dash) dash.hidden=true;
      if(setup) setup.hidden=false;
      return;
    }
    if(setup) setup.hidden=true;
    const allowed=!!(user && p && p.active);
    if(login) login.hidden=allowed;
    if(dash) dash.hidden=!allowed;
    if(allowed){
      qs('#welcomeContributor').textContent=`Signed in as ${p.display_name} · ${p.role}`;
      qsa('.admin-only').forEach(el=>el.classList.toggle('admin-hidden',p.role!=='admin'));
      loadContentList();
      if(p.role==='admin') loadTeamList();
    }
  }

  let authRefreshPromise=null;
  async function refreshSessionUI(showApprovalMessage=false){
    if(authRefreshPromise) return authRefreshPromise;
    authRefreshPromise=(async()=>{
      const {data:{session}}=await sb.auth.getSession();
      if(!session){ hidePasswordFlow(); setDashboardState(null,null); return false; }
      if(session.user?.user_metadata?.needs_password){
        showPasswordFlow('Set your contributor password','Your invitation has been accepted. Choose a password before entering The Back Room.');
        return false;
      }
      if(passwordFlowActive) return false;
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

  const forgotPasswordBtn=qs('#forgotPasswordBtn');
  if(forgotPasswordBtn) forgotPasswordBtn.onclick=async()=>{
    const email=qs('#loginEmail')?.value?.trim() || '';
    const loginForm=qs('#login');
    if(!email){showMessage(loginForm,'Enter your email address above first.',true);return;}
    showMessage(loginForm,'Sending password reset email…');
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:authReturnUrl()});
    if(error){showMessage(loginForm,error.message,true);return;}
    showMessage(loginForm,'If that email is registered, a secure password reset link has been sent.');
  };

  const passwordSetupForm=qs('#passwordSetupForm');
  if(passwordSetupForm) passwordSetupForm.onsubmit=async e=>{
    e.preventDefault();
    const password=passwordSetupForm.elements.password.value;
    const confirmPassword=passwordSetupForm.elements.confirm_password.value;
    if(password.length<10){showMessage(passwordSetupForm,'Use at least 10 characters.',true);return;}
    if(password!==confirmPassword){showMessage(passwordSetupForm,'The passwords do not match.',true);return;}
    showMessage(passwordSetupForm,'Saving new password…');
    const {error}=await sb.auth.updateUser({password,data:{needs_password:false}});
    if(error){showMessage(passwordSetupForm,error.message,true);return;}
    hidePasswordFlow();
    const ok=await refreshSessionUI(false);
    if(ok){
      openDashPanel('accountPanel');
      const accountForm=qs('#changePasswordForm');
      if(accountForm) showMessage(accountForm,'Password saved successfully.');
    }
  };

  const passwordSetupCancel=qs('#passwordSetupCancel');
  if(passwordSetupCancel) passwordSetupCancel.onclick=async()=>{
    await sb.auth.signOut();
    hidePasswordFlow();
    setDashboardState(null,null);
  };

  const changePasswordForm=qs('#changePasswordForm');
  if(changePasswordForm) changePasswordForm.onsubmit=async e=>{
    e.preventDefault();
    const password=changePasswordForm.elements.password.value;
    const confirmPassword=changePasswordForm.elements.confirm_password.value;
    if(password.length<10){showMessage(changePasswordForm,'Use at least 10 characters.',true);return;}
    if(password!==confirmPassword){showMessage(changePasswordForm,'The passwords do not match.',true);return;}
    showMessage(changePasswordForm,'Changing password…');
    const {error}=await sb.auth.updateUser({password});
    if(error){showMessage(changePasswordForm,error.message,true);return;}
    changePasswordForm.reset();
    showMessage(changePasswordForm,'Password changed successfully.');
  };

  const inviteUserForm=qs('#inviteUserForm');
  if(inviteUserForm) inviteUserForm.onsubmit=async e=>{
    e.preventDefault();
    if(profile?.role!=='admin'){showMessage(inviteUserForm,'Administrator access required.',true);return;}
    const displayName=inviteUserForm.elements.display_name.value.trim();
    const email=inviteUserForm.elements.email.value.trim();
    const role=inviteUserForm.elements.role.value;
    showMessage(inviteUserForm,'Sending invitation…');
    try{
      await invokeTeamAdmin('invite',{display_name:displayName,email,role,redirect_to:authReturnUrl()});
      inviteUserForm.reset();
      inviteUserForm.elements.role.value='contributor';
      showMessage(inviteUserForm,`Invitation sent to ${email}.`);
      await loadTeamList();
    }catch(error){showMessage(inviteUserForm,error.message,true);}
  };

  const refreshTeam=qs('#refreshTeam');
  if(refreshTeam) refreshTeam.onclick=loadTeamList;

  qsa('.dash-tab').forEach(btn=>btn.addEventListener('click',()=>openDashPanel(btn.dataset.dash)));

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
  async function uploadR2Artwork(file,session){
    const response=await fetch(`${AUDIO_WORKER_URL}/artwork/upload`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${session.access_token}`,'Content-Type':file.type},
      body:file
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new Error(data?.error || `Could not upload artwork (${response.status}).`);
    if(!data?.key || artworkStoragePath(data.artwork_url)!==`r2:${data.key}`) throw new Error('The artwork service returned an invalid response.');
    return {bucket:'tsm-artwork',path:`r2:${data.key}`,url:data.artwork_url};
  }
  async function deleteR2Artwork(path){
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token) throw new Error('Your contributor session has expired. Please sign in again.');
    const response=await fetch(`${AUDIO_WORKER_URL}/artwork/object`,{
      method:'DELETE',
      headers:{'Authorization':`Bearer ${session.access_token}`,'Content-Type':'application/json'},
      body:JSON.stringify({key:path.slice(3)})
    });
    if(!response.ok){
      const data=await response.json().catch(()=>null);
      throw new Error(data?.error || `Could not remove old artwork (${response.status}).`);
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
    if(kind==='image') return uploadR2Artwork(file,session);
    const token=(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36));
    const path=`${session.user.id}/${Date.now()}-${token}.${cleanExt(file)}`;
    const {error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type || undefined});
    if(error) throw error;
    return {bucket,path,url:kind==='audio' ? path : publicObjectUrl(bucket,path)};
  }
  async function cleanupUploads(items){
    await Promise.allSettled((items||[]).map(x=>{
      if(x.bucket==='r2-audio') return deleteR2Audio(x.path || x.url);
      if(x.bucket==='tsm-artwork' && String(x.path).startsWith('r2:')) return deleteR2Artwork(x.path);
      return sb.storage.from(x.bucket).remove([x.path]);
    }));
  }

  function artworkStoragePath(url){
    if(!url) return '';
    try{
      const parsed=new URL(url);
      if(parsed.origin===new URL(AUDIO_WORKER_URL).origin && /^\/artwork\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(parsed.pathname)){
        return `r2:${parsed.pathname.slice('/artwork/'.length)}`;
      }
    }catch{return '';}
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
      uploads.length=0; // Saved media must survive any subsequent UI refresh failure.

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
      uploads.length=0; // Saved media must survive any subsequent UI refresh failure.

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
      uploads.length=0; // Saved media must survive any subsequent UI refresh failure.
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
      uploads.length=0; // Saved media must survive any subsequent UI refresh failure.
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
  sb.auth.onAuthStateChange((event, session)=>{
    clearTimeout(authEventTimer);
    if(event==='PASSWORD_RECOVERY'){
      showPasswordFlow('Reset your password','Choose a new password for your #TheSoulMixtape contributor account.');
      return;
    }
    if(event==='SIGNED_OUT'){
      hidePasswordFlow();
      setDashboardState(null,null);
      return;
    }
    if(event==='SIGNED_IN' && session?.user?.user_metadata?.needs_password){
      showPasswordFlow('Set your contributor password','Your invitation has been accepted. Choose a password before entering The Back Room.');
      return;
    }
    // Debounce auth events so sign-in/profile checks cannot race each other on Safari.
    authEventTimer=setTimeout(()=>refreshSessionUI(false),220);
  });
  loadSiteSettings();
  loadPublishedContent();
  setTimeout(()=>refreshSessionUI(false),80);
})();

// v44.13 opt-in migration panel. Uses existing authenticated APIs and RLS.
(function () {
  if (new URLSearchParams(location.search).get('artworkMigration') !== '1') return;
  const records = [{"kind":"tracks","id":"94b3ab90-9619-4b18-a59b-9d4590f8ca4d","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788720222027-7385363b-a402-4147-8e6a-58ca5192db2e.png","filename":"7385363b-a402-4147-8e6a-58ca5192db2e.png","bytes":3094181,"sha256":"352c9b47457339d40b21e39118620f1b9e924338e2a52ab4ad550edee12c8e3e"},{"kind":"tracks","id":"d05d3bb5-2917-4256-a9e9-9e964f8e1cdb","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787499376679-d184a47c-0795-4025-a433-61d1ea771df7.jpeg","filename":"d184a47c-0795-4025-a433-61d1ea771df7.jpg","bytes":147931,"sha256":"2d7c34bf6a5f8d895159935b782dcc3af855c1cc277015f0e16151d500e42309"},{"kind":"tracks","id":"937eb1d0-eb24-41aa-8f8e-924da727f0bb","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787499538133-12bf9cb6-7341-4187-acab-2115f30645db.jpeg","filename":"12bf9cb6-7341-4187-acab-2115f30645db.jpg","bytes":293146,"sha256":"c9461369960768229464ec8505bfc4c782cea43aedc7414428c6c2e30a28588e"},{"kind":"tracks","id":"ed67d1d6-abc3-448a-afaf-8b132bbc20ec","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788105857692-e32f1f4d-49d6-4b0c-8812-f27b61f26106.png","filename":"e32f1f4d-49d6-4b0c-8812-f27b61f26106.png","bytes":3259429,"sha256":"7e93cc17fce15ad81a026f1b7ff3bf32ca6db8604fedb6b338e8917e8d674c1a"},{"kind":"tracks","id":"e9033a54-74fd-4ac3-9fd1-c37315ebca78","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787498936126-4db300ed-0dd7-43fb-949e-a39f7e73f28d.jpeg","filename":"4db300ed-0dd7-43fb-949e-a39f7e73f28d.jpg","bytes":335604,"sha256":"bf69b3e9dfe1494eb4f4be782510cab4fd2a6a695a1a228cd8add2912345648a"},{"kind":"tracks","id":"acf7885f-bebd-4c43-a78b-c11c66cb49cc","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788050930685-ae9750f2-cda6-455b-97b8-40feca9a95d7.png","filename":"ae9750f2-cda6-455b-97b8-40feca9a95d7.png","bytes":3343180,"sha256":"d640ce9d2ef4a3e988f5a6aeff025d82211e5f7633051c35a456b4e64bcd56d3"},{"kind":"tracks","id":"5e23f10d-ce24-44ec-a9ea-d9ba28b3fd0e","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787414438512-10ee7c2f-dfff-49f6-999d-5dceb4cd09a9.jpeg","filename":"10ee7c2f-dfff-49f6-999d-5dceb4cd09a9.jpg","bytes":176507,"sha256":"165ea76185c84a95629e537bb41f2b450aa13a9b9e47637c7760b80831acd6eb"},{"kind":"tracks","id":"7e54e998-ff15-4c85-8850-9acb33300f3a","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787499450840-6bb5abd9-7f61-428e-b389-8a43a382f4b1.jpeg","filename":"6bb5abd9-7f61-428e-b389-8a43a382f4b1.jpg","bytes":298228,"sha256":"1cb611ffd5d061608d6731f1a80264708d001a8aa38e2cd387616ce949308463"},{"kind":"tracks","id":"71924a84-ae93-4924-abef-fedb4d94be42","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787492904269-40ae61e4-64ca-4097-9c38-3c06378cf4bb.jpeg","filename":"40ae61e4-64ca-4097-9c38-3c06378cf4bb.jpg","bytes":318265,"sha256":"7ed486523c00299edbbf179738677f1aff62b75332a8adb984e9e8638ccf8efb"},{"kind":"tracks","id":"f8733aee-13ed-49d0-a27e-3164412729cd","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787955404340-308b2a74-6628-48e8-9187-e5701faa8af7.png","filename":"308b2a74-6628-48e8-9187-e5701faa8af7.png","bytes":3487716,"sha256":"a3fca0c8139c54e9783d3ac5cd1be3d28030b90f8090ae752d4b849e61af742c"},{"kind":"tracks","id":"ee247ba8-05fa-4ada-a0da-8e3ed64f7f58","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787499295884-1712cc0d-2a1f-4e16-9772-a5e7239374ca.jpeg","filename":"1712cc0d-2a1f-4e16-9772-a5e7239374ca.jpg","bytes":836787,"sha256":"d6852693303e5b863bd384193ebbca831d29ed933e19083a33ad4e784fd2e4e1"},{"kind":"tracks","id":"15d51129-4d00-4f7b-95e9-da61f25a2b28","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788106441350-4e24db8d-9d75-4ec6-9c21-52fc9b1b89bc.png","filename":"4e24db8d-9d75-4ec6-9c21-52fc9b1b89bc.png","bytes":3768307,"sha256":"a5ffd8d3246e1fae449e41c17f140c3d8e411565ddec8ecdc5f208108b6c72ee"},{"kind":"tracks","id":"91b2b372-cfb7-46d0-bd30-9ccf84f98fd4","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788050960120-986aac75-bf59-4427-8699-55b9a75f8bef.png","filename":"986aac75-bf59-4427-8699-55b9a75f8bef.png","bytes":3261942,"sha256":"925ae47ba0d3008397e111254b442b68f5dff9036fd8ad69b47114fbea8c0561"},{"kind":"tracks","id":"2a592562-3d00-4bc9-a6a0-90b35bb0d713","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788483863787-42f6a0c5-5556-4bad-a46b-50e4b56bc0f1.jpeg","filename":"42f6a0c5-5556-4bad-a46b-50e4b56bc0f1.jpg","bytes":1202598,"sha256":"ed042d9af111c9f90133967a45f0e42cc9df53729c8e23b2e5bed50730f96a11"},{"kind":"tracks","id":"9f7cec90-89a7-4d2c-9ea9-d4d8d07c6590","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788482804042-6b71db3e-3625-400d-b7eb-51f1abe285ae.png","filename":"6b71db3e-3625-400d-b7eb-51f1abe285ae.png","bytes":2218820,"sha256":"c5b058fba98ad5542c4391cd4259bfcc760ff3861f553d64ba72bf5dfa9bfbcf"},{"kind":"tracks","id":"c180c24b-99dc-4ea4-9206-a6f7a62a706c","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1789034359375-8ecf6fb3-6ade-4dd3-9341-ef977eb0b48f.png","filename":"8ecf6fb3-6ade-4dd3-9341-ef977eb0b48f.png","bytes":3434281,"sha256":"09e7341b8d62289284d4673f93cb8e32571bd9c634c7d1bf27000535b3b15e54"},{"kind":"tracks","id":"89be3bd4-c0e6-485c-954b-e446254ba96c","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1789034497120-24107d4a-5912-4df9-a900-3a294fcf07c7.png","filename":"24107d4a-5912-4df9-a900-3a294fcf07c7.png","bytes":3512544,"sha256":"4217f94b2c06c74630b0040051128cd7c32a761b71f7d87f896ae9d454bdab58"},{"kind":"podcast_episodes","id":"5b6bbfbb-aca9-43eb-a0bd-cac915c59eb5","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103122774-b7df2b7a-28c5-4fab-b953-ac1a7c210ab2.png","filename":"b7df2b7a-28c5-4fab-b953-ac1a7c210ab2.png","bytes":2510304,"sha256":"3b858fd6ff0edf39071185bf00b7c835c019926ed4894bd5f9892b1245a9ac77"},{"kind":"podcast_episodes","id":"56d1e1c3-23b6-451c-a9b0-04d3ce7422ac","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104262881-136f8ace-9cd3-47b3-a05e-1f0cc571bb84.png","filename":"136f8ace-9cd3-47b3-a05e-1f0cc571bb84.png","bytes":3674914,"sha256":"95172da1721ae6a4d6dc4db2400e626fae5922f0176c6f56b39ac011389281e9"},{"kind":"podcast_episodes","id":"1bd81660-58f2-4672-a4a0-daf76b355106","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103288334-97faa313-1a76-4e8b-9bb7-ce4f053d502e.png","filename":"97faa313-1a76-4e8b-9bb7-ce4f053d502e.png","bytes":2990349,"sha256":"2a997cb4fdcfc6f3822441f4205a7b9aac7d2b3fe287e41c409db5390f204e84"},{"kind":"podcast_episodes","id":"5c00acbb-bfa3-47ae-a1b0-eeb181d93cde","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103173552-66dbe3ef-c1eb-41ea-b6e1-dcac83afea83.png","filename":"66dbe3ef-c1eb-41ea-b6e1-dcac83afea83.png","bytes":2879080,"sha256":"d8f7d3937d35f36335bed9d435dd46ef8ee9049f004aabaa19771a867dabd756"},{"kind":"podcast_episodes","id":"87914936-5bf7-4998-b335-5cb52a2a1153","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103537021-db567ba0-154d-4320-bdf8-2b1927304600.png","filename":"db567ba0-154d-4320-bdf8-2b1927304600.png","bytes":2921767,"sha256":"f831f0e8e027e5d8ea9bd4f0cae4c5d154c93a7530a5f778a6bd87d152ece567"},{"kind":"podcast_episodes","id":"94f8b14e-429f-4e33-a27c-96b660c894ed","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103374950-f485b571-f453-4a23-8a19-91b3a097d7c1.png","filename":"f485b571-f453-4a23-8a19-91b3a097d7c1.png","bytes":3260611,"sha256":"e8c55be23c4eaeb62a5f969ec4f7214507aa2598294a9c415a7b011a6b13c3a2"},{"kind":"podcast_episodes","id":"52af1f22-f9d2-410b-8a43-5a92fa442a23","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103778345-eaf0576e-98a0-44ab-ad3e-d2154c4a0c17.png","filename":"eaf0576e-98a0-44ab-ad3e-d2154c4a0c17.png","bytes":2723957,"sha256":"d921eb8b9a881d7f6468c4008b85999d248c18426b2c3cc655737a8e871bdaa9"},{"kind":"podcast_episodes","id":"f88d043c-78a2-46fc-a602-0661a1fe334a","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104343592-0769d464-bfd9-4a4a-bd9e-8b0d852657fd.png","filename":"0769d464-bfd9-4a4a-bd9e-8b0d852657fd.png","bytes":3222172,"sha256":"08b21fdcf23149738a510b15dbc5b8806c2153527968bec3bc9e7e43ed1a3fe6"},{"kind":"podcast_episodes","id":"b8ad41b9-5156-4681-b9e9-8004e5213b98","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104478025-7c3ef512-afa1-4960-a3e9-5441b03f2934.png","filename":"7c3ef512-afa1-4960-a3e9-5441b03f2934.png","bytes":3017421,"sha256":"775f8b39d26d5abd3d5e8721f490c542411a31d81c9eedf459a0c243161ca3f2"},{"kind":"podcast_episodes","id":"ccc1fee5-ab67-4312-8f2d-5db02a1dbe38","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104418291-301ffbc5-d7fb-40b5-9de7-a77bae1504e1.png","filename":"301ffbc5-d7fb-40b5-9de7-a77bae1504e1.png","bytes":2666764,"sha256":"4fae8af4056fcc4939ebcf7817d84f82133d85b26ba5545fee7b5d3294003893"},{"kind":"podcast_episodes","id":"6536bf4c-a124-444d-8a9a-1938bb95ad36","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103832316-3e3eee6a-0aed-4019-aad9-2004acc79e20.png","filename":"3e3eee6a-0aed-4019-aad9-2004acc79e20.png","bytes":2317673,"sha256":"44cbb2a9f9a75368673385739cf43bb3a7ead50da6b6e129d9b163dae7cc56fe"},{"kind":"podcast_episodes","id":"aeb1c29a-c9ea-47b8-8ce7-ce4630558971","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104191925-2de6a6d9-f2c2-48b6-8f23-293a1f605ee8.png","filename":"2de6a6d9-f2c2-48b6-8f23-293a1f605ee8.png","bytes":3222764,"sha256":"8b00efda86ce7e4c04000d52a7323a94a3f95cbde1d4eac67c55babfef0f770c"},{"kind":"podcast_episodes","id":"aa0ac4b3-58da-4916-9517-35ef21a7cb3e","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104117982-befe2853-cb60-4ce7-83bf-0d05bc4c5977.png","filename":"befe2853-cb60-4ce7-83bf-0d05bc4c5977.png","bytes":3280167,"sha256":"18542b3ff890562a6e748ab7f181c231d0f76e27d698c36225431b07c9fd64c8"},{"kind":"podcast_episodes","id":"5197113c-8e61-4434-8029-17ea5d8f69c0","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104029430-a9c76184-2a18-434c-ad06-724be5f48de7.png","filename":"a9c76184-2a18-434c-ad06-724be5f48de7.png","bytes":2859376,"sha256":"9d0d0792943852d9b8eb0b9b9929c94aaaa842fba10544671ae42fb4b270f0c9"},{"kind":"podcast_episodes","id":"a5156511-4c94-4ed0-8967-f651860ceb09","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103922354-8f12e29c-1f21-44fd-9bbb-ffad77825c32.png","filename":"8f12e29c-1f21-44fd-9bbb-ffad77825c32.png","bytes":2870834,"sha256":"ca0f97995ba30f81a2a2e934c754edb4f27df0757e231f526625cd91264dcf8a"},{"kind":"podcast_episodes","id":"1dc34f17-f9ac-4671-8e04-d44c2f8d55b7","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103724852-74d381b9-608d-449a-bb5e-205c2d22edff.png","filename":"74d381b9-608d-449a-bb5e-205c2d22edff.png","bytes":2985671,"sha256":"ac2fc353db2219ec6a7bcd43455504b9b2a77403e5c85c198b275143f8435cf2"},{"kind":"podcast_episodes","id":"42dd7c3b-646c-4d1b-86b9-82f276440794","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103414754-8d4d0547-e17c-485e-82b0-844f6f0800ca.png","filename":"8d4d0547-e17c-485e-82b0-844f6f0800ca.png","bytes":2921767,"sha256":"f831f0e8e027e5d8ea9bd4f0cae4c5d154c93a7530a5f778a6bd87d152ece567"},{"kind":"podcast_episodes","id":"cfdab427-6f84-4b0a-baf8-7aa30a9d1b5e","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788102971590-2bfa2c78-55cf-46cd-b575-34fee8941908.png","filename":"2bfa2c78-55cf-46cd-b575-34fee8941908.png","bytes":2800074,"sha256":"dab4398b96edc3ba3d5d4683754321d8a1989b1cbf0ad452eb91fdf13f50dbf7"},{"kind":"podcast_episodes","id":"dcbc632a-8968-45c2-95fe-8b6981452420","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788104553825-9896bee7-5130-4e22-b6f4-f15ef8bfbcf0.png","filename":"9896bee7-5130-4e22-b6f4-f15ef8bfbcf0.png","bytes":2380282,"sha256":"f26af568628504efa184c5ee82d04eda3943e400f3a4c179a02ae94a13e0a30d"},{"kind":"podcast_episodes","id":"89e8e3a8-c17e-40bf-992e-25aae84cecb1","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103676700-a3e5e36e-d83b-47fd-adca-ba19d1691c61.png","filename":"a3e5e36e-d83b-47fd-adca-ba19d1691c61.png","bytes":2577740,"sha256":"42cd1e80832647f9721f9a9a7a2bc46dc07541347e6f4b35d1c129348ac6225b"},{"kind":"podcast_episodes","id":"d7e5cd5d-595d-4bca-9fcb-9fab6d4a3a08","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1788103221258-ba199a96-a89c-47d9-a3d6-f3ac4a0e559a.png","filename":"ba199a96-a89c-47d9-a3d6-f3ac4a0e559a.png","bytes":2786964,"sha256":"b83432d3050bb0255e565ab40022c644b952b3d249ac0fa65197592c32eb2595"},{"kind":"articles","id":"d113b47d-6ca5-49b5-bd65-9f5b49085099","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1787671810507-dbc594b3-5987-4bef-b8ce-4098115802fa.png","filename":"dbc594b3-5987-4bef-b8ce-4098115802fa.png","bytes":2620210,"sha256":"28340e826e5242c23a8d56d933cd56e0f11a3577de1b6e374885d20c21e48fda"},{"kind":"articles","id":"47f548cb-6d69-4008-bd78-7295d45c6268","url":"https://yzeprmubwogcscmnvoow.supabase.co/storage/v1/object/public/tsm-artwork/60663e87-e2ac-453f-ac6d-8c659ae666fc/1789083109594-5528774e-4631-464c-a08c-bdc7b4266eef.png","filename":"5528774e-4631-464c-a08c-bdc7b4266eef.png","bytes":3822654,"sha256":"6eed590da00d28741895610db43cf8c14304fe44f16f86485648fe841c964dda"}];
  const sb = window.tsmSupabase;
  const worker = 'https://thesoulmixtape-media.thesoulmixtape.workers.dev';
  const storageKey = 'tsm-artwork-migration-v4413-20261005';
  const panel = document.createElement('section');
  panel.style.cssText = 'position:fixed;inset:8px;z-index:2147483647;background:#fff;color:#111;padding:24px;overflow:auto;font:18px/1.5 system-ui';
  panel.innerHTML = '<h2>Artwork migration</h2><p>Sign in as administrator in The Back Room first, on this same preview address. Keep this tab open during copying.</p><p>Step 1 copies and checks 40 covers. Step 2 changes artwork links in the shared database, affecting both preview and live websites. No originals, audio or empty uploads will be deleted.</p><button id="art-copy">1. Copy and verify covers</button> <button id="art-switch" disabled>2. Switch verified links</button> <button id="art-close">Close</button><pre id="art-log" style="white-space:pre-wrap" role="status" aria-live="polite">Ready. Nothing has changed.</pre>';
  document.body.append(panel);
  const copy = panel.querySelector('#art-copy'), change = panel.querySelector('#art-switch');
  const close = panel.querySelector('#art-close'), log = panel.querySelector('#art-log');
  for (const b of [copy,change,close]) b.style.cssText = 'padding:16px;margin:6px;font:inherit';
  close.onclick = () => panel.remove();
  let busy = false, verified = false, saved = {};
  function note(s) { log.textContent = s; }
  function save() { localStorage.setItem(storageKey, JSON.stringify(saved)); }
  function column(r) { return r.kind === 'articles' ? 'cover_url' : 'artwork_url'; }
  function validURL(url) {
    if (typeof url !== 'string') return false;
    const u = new URL(url);
    return u.origin === worker && !u.search && !u.hash && /^\/artwork\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(u.pathname);
  }
  async function admin() {
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) throw new Error('Please sign in through The Back Room on this preview address, then reopen this page.');
    const p = await sb.from('profiles').select('role,active').eq('user_id',data.user.id).single();
    if (p.error || !p.data?.active || p.data.role !== 'admin') throw new Error('An active administrator account is required.');
    const s = await sb.auth.getSession();
    if (s.error || !s.data?.session?.access_token) throw new Error('Session expired. Sign in again.');
    return s.data.session.access_token;
  }
  async function checkedBytes(url,r) {
    const res = await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(90000)});
    if (!res.ok) throw new Error('Image request failed: HTTP '+res.status);
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!['image/png','image/jpeg','image/webp'].includes(type)) throw new Error('Unexpected image content type.');
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength !== r.bytes) throw new Error('Image size mismatch; no link changed.');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    if (hash !== r.sha256) throw new Error('Image checksum mismatch; no link changed.');
    return new Blob([bytes],{type});
  }
  async function current(r) {
    const result = await sb.from(r.kind).select(column(r)).eq('id',r.id).single();
    if (result.error) throw result.error;
    return result.data[column(r)];
  }
  async function copyAll() {
    await admin();
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid saved progress. Stop and ask for help.');
    save(); // Check progress storage before uploading anything.
    let count = 0;
    for (const r of records) {
      note('Copy/check '+(count+1)+' of '+records.length+'…');
      const existing = await current(r);
      if (existing !== r.url && existing !== saved[r.id]) throw new Error('Artwork was changed since the migration was prepared: '+r.id+'. Stopped without overwriting it.');
      if (!saved[r.id]) {
        const bytes = await checkedBytes(r.url,r);
        const token = await admin();
        const res = await fetch(worker+'/artwork/upload',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':bytes.type},body:bytes,signal:AbortSignal.timeout(90000)});
        const uploaded = await res.json();
        if (!res.ok) throw new Error(uploaded.error || 'Upload failed: HTTP '+res.status);
        if (!validURL(uploaded.artwork_url) || uploaded.artwork_url !== worker+'/artwork/'+uploaded.key) throw new Error('Unexpected upload response.');
        saved[r.id] = uploaded.artwork_url;
        save(); // Resume this exact upload if verification is interrupted.
      }
      if (!validURL(saved[r.id])) throw new Error('Invalid saved destination.');
      await checkedBytes(saved[r.id],r);
      count++;
    }
    verified = true;
    note('All '+count+' covers copied and checksum-verified. Links have not been switched by Step 1. Step 2 affects the live site too.');
  }
  async function switchAll() {
    if (!verified) throw new Error('Run Step 1 first.');
    if (!confirm('Switch these 40 artwork links in the shared live/preview database? Originals stay in Supabase.')) return;
    await admin();
    // Preflight the entire set before the first database write.
    for (const r of records) {
      note('Rechecking all copies before switching: '+r.filename);
      if (!validURL(saved[r.id])) throw new Error('Missing verified destination.');
      await checkedBytes(saved[r.id],r);
      const url = await current(r);
      if (url !== r.url && url !== saved[r.id]) throw new Error('Concurrent artwork change. No further links will be switched.');
    }
    let count = 0;
    for (const r of records) {
      await admin();
      const col = column(r), next = saved[r.id];
      if (await current(r) !== next) {
        const result = await sb.from(r.kind).update({[col]:next}).eq('id',r.id).eq(col,r.url).select('id');
        if (result.error) throw result.error;
        if (result.data?.length !== 1) throw new Error('Record changed or update denied; stopped.');
      }
      if (await current(r) !== next) throw new Error('Database read-back verification failed.');
      note('Switched and checked '+(++count)+' of '+records.length+'.');
    }
    note('Complete: all '+count+' links switched and read back. Originals remain untouched. Tell Codex to run independent checks.');
  }
  async function run(action) {
    if (busy) return;
    busy = true; copy.disabled = change.disabled = close.disabled = true;
    try { await action(); } catch(e) { verified = false; note('Stopped: '+e.message+'\nProgress is retained in this browser. If Step 2 had started, some verified links may already be switched. Originals were not deleted. Use Step 1 to recheck/resume.'); }
    finally { busy=false;copy.disabled=false;close.disabled=false;change.disabled=!verified; }
  }
  copy.onclick = () => { verified=false;return run(copyAll); };
  change.onclick = () => run(switchAll);
})();

