import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_ANON_KEY?.trim();
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY before building.');
if (new URL(url).protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
if (key.startsWith('sb_secret_')) throw new Error('Use a publishable/anon key, never a secret key.');
if (key.split('.').length === 3) {
  const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  if (claims.role !== 'anon') throw new Error('Only an anon JWT is allowed in browser configuration.');
} else if (!key.startsWith('sb_publishable_')) {
  throw new Error('Expected a Supabase publishable key or anon JWT.');
}
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'styles.css', 'account.css', 'app.js', 'cloud-entry.js']) {
  await copyFile(new URL(name, root), new URL(name, output));
}
await writeFile(new URL('supabase-config.js', output),
  `window.JIGWAN_SUPABASE_CONFIG = ${JSON.stringify({ url, anonKey: key })};\n`);
console.log(`Built static site: ${fileURLToPath(output)}`);
