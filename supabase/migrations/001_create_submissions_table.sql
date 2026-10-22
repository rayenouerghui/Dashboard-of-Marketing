-- Create submissions table for opportunity form submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  submitted_at TIMESTAMPTZ NOT NULL,
  sheet TEXT NOT NULL CHECK (sheet IN ('OGV', 'OGT')),
  product TEXT NOT NULL,
  opportunity_id TEXT,
  opportunity_title TEXT NOT NULL,
  university_id TEXT,
  university_name TEXT NOT NULL,
  country TEXT,
  duration TEXT,
  opportunity_date TEXT,
  ep_name TEXT NOT NULL,
  condition TEXT,
  note TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by sheet
CREATE INDEX IF NOT EXISTS idx_submissions_sheet ON submissions(sheet);

-- Create index for faster queries by submitted_at
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);

-- Enable Row Level Security (optional, uncomment if needed)
-- ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (adjust as needed for your security requirements)
-- CREATE POLICY "Public read access" ON submissions
--   FOR SELECT
--   TO public
--   USING (true);

-- Create policy for service role insert/update/delete
-- CREATE POLICY "Service role full access" ON submissions
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);
