'use strict';

const TIMEZONE = 'Asia/Seoul';
const NORMALIZED_KEYS = ['signal_id','normalized_value','unit','source_name','source_url','source_time','fetched_at','record_timezone','record_date'];
const ERROR_CODES = ['timeout','auth','rate_limit','offline','schema_error'];

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function roundTo(value, places=2) {
  if (!Number.isFinite(value)) throw new TypeError('value must be finite');
  const rounded = Number(value.toFixed(places));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function kstDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new TypeError('유효한 ISO 시각이 필요합니다.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  const p = Object.fromEntries(parts.map(({type,value}) => [type,value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function validateReading(reading) {
  if (!reading || typeof reading !== 'object' || Array.isArray(reading)) throw new TypeError('reading must be an object');
  const keys = Object.keys(reading).sort();
  if (keys.join('|') !== [...NORMALIZED_KEYS].sort().join('|')) throw new TypeError('normalized reading schema mismatch');
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(reading.signal_id)) throw new TypeError('invalid signal_id');
  if (!Number.isFinite(reading.normalized_value)) throw new TypeError('normalized_value must be finite');
  if (!reading.unit || !reading.source_name) throw new TypeError('unit and source_name are required');
  const url = new URL(reading.source_url);
  if (url.protocol !== 'https:') throw new TypeError('source_url must use HTTPS');
  if (reading.source_time !== null && Number.isNaN(Date.parse(reading.source_time))) throw new TypeError('invalid source_time');
  if (reading.record_timezone !== TIMEZONE || reading.record_date !== kstDate(reading.fetched_at)) throw new TypeError('record_date must be the KST fetched date');
  return true;
}

function emptyState() {
  return { schema_version:'aleph-t04-state-v1', daily_readings:[], current_reading:null, status:null, comparison:{state:'insufficient',signed_delta:null,unit:null}, last_run:null };
}

function compare(rows, current) {
  const previous = rows.filter(r => r.signal_id === current.signal_id && r.record_date < current.record_date).sort((a,b) => b.record_date.localeCompare(a.record_date))[0];
  if (!previous) return {state:'insufficient',signed_delta:null,unit:null};
  if (previous.unit !== current.unit) return {state:'unit_mismatch',signed_delta:null,unit:null};
  return {state:'comparable',signed_delta:roundTo(current.normalized_value - previous.normalized_value,2),unit:current.unit};
}

function applySuccess(input, reading, meta={}) {
  validateReading(reading);
  const state = clone(input);
  const index = state.daily_readings.findIndex(r => r.signal_id === reading.signal_id && r.record_date === reading.record_date);
  const old = index >= 0 ? state.daily_readings[index] : null;
  const row = { record_id:old?.record_id || `${reading.signal_id}:${reading.record_date}`, signal_id:reading.signal_id, record_date:reading.record_date, normalized_value:reading.normalized_value, unit:reading.unit, source_url:reading.source_url, source_observed_at:reading.source_time, first_fetched_at:old?.first_fetched_at || reading.fetched_at, last_fetched_at:reading.fetched_at, reading:clone(reading) };
  if (index >= 0) state.daily_readings[index] = row; else state.daily_readings.push(row);
  state.daily_readings.sort((a,b) => a.record_date.localeCompare(b.record_date));
  state.current_reading = clone(reading);
  state.status = {freshness:'fresh',error_code:'none'};
  state.comparison = compare(state.daily_readings, row);
  state.last_run = {outcome:'success', fixture_id:meta.fixture_id || null, at:meta.at || reading.fetched_at};
  return state;
}

function applyError(input, code, meta={}) {
  if (!ERROR_CODES.includes(code)) throw new TypeError('unsupported error code');
  const state = clone(input);
  state.status = {freshness:'stale',error_code:code};
  state.last_run = {outcome:'error',fixture_id:meta.fixture_id || null,at:meta.at || null,retry_after_seconds:meta.retry_after_seconds ?? null};
  return state;
}

function runFixture(state, fixture) {
  const meta = {fixture_id:fixture.fixture_id,at:fixture.virtual_now,retry_after_seconds:Number(fixture.transport.headers['retry-after']) || null};
  if (fixture.transport.mode === 'timeout') return applyError(state,'timeout',meta);
  if (fixture.transport.mode === 'offline') return applyError(state,'offline',meta);
  if ([401,403].includes(fixture.transport.status)) return applyError(state,'auth',meta);
  if (fixture.transport.status === 429) return applyError(state,'rate_limit',meta);
  if (fixture.transport.status >= 200 && fixture.transport.status < 300) {
    try { return applySuccess(state,fixture.payload,meta); } catch { return applyError(state,'schema_error',meta); }
  }
  return applyError(state,'schema_error',meta);
}

const api = {TIMEZONE,ERROR_CODES,roundTo,kstDate,validateReading,emptyState,applySuccess,applyError,runFixture};
if (typeof module !== 'undefined') module.exports = api;
if (typeof window !== 'undefined') window.T04Core = api;
