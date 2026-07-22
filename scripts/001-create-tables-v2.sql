-- Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  auth_user_id UUID UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  status TEXT DEFAULT 'novo',
  priority TEXT DEFAULT 'média',
  notes TEXT,
  
  -- Timestamps
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lead_history table for tracking actions
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
