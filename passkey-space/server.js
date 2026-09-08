import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { openStore } from './store.js';
import { mountVault } from './vault.js';

const here = dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const ttl = 5 * 60 * 1000;
const fail = (status, code) => Object.assign(new Error(code), { status });
export function createApp({ origin = process.env.ORIGIN || 'http://localhost:3008',
  rpID = process.env.RP_ID || 'localhost', dbPath = process.env.DB_PATH || resolve(here, 'data/passkeys.sqlite'),
  now = Date.now } = {}) {
  const url = new URL(origin);
  if (url.origin !== origin || url.hostname !== rpID ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && rpID === 'localhost')) ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw Error('Invalid ORIGIN / RP_ID; HTTPS required');
  const db = openStore(dbPath), app = express();
  const secure = url.protocol === 'https:';
  const cookieName = secure ? '__Host-session' : 'session';
  const browserName = secure ? '__Host-flow' : 'flow';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'strict', path: '/' };
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const keys = account => all('SELECT * FROM credentials WHERE account=?', account);
  const log = (account, event, detail) => run('INSERT INTO evidence(account,event,detail,created) VALUES(?,?,?,?)', account, event, detail, new Date(now()).toISOString());
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], connectSrc: ["'self'"], frameAncestors: ["'none'"], upgradeInsecureRequests: secure ? [] : null } } }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) &&
        (req.get('origin') !== origin || !req.is('application/json'))) return res.status(403).json({ error: 'origin_or_content_type_rejected' });
    next();
  });
  app.use('/api', rateLimit({ windowMs: 60000, limit: 150, standardHeaders: 'draft-8', legacyHeaders: false }));
  const smallJSON = express.json({ limit: '32kb' });
  app.use((req,res,next) => req.path === '/api/vault' || req.path.startsWith('/api/vault/') ? next() : smallJSON(req,res,next));
  app.use('/api', (req, res, next) => {
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(v => v.trim().split('=')));
    req.sessionHash = cookies[cookieName] ? hash(cookies[cookieName]) : '';
    req.auth = get('SELECT * FROM sessions WHERE hash=? AND expires>?', req.sessionHash, now());
    let browser = cookies[browserName];
    if (!/^[a-f0-9]{64}$/.test(browser || '')) {
      browser = randomBytes(32).toString('hex');
      res.cookie(browserName, browser, { ...cookieOptions, maxAge: 86400000 });
    }
    req.browser = hash(browser);
    // Expired challenges cannot be replayed even after their tombstone is removed.
    run('DELETE FROM challenges WHERE created<?', now() - 86400000);
    run('DELETE FROM sessions WHERE expires<=?', now());
    run('DELETE FROM evidence WHERE id < (SELECT COALESCE(MAX(id),0)-2000 FROM evidence)');
    next();
  });
  const requireAuth = (req, _res, next) => req.auth ? next() : next(fail(401, 'authentication_required'));
  function guardOwner(req) {
    for (const source of [req.query, req.body || {}, req.params]) {
      for (const key of ['userId', 'accountId']) {
        if (source[key] !== undefined && source[key] !== req.auth.account) throw fail(403, 'account_access_denied');
      }
    }
  }
  function issueSession(req, res, account) {
    run('DELETE FROM sessions WHERE hash=?', req.sessionHash);
    const token = randomBytes(32).toString('hex');
    run('INSERT INTO sessions VALUES(?,?,?)', hash(token), account, now() + 3600000);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: 3600000 });
  }
  function saveChallenge(req, options, purpose, account, name, keyName = '', isNew = false) {
    const id = randomUUID();
    run('INSERT INTO challenges VALUES(?,?,?,?,?,?,?,?,?,0,?)', id, options.challenge, purpose, account, name, keyName, req.browser, req.auth ? req.sessionHash : null, now(), Number(isNew));
    log(account, `${purpose}_challenge`, `${options.challenge.slice(0, 8)}… (5분, 일회용)`);
    return { challengeId: id, options };
  }
  function consume(req, purpose) {
    const c = get('SELECT * FROM challenges WHERE id=? AND browser=?', String(req.body.challengeId || ''), req.browser);
    if (!c || c.purpose !== purpose) throw fail(400, 'challenge_invalid');
    if (c.used) throw fail(400, 'challenge_already_used');
    run('UPDATE challenges SET used=1 WHERE id=?', c.id);
    if (now() - c.created >= ttl) throw fail(400, 'challenge_expired');
    if (c.auth_session && (!req.auth || req.sessionHash !== c.auth_session || req.auth.account !== c.account)) throw fail(401, 'session_changed');
    return c;
  }
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/session', (req, res) => res.json({ account: req.auth ? get('SELECT id,name FROM accounts WHERE id=?', req.auth.account) : null }));
  app.post('/api/passkey/register/options', async (req, res) => {
    if (req.auth) guardOwner(req);
    const name = req.auth ? get('SELECT name FROM accounts WHERE id=?', req.auth.account).name : req.body.accountName;
    if (typeof name !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(name)) throw fail(400, 'invalid_account_name');
    const keyName = req.body.name;
    if (typeof keyName !== 'string' || !keyName.trim() || keyName.length > 60) throw fail(400, 'invalid_passkey_name');
    if (!req.auth && get('SELECT id FROM accounts WHERE name=?', name)) throw fail(409, 'account_exists_login_required');
    const account = req.auth?.account || randomUUID();
    const options = await generateRegistrationOptions({ rpName: 'Portfolio Private Space', rpID,
      userID: new TextEncoder().encode(account), userName: name, attestationType: 'none', supportedAlgorithmIDs: [-7, -257],
      excludeCredentials: keys(account).map(k => ({ id: k.id, transports: JSON.parse(k.transports) })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' } });
    res.json(saveChallenge(req, options, 'registration', account, name, keyName.trim(), !req.auth));
  });
  app.post('/api/passkey/register/verify', async (req, res) => {
    const c = consume(req, 'registration');
    let verification;
    try { verification = await verifyRegistrationResponse({ response: req.body.credential,
      expectedChallenge: c.value, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true }); }
    catch { log(c.account, 'registration_rejected', '검증 실패'); throw fail(400, 'registration_verification_failed'); }
    if (!verification.verified || !verification.registrationInfo) throw fail(400, 'registration_verification_failed');
    const { credential } = verification.registrationInfo;
    transaction(() => {
      if (c.is_new) {
        if (get('SELECT id FROM accounts WHERE name=?', c.account_name)) throw fail(409, 'account_exists_login_required');
        run('INSERT INTO accounts VALUES(?,?)', c.account, c.account_name);
        for (const [title, body] of [['프로젝트 메모', '가상의 보안 실습 프로젝트를 준비합니다.'], ['지원 목록', '가상 조직 Alpha와 Beta를 비교합니다.'], ['개인 회고', '오늘은 인증과 권한의 차이를 학습했습니다.']]) {
          run('INSERT INTO notes(account,title,body) VALUES(?,?,?)', c.account, `${c.account_name}의 ${title}`, body);
        }
      } else if (!get('SELECT hash FROM sessions WHERE hash=? AND expires>?', c.auth_session, now())) throw fail(401, 'session_changed');
      if (get('SELECT id FROM credentials WHERE id=?', credential.id)) throw fail(409, 'credential_exists');
      run('INSERT INTO credentials VALUES(?,?,?,?,?,?,?)', credential.id, c.account, credential.publicKey, credential.counter, c.key_name, new Date(now()).toISOString(), JSON.stringify(credential.transports || []));
    });
    log(c.account, 'registration_verified', `credential ${credential.id.slice(0, 8)}… / publicKey: stored / privateKey: not stored`);
    // Registration proves possession too; rotate into an authenticated server session.
    issueSession(req, res, c.account);
    res.json({ verified: true });
  });
  app.post('/api/passkey/cancel', (req, res) => {
    run('UPDATE challenges SET used=1 WHERE id=? AND browser=?', String(req.body.challengeId || ''), req.browser);
    res.json({ cancelled: true });
  });
  app.post('/api/passkey/login/options', async (req, res) => {
    const a = get('SELECT * FROM accounts WHERE name=?', String(req.body.accountName || ''));
    if (!a || !keys(a.id).length) throw fail(401, 'no_registered_passkeys');
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'required',
      allowCredentials: keys(a.id).map(k => ({ id: k.id, transports: JSON.parse(k.transports) })) });
    res.json(saveChallenge(req, options, 'authentication', a.id, a.name));
  });
  app.post('/api/passkey/login/verify', async (req, res) => {
    const c = consume(req, 'authentication');
    const k = get('SELECT * FROM credentials WHERE id=? AND account=?', String(req.body.credential?.id || ''), c.account);
    if (!k) throw fail(401, 'credential_not_found');
    let verification;
    try {
      verification = await verifyAuthenticationResponse({ response: req.body.credential,
        expectedChallenge: c.value, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: k.id, publicKey: new Uint8Array(k.public_key), counter: k.counter, transports: JSON.parse(k.transports) } });
      const handle = req.body.credential.response.userHandle;
      if (handle && Buffer.from(handle, 'base64url').toString() !== c.account) throw Error('wrong userHandle');
    } catch { log(c.account, 'login_rejected', '공개키 서명·origin·RP ID·counter 검증 실패'); throw fail(401, 'authentication_verification_failed'); }
    if (!verification.verified) throw fail(401, 'authentication_verification_failed');
    // Atomic compare-and-update also rejects a credential deleted while verification awaited crypto.
    const updated = run('UPDATE credentials SET counter=? WHERE id=? AND account=? AND counter=?', verification.authenticationInfo.newCounter, k.id, c.account, k.counter);
    if (!updated.changes) throw fail(401, 'credential_changed');
    issueSession(req, res, c.account);
    log(c.account, 'login_verified', '저장된 공개키로 실제 서명 검증 성공');
    res.json({ verified: true });
  });
  app.post('/api/logout', (req, res) => {
    run('DELETE FROM sessions WHERE hash=?', req.sessionHash);
    run('UPDATE challenges SET used=1 WHERE browser=?', req.browser);
    res.clearCookie(cookieName, cookieOptions);
    res.json({ loggedOut: true });
  });
  const privateData = (req, res) => {
    guardOwner(req);
    res.json({ account: req.auth.account, notes: all('SELECT id,title,body FROM notes WHERE account=?', req.auth.account) });
  };
  app.get('/api/private', requireAuth, privateData);
  app.post('/api/private', requireAuth, privateData);
  app.get('/api/private/:userId', requireAuth, privateData);
  app.get('/api/passkeys', requireAuth, (req, res) => {
    guardOwner(req);
    res.json(keys(req.auth.account).map(k => ({ id: k.id, name: k.name, created: k.created })));
  });
  app.delete('/api/passkeys/:credentialId', requireAuth, (req, res) => {
    guardOwner(req);
    transaction(() => {
      const result = run('DELETE FROM credentials WHERE id=? AND account=?', req.params.credentialId, req.auth.account);
      if (!result.changes) throw fail(404, 'credential_not_found');
      // Revoke every session and outstanding challenge on removal (including the current session).
      run('DELETE FROM sessions WHERE account=?', req.auth.account);
      run('UPDATE challenges SET used=1 WHERE account=?', req.auth.account);
    });
    log(req.auth.account, 'credential_deleted', `${req.params.credentialId.slice(0, 8)}… / 모든 세션 무효화`);
    res.clearCookie(cookieName, cookieOptions);
    res.json({ deleted: true, remaining: keys(req.auth.account).length, loggedOut: true });
  });
  app.get('/api/evidence', requireAuth, (req, res) => res.json(all('SELECT event,detail,created FROM evidence WHERE account=? ORDER BY id DESC LIMIT 50', req.auth.account)));
  mountVault(app, { db, keyPath: resolve(dirname(dbPath), 'vault.key'), requireAuth, guardOwner });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  app.get('/vendor/webauthn.js', (_req, res) => res.sendFile(resolve(here, 'node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js')));
  app.use(express.static(resolve(here, 'public'), { index: 'index.html' }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.status ? err.message : 'internal_error' }));
  return { app, db };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { app } = createApp();
  app.listen(Number(process.env.PORT || 3008), process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0', () => console.log('Private Space server ready'));
}
