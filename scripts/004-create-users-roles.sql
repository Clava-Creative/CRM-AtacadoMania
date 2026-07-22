-- Tabela de usuários do sistema
CREATE TABLE IF NOT EXISTS crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor')),
  vendedor_nome TEXT, -- Nome do vendedor que corresponde às tabelas de distribuição
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_crm_users_email ON crm_users(email);
CREATE INDEX IF NOT EXISTS idx_crm_users_auth_user_id ON crm_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_users_vendedor_nome ON crm_users(vendedor_nome);

-- Inserir usuário admin padrão
INSERT INTO crm_users (email, nome, role, vendedor_nome)
VALUES ('admin@calcados.com', 'Administrador', 'admin', NULL)
ON CONFLICT (email) DO NOTHING;

-- Buscar vendedores únicos das tabelas de distribuição e criar usuários
INSERT INTO crm_users (email, nome, role, vendedor_nome)
SELECT DISTINCT
  LOWER(REPLACE(vendedor_nome, ' ', '.')) || '@calcados.com' as email,
  vendedor_nome as nome,
  'vendedor' as role,
  vendedor_nome
FROM distribuicao_vendedores
WHERE vendedor_nome IS NOT NULL
ON CONFLICT (email) DO NOTHING;

INSERT INTO crm_users (email, nome, role, vendedor_nome)
SELECT DISTINCT
  LOWER(REPLACE(vendedor_nome, ' ', '.')) || '@calcados.com' as email,
  vendedor_nome as nome,
  'vendedor' as role,
  vendedor_nome
FROM distribuicao_vendedores_varejo
WHERE vendedor_nome IS NOT NULL
ON CONFLICT (email) DO NOTHING;

COMMIT;
