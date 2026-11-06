-- Create opportunities table for admin-created opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  university_id TEXT NOT NULL,
  title TEXT NOT NULL,
  product TEXT NOT NULL,
  opportunity_type TEXT,
  organisation TEXT,
  location TEXT,
  description TEXT,
  country TEXT,
  duration TEXT,
  opportunity_date TEXT,
  salary TEXT,
  accommodation TEXT,
  food TEXT,
  transportation TEXT,
  computer TEXT,
  benefits TEXT, -- JSON array
  requirements TEXT, -- JSON array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by university
CREATE INDEX IF NOT EXISTS idx_opportunities_university_id ON opportunities(university_id);

-- Create index for faster queries by product
CREATE INDEX IF NOT EXISTS idx_opportunities_product ON opportunities(product);
