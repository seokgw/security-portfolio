import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS credentials(
      id TEXT PRIMARY KEY, account TEXT NOT NULL REFERENCES accounts(id),
      public_key BLOB NOT NULL, counter INTEGER NOT NULL, name TEXT NOT NULL,
      created TEXT NOT NULL, transports TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges(
      id TEXT PRIMARY KEY, value TEXT NOT NULL, purpose TEXT NOT NULL,
      account TEXT NOT NULL, account_name TEXT NOT NULL, key_name TEXT NOT NULL,
      browser TEXT NOT NULL, auth_session TEXT, created INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0, is_new INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(
      hash TEXT PRIMARY KEY, account TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS notes(
      id INTEGER PRIMARY KEY, account TEXT NOT NULL REFERENCES accounts(id), title TEXT NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS evidence(
      id INTEGER PRIMARY KEY, account TEXT NOT NULL, event TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL);
  `);
  return db;
}
