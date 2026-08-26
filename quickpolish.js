(() => {
  'use strict';

  const style = document.createElement('style');
  style.id = 'quick-polish-v4471';
  style.textContent = `
    .quick-random-row{display:flex;justify-content:flex-end;margin-top:11px}
    .quick-random{border:1px solid #75683f;background:#17130f;color:#ede4ce;border-radius:7px;padding:10px 14px;text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:700;cursor:pointer}
    .quick-random:active{transform:translateY(1px)}
    #home .cards .card.quick-link-card{cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
    #home .cards .card.quick-link-card:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
    #home .cards .card.quick-link-card .quick-open{margin-top:10px;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;font-size:9px;font-weight:700}
    #quickBackTop{position:fixed;right:18px;bottom:150px;z-index:39;border:1px solid var(--gold);background:#17130ef2;color:var(--gold);border-radius:999px;padding:10px 13px;text-transform:uppercase;letter-spacing:.09em;font-size:9px;font-weight:700;cursor:pointer;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .18s ease,transform .18s ease}
    #quickBackTop.on{opacity:1;pointer-events:auto;transform:translateY(0)}
    @media(hover:hover){#home .cards .card.quick-link-card:hover{transform:translateY(-3px);border-color:var(--gold);box-shadow:0 10px 24px #0005}}
    @media(max-width:850px){.quick-random-row{justify-content:stretch}.quick-random{width:100%;height:41px}#quickBackTop{right:12px;bottom:128px;padding:9px 11px}}
  `;
  document.head.appendChild(style);

  const catalogTools = document.querySelector('.catalog-tools');
  const catalogMain = catalogTools?.querySelector('.catalog-tools-main');
  if(catalogTools && catalogMain){
    const row = document.createElement('div');
    row.className = 'quick-random-row';
    const randomButton = document.createElement('button');
    randomButton.type = 'button';
    randomButton.className = 'quick-random';
    randomButton.textContent = 'Random Dig';
    randomButton.title = 'Play a random release';
    randomButton.addEventListener('click', () => {
      if(typeof tracks === 'undefined' || !Array.isArray(tracks) || !tracks.length) return;
      const pick = tracks[Math.floor(Math.random() * tracks.length)];
      if(pick && typeof window.play === 'function') window.play(pick[0]);
    });
    row.appendChild(randomButton);
    catalogMain.insertAdjacentElement('afterend', row);
  }

  const crateCards = Array.from(document.querySelectorAll('#home .cards .card'));
  const destinations = [
    {selector:'#crates .radio-grid', label:'Open Radio Shows'},
    {selector:'#crates .playlist-grid', label:'Open Playlists'},
    {selector:'#crates .feature-grid', label:'Open Features'}
  ];

  function openCrates(selector){
    if(typeof go === 'function') go('crates');
    else document.querySelector('#nav [data-go="crates"]')?.click();
    setTimeout(() => {
      const target = document.querySelector(selector);
      if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
  }

  crateCards.slice(0, 3).forEach((card, index) => {
    const destination = destinations[index];
    if(!destination) return;
    card.classList.add('quick-link-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', destination.label);
    const cue = document.createElement('span');
    cue.className = 'quick-open';
    cue.textContent = 'Open →';
    card.appendChild(cue);
    card.addEventListener('click', event => {
      if(event.target.closest('a,button')) return;
      openCrates(destination.selector);
    });
    card.addEventListener('keydown', event => {
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        openCrates(destination.selector);
      }
    });
  });

  const backTop = document.createElement('button');
  backTop.id = 'quickBackTop';
  backTop.type = 'button';
  backTop.textContent = '↑ Top';
  backTop.setAttribute('aria-label', 'Back to top');
  backTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
  document.body.appendChild(backTop);

  const syncBackTop = () => backTop.classList.toggle('on', window.scrollY > 650);
  addEventListener('scroll', syncBackTop, {passive:true});
  syncBackTop();
})();
