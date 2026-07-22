-- Tabela para acompanhamento de status dos leads
CREATE TABLE IF NOT EXISTS lead_tracking (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  lead_type VARCHAR(20) NOT NULL CHECK (lead_type IN ('atacado', 'varejo')),
  respondido BOOLEAN DEFAULT FALSE,
  convertido BOOLEAN DEFAULT FALSE,
  vendedor_nome VARCHAR(255),
  data_resposta TIMESTAMP,
  data_conversao TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_id, lead_type)
);

-- Index para buscar por vendedor
CREATE INDEX IF NOT EXISTS idx_lead_tracking_vendedor ON lead_tracking(vendedor_nome);

-- Index para buscar por status
CREATE INDEX IF NOT EXISTS idx_lead_tracking_status ON lead_tracking(respondido, convertido);

-- RLS policies
ALTER TABLE lead_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on lead_tracking" ON lead_tracking
  FOR ALL USING (true) WITH CHECK (true);
