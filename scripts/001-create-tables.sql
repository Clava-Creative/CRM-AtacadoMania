-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  auth_user_id UUID UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Customer info
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  country TEXT,
  language TEXT DEFAULT 'Português',
  
  -- Interest info
  shoe_type TEXT,
  brands_of_interest TEXT[],
  already_resells BOOLEAN DEFAULT FALSE,
  estimated_volume TEXT,
  urgency TEXT DEFAULT 'média',
  
  -- Conversation context
  conversation_summary TEXT,
  client_questions TEXT,
  funnel_stage TEXT DEFAULT 'qualificação',
  qualification_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Management
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'convertido', 'perdido')),
  priority TEXT DEFAULT 'média' CHECK (priority IN ('alta', 'média', 'baixa')),
  notes TEXT,
  
  -- Timestamps
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lead_history table for tracking actions
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID REFERENCES sellers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_seller_id ON leads(seller_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_forwarded_at ON leads(forwarded_at);
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);

-- Enable Row Level Security
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sellers
CREATE POLICY "Sellers can view their own profile"
  ON sellers FOR SELECT
  USING (auth.uid() = auth_user_id);

-- RLS Policies for leads
CREATE POLICY "Sellers can view their own leads"
  ON leads FOR SELECT
  USING (seller_id IN (SELECT id FROM sellers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Sellers can update their own leads"
  ON leads FOR UPDATE
  USING (seller_id IN (SELECT id FROM sellers WHERE auth_user_id = auth.uid()));

-- RLS Policies for lead_history
CREATE POLICY "Sellers can view history of their leads"
  ON lead_history FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE seller_id IN (SELECT id FROM sellers WHERE auth_user_id = auth.uid())));

CREATE POLICY "Sellers can insert history for their leads"
  ON lead_history FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE seller_id IN (SELECT id FROM sellers WHERE auth_user_id = auth.uid())));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for leads updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
