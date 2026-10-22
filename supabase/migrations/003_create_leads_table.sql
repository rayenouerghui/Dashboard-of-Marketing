-- Create leads table for digital leads
CREATE TABLE IF NOT EXISTS digital_leads (
  expa_id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  university TEXT NOT NULL,
  internship_type TEXT,
  referral TEXT,
  volunteering BOOLEAN DEFAULT FALSE,
  professional BOOLEAN DEFAULT FALSE,
  teaching BOOLEAN DEFAULT FALSE,
  account_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leads table for physical attraction leads
CREATE TABLE IF NOT EXISTS physical_leads (
  expa_id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  university TEXT NOT NULL,
  university_level TEXT,
  field_of_study TEXT,
  internship_type TEXT,
  referral TEXT,
  member_name TEXT,
  hackathon_interest TEXT,
  account_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for digital leads
CREATE INDEX IF NOT EXISTS idx_digital_leads_submitted_at ON digital_leads(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_leads_university ON digital_leads(university);

-- Create indexes for physical leads
CREATE INDEX IF NOT EXISTS idx_physical_leads_submitted_at ON physical_leads(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_physical_leads_university ON physical_leads(university);
