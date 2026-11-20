const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let dataset={records:[],generatedAt:null};
let state={region:'All',status:'active',search:''};
let watch=new Set(JSON.parse(localStorage.getItem('ipoRadar.watchlist.v1')||'[]'));
const activeStatuses=new Set(['Filed','Amended','Announced','Bookbuilding','Scheduled','Effective','Priced']);

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=v=>v?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00Z')):'Date TBC';
const price=r=>{if(!r.price)return'Terms TBC'; const p=r.price; if(p.final!=null)return `${p.currency} ${p.final}`; return `${p.currency} ${p.low}–${p.high}`};
const scoreVal=(v,label)=>v==null?`<div class="score ${label}"><b>—</b><small>${label}</small></div>`:`<div class="score ${label}"><b>${v}</b><small>${label}</small></div>`;

function saveWatch(){localStorage.setItem('ipoRadar.watchlist.v1',JSON.stringify([...watch]));updateCounts();renderWatch();}
function toggleWatch(id){watch.has(id)?watch.delete(id):watch.add(id);saveWatch();renderRecords();}
function updateCounts(){const n=watch.size;$('#watchCount').textContent=n;$('#metricWatched').textContent=n;}

function recordHTML(r){const watched=watch.has(r.id);return `<article class="record" data-id="${esc(r.id)}">
  <div class="company"><span class="badge ${esc(r.status)}">${esc(r.status)}</span><h3>${esc(r.company)} ${r.ticker?`<small>· ${esc(r.ticker)}</small>`:''}</h3><p>${esc(r.country)} · ${esc(r.exchange)}</p></div>
  <div class="cell"><strong>${esc(r.sector)}</strong><small>${esc(price(r))}${r.dealSize?` · ${esc(r.dealSize)}`:''}</small></div>
  <div class="date"><strong>${fmtDate(r.expectedDate)}</strong><small>${esc(r.dateConfidence)}</small></div>
  <div class="cell"><strong>${r.scores.completeness}% complete</strong><small>${r.scores.provisional?'Provisional profile':'Standard profile'}</small></div>
  <div class="scores">${scoreVal(r.scores.quality,'quality')}${scoreVal(r.scores.risk,'risk')}${scoreVal(r.scores.research,'research')}</div>
  <div class="record-actions"><button class="watch ${watched?'active':''}" data-watch="${esc(r.id)}" aria-label="${watched?'Remove from':'Add to'} watchlist" title="Watchlist">${watched?'★':'☆'}</button><button class="more" data-detail="${esc(r.id)}" aria-label="View ${esc(r.company)} details">→</button></div>
</article>`}

function filtered(){return dataset.records.filter(r=>{
  const region=state.region==='All'||r.region===state.region;
  const status=state.status==='all'||(state.status==='active'?activeStatuses.has(r.status):r.status===state.status);
  const q=state.search.toLowerCase(); const text=[r.company,r.ticker,r.exchange,r.country,r.sector].join(' ').toLowerCase();
  return region&&status&&(!q||text.includes(q));
}).sort((a,b)=>(b.scores.research??-1)-(a.scores.research??-1)||String(a.company).localeCompare(b.company));}

function bindRecordButtons(root=document){root.querySelectorAll('[data-watch]').forEach(b=>b.onclick=()=>toggleWatch(b.dataset.watch));root.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));}
function renderRecords(){const rows=filtered();$('#recordList').innerHTML=rows.map(recordHTML).join('');$('#emptyState').classList.toggle('hidden',rows.length>0);bindRecordButtons($('#recordList'));}
function renderWatch(){const rows=dataset.records.filter(r=>watch.has(r.id));$('#watchList').innerHTML=rows.map(recordHTML).join('');$('#watchEmpty').classList.toggle('hidden',rows.length>0);bindRecordButtons($('#watchList'));}

function openDetail(id){const r=dataset.records.find(x=>x.id===id);if(!r)return;const s=r.scores;$('#dialogContent').innerHTML=`<div class="dialog-title"><span class="badge ${esc(r.status)}">${esc(r.status)}</span><h2>${esc(r.company)}</h2><p>${esc(r.summary)}</p></div>
<div class="dialog-score-grid"><div class="dialog-score"><small>Quality</small><strong>${s.quality??'—'}</strong></div><div class="dialog-score"><small>Risk</small><strong>${s.risk??'—'}</strong></div><div class="dialog-score"><small>Research</small><strong>${s.research??'—'}</strong></div><div class="dialog-score"><small>Completeness</small><strong>${s.completeness}%</strong></div></div>
<h3>Why this profile</h3>${r.drivers.map(d=>`<div class="driver"><strong>${esc(d.label)}</strong><span>${esc(d.text)}</span></div>`).join('')}
<h3>Offer snapshot</h3><p><strong>${esc(price(r))}</strong>${r.shares?` · ${new Intl.NumberFormat('en',{notation:'compact'}).format(r.shares)} shares`:''}${r.dealSize?` · ${esc(r.dealSize)}`:''}</p>
<h3>Sources</h3><ul class="source-list">${r.sources.map(x=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a> — ${esc(x.publisher)}</li>`).join('')}</ul><p><small>Last verified ${new Date(r.lastVerified).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}. Scores are mechanical research summaries, not investment recommendations.</small></p>`;$('#detailDialog').showModal();}

function renderMetrics(){const rs=dataset.records;$('#metricActive').textContent=rs.filter(r=>activeStatuses.has(r.status)).length;$('#metricDates').textContent=rs.filter(r=>r.expectedDate&&r.dateConfidence==='confirmed').length;$('#metricShortlist').textContent=rs.filter(r=>activeStatuses.has(r.status)&&r.scores.completeness>=60&&r.scores.research!=null).length;const regions=['US','Europe','Middle East'];const max=Math.max(...regions.map(x=>rs.filter(r=>r.region===x).length),1);$('#coverageBars').innerHTML=regions.map(x=>{const n=rs.filter(r=>r.region===x).length;return `<div class="bar-row"><span>${x}</span><div class="bar"><i style="width:${n/max*100}%"></i></div><strong>${n}</strong></div>`}).join('');}
function renderCalendar(){const events=dataset.records.filter(r=>r.expectedDate).sort((a,b)=>a.expectedDate.localeCompare(b.expectedDate));$('#calendarList').innerHTML=events.length?events.map(r=>`<article class="calendar-event"><div class="calendar-date"><strong>${new Date(r.expectedDate+'T12:00:00Z').getUTCDate()}</strong><span>${new Intl.DateTimeFormat('en',{month:'short',year:'numeric'}).format(new Date(r.expectedDate+'T12:00:00Z'))}</span></div><div><h3>${esc(r.company)}</h3><p>${esc(r.exchange)} · ${esc(r.dateConfidence)} date</p></div><span class="badge ${esc(r.status)}">${esc(r.status)}</span></article>`).join(''):'<div class="empty"><strong>No exact upcoming dates</strong><p>Filed IPOs with unknown dates remain visible in the pipeline.</p></div>';}

function showPage(name){$$('.page').forEach(p=>p.classList.remove('active'));$$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$(`#${name}Page`).classList.add('active');history.replaceState(null,'',`#${name}`);window.scrollTo({top:0,behavior:'smooth'});}

async function init(){try{const res=await fetch('data/ipos.json',{cache:'no-store'});if(!res.ok)throw Error(`HTTP ${res.status}`);dataset=await res.json();renderMetrics();renderRecords();renderWatch();renderCalendar();updateCounts();const age=(Date.now()-new Date(dataset.generatedAt))/86400000;$('#freshness').textContent=`Updated ${new Date(dataset.generatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`;if(age>7)$('#freshness').classList.add('stale');$('#buildStamp').textContent=`Snapshot ${new Date(dataset.generatedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}`;}catch(e){$('#recordList').innerHTML=`<div class="empty"><strong>Data could not be loaded</strong><p>${esc(e.message)}</p></div>`;$('#freshness').textContent='Data unavailable';$('#freshness').classList.add('stale');}}

$$('.nav-link').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$$('.segment').forEach(b=>b.onclick=()=>{$$('.segment').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.region=b.dataset.region;renderRecords()});$('#searchInput').oninput=e=>{state.search=e.target.value;renderRecords()};$('#statusFilter').onchange=e=>{state.status=e.target.value;renderRecords()};$('#closeDialog').onclick=()=>$('#detailDialog').close();$('#detailDialog').onclick=e=>{if(e.target===$('#detailDialog'))$('#detailDialog').close()};
$('#clearWatch').onclick=()=>{if(confirm('Clear your local IPO watchlist?')){watch.clear();saveWatch()}};
$('#exportWatch').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,ids:[...watch]},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ipo-radar-watchlist.json';a.click();URL.revokeObjectURL(a.href)};
$('#importWatch').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data.ids))throw Error('Missing ids array');watch=new Set(data.ids.filter(x=>typeof x==='string'));saveWatch()}catch(err){alert(`Could not import: ${err.message}`)}};
showPage((location.hash||'#overview').slice(1) in {overview:1,calendar:1,watchlist:1,methodology:1}?(location.hash||'#overview').slice(1):'overview');init();
