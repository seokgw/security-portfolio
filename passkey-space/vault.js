import { randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import express from 'express';

const error = (status, message) => Object.assign(new Error(message), { status });
const FILE_LIMIT = 5 * 1024 * 1024, ACCOUNT_LIMIT = 50 * 1024 * 1024;
export function mountVault(app, { db, keyPath, requireAuth, guardOwner }) {
  db.exec(`CREATE TABLE IF NOT EXISTS vault(
    id TEXT PRIMARY KEY, account TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL,
    metadata BLOB NOT NULL, content BLOB NOT NULL, size INTEGER NOT NULL,
    created TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS vault_owner ON vault(account);`);
  if (!existsSync(keyPath)) {
    if (db.prepare('SELECT count(*) n FROM vault').get().n) throw Error('Vault key missing; restore the original key');
    mkdirSync(dirname(keyPath), { recursive: true });
    writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 });
  }
  const key = readFileSync(keyPath);
  if (key.length !== 32) throw Error('Invalid vault key');
  function encrypt(value, aad) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(aad));
    const body = Buffer.concat([cipher.update(value), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]);
  }
  function decrypt(value, aad) {
    const b = Buffer.from(value), decipher = createDecipheriv('aes-256-gcm', key, b.subarray(0,12));
    decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(b.subarray(12,28));
    return Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]);
  }
  const info = row => ({ id: row.id, kind: row.kind, size: row.size, created: row.created, updated: row.updated,
    ...JSON.parse(decrypt(row.metadata, `${row.account}:${row.id}:metadata`).toString()) });
  const own = req => {
    guardOwner(req);
    const row = db.prepare('SELECT * FROM vault WHERE id=? AND account=?').get(req.params.id, req.auth.account);
    if (!row) throw error(404, 'material_not_found');
    return row;
  };
  const router = express.Router();
  router.use(requireAuth, express.json({ limit: '7mb' }));
  router.use((req, _res, next) => { guardOwner(req); next(); });
  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT id,account,kind,metadata,size,created,updated FROM vault WHERE account=? ORDER BY updated DESC').all(req.auth.account);
    res.json({ items: rows.map(info), used: rows.reduce((n,r)=>n+r.size,0), limit: ACCOUNT_LIMIT });
  });
  function fields(body, kind) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 160) throw error(400, 'invalid_title');
    if (kind === 'note') {
      if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 50000) throw error(400, 'invalid_note');
      return { metadata: { title: body.title.trim() }, content: Buffer.from(body.text) };
    }
    if (kind !== 'file' || typeof body.filename !== 'string' || !body.filename.trim() || body.filename.length > 200 ||
      typeof body.base64 !== 'string' || /[^A-Za-z0-9+/=]/.test(body.base64)) throw error(400, 'invalid_file');
    const content = Buffer.from(body.base64, 'base64');
    if (content.toString('base64') !== body.base64) throw error(400, 'invalid_file');
    if (!content.length || content.length > FILE_LIMIT) throw error(413, 'file_too_large');
    return { metadata: { title: body.title.trim(), filename: body.filename.replace(/[\x00-\x1f\x7f/\\]/g, '_') }, content };
  }
  router.post('/', (req,res) => {
    const { metadata, content } = fields(req.body, req.body.kind), account = req.auth.account;
    const totals = db.prepare('SELECT count(*) n, COALESCE(sum(size),0) size FROM vault WHERE account=?').get(account);
    const globalSize = db.prepare('SELECT COALESCE(sum(size),0) size FROM vault').get().size;
    if (totals.n >= 200 || totals.size + content.length > ACCOUNT_LIMIT || globalSize + content.length > 500 * 1024 * 1024) throw error(409, 'storage_limit');
    const id=randomUUID(), date=new Date().toISOString();
    db.prepare('INSERT INTO vault VALUES(?,?,?,?,?,?,?,?)').run(id, account, req.body.kind,
      encrypt(Buffer.from(JSON.stringify(metadata)), `${account}:${id}:metadata`), encrypt(content,`${account}:${id}:content`), content.length,date,date);
    res.status(201).json({ id });
  });
  router.get('/:id', (req,res) => {
    const row=own(req); res.json({ ...info(row), ...(row.kind==='note' ? {text:decrypt(row.content,`${row.account}:${row.id}:content`).toString()} : {}) });
  });
  router.get('/:id/download', (req,res) => {
    const row=own(req), meta=info(row);
    const name=row.kind==='file'?meta.filename:`${meta.title}.txt`;
    res.set('Content-Type','application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g,'%27')}`);
    res.send(decrypt(row.content,`${row.account}:${row.id}:content`));
  });
  router.put('/:id', (req,res) => {
    const row=own(req);
    if (row.kind !== 'note') throw error(400,'file_edit_not_supported');
    if (req.body.updated !== row.updated) throw error(409,'edit_conflict');
    const {metadata,content}=fields(req.body,'note');
    const used=db.prepare('SELECT sum(size) size FROM vault WHERE account=?').get(req.auth.account).size;
    const total=db.prepare('SELECT sum(size) size FROM vault').get().size;
    if (used-row.size+content.length > ACCOUNT_LIMIT || total-row.size+content.length>500*1024*1024) throw error(409,'storage_limit');
    db.prepare('UPDATE vault SET metadata=?,content=?,size=?,updated=? WHERE id=? AND account=?').run(
      encrypt(Buffer.from(JSON.stringify(metadata)),`${row.account}:${row.id}:metadata`), encrypt(content,`${row.account}:${row.id}:content`),content.length,new Date().toISOString(),row.id,row.account);
    res.json({saved:true});
  });
  router.delete('/:id',(req,res)=> {const row=own(req);db.prepare('DELETE FROM vault WHERE id=? AND account=?').run(row.id,req.auth.account);res.json({deleted:true});});
  app.use('/api/vault',router);
}
