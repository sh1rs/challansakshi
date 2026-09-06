CREATE TABLE IF NOT EXISTS mobility_ai_runs (
  request_id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES mobility_accounts(id) ON DELETE SET NULL,
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('reserved','complete','failed'))
);
CREATE INDEX IF NOT EXISTS mobility_ai_runs_day ON mobility_ai_runs(day);
CREATE INDEX IF NOT EXISTS mobility_ai_runs_account_day ON mobility_ai_runs(account_id,day);
