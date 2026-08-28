'use strict';

const C = window.T04Core;
const LIVE_KEY = 'aleph-t04-live-v1';
const REPLAY_KEY = 'aleph-t04-replay-v1';
const API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m&timezone=Asia%2FSeoul';
const FIXTURE_BASE = 'assets/fixtures/';
let live = load(LIVE_KEY);
let replay = load(REPLAY_KEY);
let lastRaw = null;

function load(key){try{const value=JSON.parse(localStorage.getItem(key));return value?.daily_readings?value:C.emptyState()}catch{return C.emptyState()}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
async function loadPublicSeed(){
  if(live.daily_readings.length) return;
  try{
    const response=await fetch('live-seed.json',{cache:'no-store'});
    const seed=await response.json();
    for(const reading of seed.readings) live=C.applySuccess(live,reading,{at:reading.fetched_at});
    save(LIVE_KEY,live);renderLive();
  }catch{ /* 라이브 버튼은 seed와 독립적으로 계속 사용할 수 있다. */ }
}
function el(id){return document.getElementById(id)}
function formatTime(iso){return iso?new Intl.DateTimeFormat('ko-KR',{timeZone:C.TIMEZONE,dateStyle:'medium',timeStyle:'medium',hour12:false}).format(new Date(iso)):'원천 제공 없음'}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function renderLive(){
  const r=live.current_reading,s=live.status;
  el('live-badge').className=`badge ${s?.freshness||'neutral'}`;el('live-badge').textContent=s?s.freshness:'조회 전';
  el('live-value').textContent=r?r.normalized_value:'—';el('live-unit').textContent=r?r.unit:'°C';
  el('live-note').textContent=s?.freshness==='stale'?'이번 조회는 실패했습니다. 마지막 정상값(오래된 값)을 보존해 표시합니다.':s?.freshness==='error'?'이번 조회가 실패했고 아직 보존된 정상값이 없습니다. 값을 표시하지 않습니다.':r?'공개 원천에서 정상 조회한 최신 값입니다.':'공개 원천에서 최신 값을 조회하세요.';
  el('live-source-time').textContent=r?formatTime(r.source_time):'—';el('live-fetched-time').textContent=r?formatTime(r.fetched_at):'—';
  el('live-source').href=r?.source_url||'https://open-meteo.com/';
  const rows=[...live.daily_readings].reverse();el('live-count').textContent=`${rows.length} / 정확히 2건 필요`;
  el('live-rows').innerHTML=rows.length?rows.map(x=>`<tr><td>${esc(x.record_date)}</td><td>${esc(x.normalized_value)}</td><td>${esc(x.unit)}</td><td>${esc(formatTime(x.source_observed_at))}</td><td>${esc(formatTime(x.last_fetched_at))}</td><td><a href="${esc(x.source_url)}" target="_blank" rel="noreferrer">Open-Meteo</a></td></tr>`).join(''):'<tr><td colspan="6">아직 실제 기록이 없습니다.</td></tr>';
  const pair=live.daily_readings.slice(-2);if(pair.length===2&&live.comparison.state==='comparable'){const d=live.comparison.signed_delta;el('delta-value').textContent=`${d>0?'+':''}${d} ${live.comparison.unit}`;el('delta-formula').textContent=`${pair[1].normalized_value} − ${pair[0].normalized_value} = ${d} ${pair[1].unit}`;}else{el('delta-value').textContent='비교 대기';el('delta-formula').textContent='서로 다른 실제 KST 날짜 기록 2건이 필요합니다.'}
  el('raw-value').textContent=lastRaw?JSON.stringify({current:lastRaw.current,current_units:lastRaw.current_units},null,2):'이번 브라우저 세션에서 조회 후 표시됩니다.';
  el('stored-value').textContent=r?JSON.stringify(r,null,2):'—';el('shown-value').textContent=r?`${r.normalized_value} ${r.unit}`:'—';
}

async function fetchLive(){
  const button=el('fetch-live');button.disabled=true;button.textContent='조회 중…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(API_URL,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const raw=await response.json();
    if(!raw.current||!Number.isFinite(raw.current.temperature_2m)||raw.current_units?.temperature_2m!=='°C')throw new TypeError('schema');
    const fetched=new Date().toISOString();const observed=new Date(`${raw.current.time}:00${raw.utc_offset_seconds===32400?'+09:00':''}`).toISOString();
    const reading={signal_id:'open-meteo.seoul.temperature-2m',normalized_value:raw.current.temperature_2m,unit:raw.current_units.temperature_2m,source_name:'Open-Meteo',source_url:API_URL,source_time:observed,fetched_at:fetched,record_timezone:C.TIMEZONE,record_date:C.kstDate(fetched)};
    lastRaw=raw;live=C.applySuccess(live,reading);save(LIVE_KEY,live);
  }catch(error){const code=error.name==='AbortError'?'timeout':error instanceof TypeError?'schema_error':'offline';live=C.applyError(live,code,{at:new Date().toISOString()});save(LIVE_KEY,live);}
  finally{clearTimeout(timer);button.disabled=false;button.textContent='실제 값 다시 조회';renderLive()}
}

const ERRORS={timeout:['외부 데이터 응답이 너무 늦습니다.','제한시간 안에 응답하지 않았습니다. 마지막 정상값 105를 유지합니다.','잠시 후 다시 시도하세요.'],auth:['외부 원천이 요청을 거절했습니다.','우리 앱 로그인이 아니라 외부 원천의 401/403 응답입니다.','원천 설정이 복구된 뒤 다시 시도하세요.'],rate_limit:['외부 원천의 호출 제한입니다.','너무 많은 요청으로 429 응답을 받았습니다.','Retry-After 대기 후 다시 시도하세요.'],offline:['네트워크가 오프라인입니다.','HTTP 응답 자체를 받을 수 없었습니다.','연결을 확인한 뒤 다시 시도하세요.'],schema_error:['외부 응답 형식이 변경되었습니다.','응답은 왔지만 예상 숫자 필드를 검증하지 못했습니다.','어댑터 점검 후 다시 시도하세요.']};
function renderReplay(){
  const r=replay.current_reading,s=replay.status;el('replay-freshness').className=`badge ${s?.freshness||'neutral'}`;el('replay-freshness').textContent=s?.freshness||'reset';el('replay-error').textContent=`error_code: ${s?.error_code||'none'}`;el('replay-value').textContent=r?`${r.normalized_value} ${r.unit}${s?.freshness==='stale'?' · 오래된 값':''}`:'—';el('replay-count').textContent=replay.daily_readings.length;el('replay-delta').textContent=replay.comparison.state==='comparable'?`${replay.comparison.signed_delta>0?'+':''}${replay.comparison.signed_delta} ${replay.comparison.unit}`:'—';
  el('replay-rows').innerHTML=replay.daily_readings.length?replay.daily_readings.map(x=>`<tr><td>${esc(x.record_id)}</td><td>${esc(x.record_date)}</td><td>${esc(x.normalized_value)}</td><td>${esc(x.unit)}</td></tr>`).join(''):'<tr><td colspan="4">합성 상태가 비어 있습니다.</td></tr>';
  const failed=s?.freshness==='stale'||s?.freshness==='error';el('error-panel').hidden=!failed;if(failed){const copy=ERRORS[s.error_code];el('error-title').textContent=copy[0];el('error-explain').textContent=s.freshness==='error'?'정상값이 아직 없어 이번 실패로는 화면에 표시할 값이 없습니다.':copy[1];el('error-action').textContent=copy[2]}
}
async function play(name){const response=await fetch(`${FIXTURE_BASE}${name}.json`);const fixture=await response.json();replay=C.runFixture(replay,fixture);save(REPLAY_KEY,replay);renderReplay()}
document.querySelectorAll('[data-fixture]').forEach(b=>b.addEventListener('click',()=>play(b.dataset.fixture)));
el('retry').addEventListener('click',()=>play('recover-d2'));el('reset-replay').addEventListener('click',()=>{replay=C.emptyState();save(REPLAY_KEY,replay);renderReplay()});el('fetch-live').addEventListener('click',fetchLive);
function tick(){el('kst-clock').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:C.TIMEZONE,dateStyle:'medium',timeStyle:'medium',hour12:false}).format(new Date())}tick();setInterval(tick,1000);renderLive();renderReplay();loadPublicSeed();
