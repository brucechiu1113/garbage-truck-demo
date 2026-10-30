import {ADAPTERS,nextPickup} from './models.js';
const $=id=>document.getElementById(id);
const DAY=['今天','明天','後天'], WK=['日','一','二','三','四','五','六'];
const hm=d=>d.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
let city, stops=[], trucks=[], map, layer, focusPlate=null;
const favKey='gt_favs';
const getFavs=()=>JSON.parse(localStorage.getItem(favKey)||'[]');
const setFavs=f=>localStorage.setItem(favKey,JSON.stringify(f));

async function getJson(url,ms=8000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(t)}}

function ago(d){const m=Math.round((Date.now()-d)/60000);return m<1?'剛剛':m<60?`${m} 分鐘前`:`${Math.round(m/60)} 小時前`}

function stopCard(s,isFav){
  const n=nextPickup(s); const t=trucks.find(x=>x.plate===s.plate);
  const when=n?`${n.dayOffset<3?DAY[n.dayOffset]:'週'+WK[n.time.getDay()]} ${hm(n.time)}`:'近期沒有班次';
  const live=t?`這台車（${s.plate}）GPS ${ago(t.time)}回報在「${t.place}」`:`這台車（${s.plate}）目前沒有 GPS 回報`;
  const wk=WK.map((w,i)=>{const j=(i+6)%7;return s.garbage[j]||s.recycle[j]?`週${w} ${[s.garbage[j]?'垃圾':'',s.recycle[j]?'回收':''].filter(Boolean).join('＋')} ${s.garbage[j]||s.recycle[j]}`:''}).filter(Boolean).join('、');
  const el=document.createElement('div');el.className='card';el.dataset.stop=s.id;
  el.innerHTML=`<div class="muted">${s.district}${s.village}・${s.mode}</div><div style="font-size:18px">${s.address}</div>
  <div class="big">${when}</div><div class="muted">下一班：${n?n.kind:'—'}（官方班表時間）</div>
  <div class="muted">${live}</div><div class="muted">每週班表：${wk||'無'}</div>
  <button class="${isFav?'on':''}" data-act="fav">${isFav?'★ 已收藏':'☆ 收藏'}</button>
  <button data-act="map">看車在哪</button>
  <button data-act="remind" data-feature="remind-demo">提前 10 分鐘提醒（Demo）</button>`;
  el.onclick=e=>{const a=e.target.dataset.act;if(!a)return;
    if(a==='fav'){let f=getFavs();f=f.some(x=>x.id===s.id)?f.filter(x=>x.id!==s.id):[...f,s];setFavs(f);render()}
    if(a==='map'){focusPlate=s.plate;drawTrucks();$('map').scrollIntoView({behavior:'smooth'})}
    if(a==='remind'){e.target.textContent=n?`Demo：會在 ${hm(new Date(n.time-600000))} 提醒（尚未實作推播）`:'沒有班次可提醒'}};
  return el;
}

function render(){
  const favs=getFavs().filter(f=>f.cityId===city.id);
  $('favs').replaceChildren(...(favs.length?favs.map(s=>stopCard(s,true)):[Object.assign(document.createElement('div'),{className:'muted',textContent:'還沒有收藏。按清運點上的「☆ 收藏」，下次打開直接看到（存在這支手機，離線也看得到班表）。'})]));
  const q=$('q').value.trim();
  if(!city.hasSchedule){$('results').innerHTML=`<div class="notice error" data-feature="error-state">${city.name}目前沒有找到「清運點班表」開放資料，無法查詢幾點到。下面地圖只顯示車輛 GPS（如果連得上）。</div>`;return}
  if(!q){$('results').innerHTML='<div class="muted">輸入地址或里名開始查詢。</div>';return}
  const terms=q.split(/\s+/);const fav=new Set(favs.map(f=>f.id));
  const hit=stops.filter(s=>terms.every(t=>(s.district+s.village+s.address).includes(t)))
    .map(s=>({s,n:nextPickup(s)})).sort((a,b)=>(a.n?.time||9e15)-(b.n?.time||9e15)).slice(0,20);
  $('results').replaceChildren(...(hit.length?hit.map(h=>stopCard(h.s,fav.has(h.s.id))):[Object.assign(document.createElement('div'),{className:'notice',textContent:`找不到「${q}」。試試只打路名或里名，例如「崇德路」。`})]));
}

function drawTrucks(){
  layer.clearLayers(); const list=focusPlate?trucks.filter(t=>t.plate===focusPlate):trucks;
  list.forEach(t=>L.circleMarker([t.lat,t.lng],{radius:focusPlate?10:4,color:'#1f6f43'}).bindPopup(`${t.plate}<br>${t.place}<br>${ago(t.time)}`).addTo(layer));
  if(list.length) map.fitBounds(L.latLngBounds(list.map(t=>[t.lat,t.lng])).pad(.2),{maxZoom:15});
  $('truckInfo').textContent=focusPlate?(list.length?`顯示 ${focusPlate}，GPS ${ago(list[0].time)}回報。官方約每 10 分鐘更新，車子實際位置可能已移動。`:`${focusPlate} 目前沒有 GPS 回報（可能還沒出勤）。`):`共 ${trucks.length} 台車有 GPS 回報。`;
}

async function loadCity(id){
  const A=ADAPTERS[id];city=A.city;focusPlate=null;stops=[];trucks=[];$('cityNote').textContent=city.note;$('stamp').textContent='資料載入中…';
  const msgs=[];
  if(city.stopsUrl){try{const raw=await getJson(city.stopsUrl);stops=A.stops(raw);msgs.push(`班表：${raw.fetched.replace('T',' ')} 下載`)}catch(e){msgs.push('班表載入失敗')}}
  let live=null;
  try{trucks=A.trucks(await getJson(city.liveUrl));live='即時'}catch(e){
    try{if(id!=='taichung')throw e;trucks=A.trucks(await getJson('trucks_snapshot.json'));live='快照'}catch(e2){trucks=[]}}
  const newest=trucks.length?new Date(Math.max(...trucks.map(t=>t.time))):null;
  msgs.push(trucks.length?`車輛 GPS（${live}）：資料時間 ${hm(newest)}`:'車輛 GPS：目前連不上');
  $('stamp').textContent=msgs.join('｜');
  if(!trucks.length)$('truckInfo').innerHTML=`<div class="notice error" data-feature="error-state">${city.name}的車輛 GPS 目前連不上官方資料來源，我們不會用假資料代替。</div>`;
  else drawTrucks(); render();
}

map=L.map('map').setView([24.15,120.67],11);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);layer=L.layerGroup().addTo(map);
$('city').innerHTML=Object.values(ADAPTERS).map(a=>`<option value="${a.city.id}">${a.city.name}</option>`).join('');
$('city').onchange=e=>{localStorage.setItem('gt_city',e.target.value);loadCity(e.target.value)};
$('q').oninput=()=>{clearTimeout(window._t);window._t=setTimeout(render,200)};
const saved=localStorage.getItem('gt_city')||'taichung';$('city').value=saved;loadCity(saved);
