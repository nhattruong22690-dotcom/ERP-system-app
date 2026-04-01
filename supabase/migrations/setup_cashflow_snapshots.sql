-- Set up cashflow_snapshots table
CREATE TABLE IF NOT EXISTS public.cashflow_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INT NOT NULL,
  month INT NOT NULL,
  branch_id TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(year, month, branch_id)
);

-- Enable RLS
ALTER TABLE public.cashflow_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/anon users to read and write (matching the current app's architecture)
CREATE POLICY "Enable full access for cashflow_snapshots" 
ON public.cashflow_snapshots 
FOR ALL 
USING (true);
