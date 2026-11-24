-- Persistent timestamp for successful EXPA synchronization jobs.
CREATE TABLE IF NOT EXISTS expa_sync_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expa_sync_state_updated_at
  ON expa_sync_state(updated_at DESC);
