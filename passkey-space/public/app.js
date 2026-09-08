/* Private note values are fetched only after server authentication. */
const $ = id => document.getElementById(id);
const errors = { no_registered_passkeys: '등록된 패스키가 없어 로그인할 수 없습니다. 계정 이름도 확인하세요.', account_exists_login_required: '이미 있는 계정입니다. 먼저 패스키로 로그인하세요.', authentication_verification_failed: '서명 검증에 실패했습니다. 다시 로그인하세요.', challenge_already_used: '이미 사용한 요청입니다. 새로 시도하세요.', challenge_expired: '요청이 만료되었습니다. 다시 시도하세요.', authentication_required: '인증이 만료되었습니다. 다시 로그인하세요.', credential_not_found: '삭제되었거나 이 계정에 속하지 않는 패스키입니다.' };
let expiryTimer;
async function api(path, method = 'GET', body) {
  const response = await fetch(`/api${path}`, { method, credentials: 'same-origin', cache: 'no-store', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
  const data = await response.json();
  if (!response.ok) { if (response.status === 401) clearPrivate(); throw Error(errors[data.error] || `요청 실패: ${data.error}`); }
  return data;
}
function clearPrivate() { clearTimeout(expiryTimer); $('authenticated').hidden = true; $('entry').hidden = false; for (const id of ['notes', 'keys', 'evidence']) $(id).replaceChildren(); }
function node(tag, value) { const el = document.createElement(tag); el.textContent = value; return el; }
async function refresh() {
  const session = await api('/session');
  if (!session.account) { clearPrivate(); return; }
  const [data, keys] = await Promise.all([api('/private'), api('/passkeys')]);
  $('entry').hidden = true; $('authenticated').hidden = false;
  $('account-title').textContent = `${session.account.name}의 공간`;
  $('status').textContent = '🔓 인증됨 · 서버에서 비공개 자료를 불러왔습니다.';
  $('notes').replaceChildren(...data.notes.map(n => { const card = document.createElement('article'); card.append(node('h3', n.title), node('p', n.body)); return card; }));
  $('keys').replaceChildren(...keys.map(k => {
    const li = document.createElement('li'); li.append(node('span', `${k.name} / 등록일: ${new Date(k.created).toLocaleDateString('ko-KR')} / ${k.id.slice(0, 8)}…`));
    const button = node('button', '삭제'); button.className = 'secondary';
    button.onclick = () => action(async () => {
      if (!confirm(keys.length === 1 ? '마지막 패스키를 삭제하면 이 계정에 다시 로그인할 수 없습니다. 정말 삭제할까요?' : '이 패스키를 삭제하고 모든 기기에서 로그아웃할까요?')) return;
      const result = await api(`/passkeys/${encodeURIComponent(k.id)}`, 'DELETE'); clearPrivate();
      $('status').textContent = result.remaining ? '패스키를 삭제했습니다. 남은 패스키로 다시 로그인하세요.' : '등록된 패스키가 없어 로그인할 수 없습니다. 이 계정은 복구할 수 없습니다.';
    }); li.append(button); return li;
  }));
  clearTimeout(expiryTimer); expiryTimer = setTimeout(() => { clearPrivate(); $('status').textContent = '보호를 위해 화면을 잠갔습니다. 다시 로그인하세요.'; }, 3600000);
}
async function action(fn) {
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  try { await fn(); } catch (e) { $('status').textContent = ['NotAllowedError', 'AbortError'].includes(e.name) ? '패스키 요청이 취소되었거나 시간이 초과되었습니다. 저장되지 않았습니다.' : e.message; }
  finally { document.querySelectorAll('button').forEach(b => b.disabled = false); }
}
async function register(accountName, name) {
  const flow = await api('/passkey/register/options', 'POST', { accountName, name });
  let credential;
  try { credential = await SimpleWebAuthnBrowser.startRegistration({ optionsJSON: flow.options }); }
  catch (e) { await api('/passkey/cancel', 'POST', { challengeId: flow.challengeId }).catch(() => {}); throw e; }
  await api('/passkey/register/verify', 'POST', { challengeId: flow.challengeId, credential }); await refresh();
}
$('register-form').onsubmit = e => { e.preventDefault(); action(() => register($('new-account').value.trim(), $('first-key').value.trim())); };
$('add-form').onsubmit = e => { e.preventDefault(); action(() => register(undefined, $('key-name').value.trim())); };
$('login-form').onsubmit = e => { e.preventDefault(); action(async () => {
  const flow = await api('/passkey/login/options', 'POST', { accountName: $('login-account').value.trim() });
  let credential;
  try { credential = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: flow.options }); }
  catch (e) { await api('/passkey/cancel', 'POST', { challengeId: flow.challengeId }).catch(() => {}); throw e; }
  await api('/passkey/login/verify', 'POST', { challengeId: flow.challengeId, credential }); await refresh();
}); };
$('logout').onclick = () => action(async () => { await api('/logout', 'POST'); clearPrivate(); $('status').textContent = '🔒 로그아웃했습니다. 이전 세션은 무효화되었습니다.'; });
$('refresh-evidence').onclick = () => action(async () => { const rows = await api('/evidence'); $('evidence').replaceChildren(...rows.map(r => node('li', `${r.created} · ${r.event} · ${r.detail}`))); });
window.addEventListener('pageshow', () => action(refresh));
document.addEventListener('visibilitychange', () => { if (!document.hidden) action(refresh); });
if (!window.isSecureContext || !window.PublicKeyCredential) { $('status').textContent = 'HTTPS 및 패스키를 지원하는 브라우저에서 열어주세요.'; }
