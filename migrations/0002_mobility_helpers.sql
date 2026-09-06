CREATE TABLE IF NOT EXISTS mobility_helpers (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES mobility_accounts(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  case_revision INTEGER NOT NULL CHECK(case_revision >= 1),
  helper_email TEXT NOT NULL CHECK(length(helper_email) <= 254),
  helper_id TEXT REFERENCES mobility_accounts(id) ON DELETE SET NULL,
  snapshot TEXT NOT NULL CHECK(length(snapshot) <= 100000),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at),
  accepted_at INTEGER,
  revoked_at INTEGER,
  applied_at INTEGER,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  proposal TEXT CHECK(length(proposal) <= 16000),
  proposed_at INTEGER,
  FOREIGN KEY(owner_id, case_id) REFERENCES mobility_cases(account_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS mobility_helpers_owner ON mobility_helpers(owner_id, created_at);
CREATE INDEX IF NOT EXISTS mobility_helpers_assignee ON mobility_helpers(helper_id, expires_at);
CREATE INDEX IF NOT EXISTS mobility_helpers_expiry ON mobility_helpers(expires_at);
