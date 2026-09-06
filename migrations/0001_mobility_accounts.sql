PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS mobility_accounts (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL CHECK(created_at >= 0)
);
CREATE TABLE IF NOT EXISTS mobility_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES mobility_accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL CHECK(expires_at >= 0)
);
CREATE INDEX IF NOT EXISTS mobility_sessions_expiry ON mobility_sessions(expires_at);
CREATE TABLE IF NOT EXISTS mobility_oauth (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at >= 0)
);
CREATE INDEX IF NOT EXISTS mobility_oauth_expiry ON mobility_oauth(expires_at);
CREATE TABLE IF NOT EXISTS mobility_oauth_limits (
  key_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL CHECK(attempts >= 1),
  expires_at INTEGER NOT NULL CHECK(expires_at >= 0)
);
CREATE INDEX IF NOT EXISTS mobility_oauth_limits_expiry ON mobility_oauth_limits(expires_at);
CREATE TABLE IF NOT EXISTS mobility_cases (
  account_id TEXT NOT NULL REFERENCES mobility_accounts(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  payload TEXT NOT NULL CHECK(length(payload) <= 200000),
  updated_at INTEGER NOT NULL CHECK(updated_at >= 0),
  PRIMARY KEY(account_id, id)
);
CREATE INDEX IF NOT EXISTS mobility_cases_updated ON mobility_cases(account_id, updated_at);
CREATE TABLE IF NOT EXISTS mobility_profiles (
  account_id TEXT PRIMARY KEY REFERENCES mobility_accounts(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  payload TEXT NOT NULL CHECK(length(payload) <= 30000),
  updated_at INTEGER NOT NULL CHECK(updated_at >= 0)
);
