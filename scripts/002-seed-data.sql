-- Insert test seller (will be linked to auth user after signup)
INSERT INTO sellers (id, email, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'maria@calcados.com', 'Maria Silva')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;

-- Insert sample leads for Maria
INSERT INTO leads (
  seller_id, name, phone, city, country, language,
  shoe_type, brands_of_interest, already_resells, estimated_volume, urgency,
  conversation_summary, client_questions, funnel_stage,
  status, priority, notes, forwarded_at
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'João Carlos Mendes',
    '+5511999887766',
    'São Paulo',
    'Brasil',
    'Português',
    'Tênis esportivos',
    ARRAY['Nike', 'Adidas', 'Puma'],
    true,
    '500-1000 pares/mês',
    'alta',
    'Cliente interessado em tênis esportivos para revenda. Já possui loja física em SP com bom movimento. Quer iniciar parceria para importação direta.',
    'Qual o prazo de entrega? Quais as condições de pagamento?',
    'negociação',
    'em_atendimento',
    'alta',
    'Cliente prioritário - potencial de grande volume',
    NOW() - INTERVAL '2 days'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Ana Paula Rodrigues',
    '+5521988776655',
    'Rio de Janeiro',
    'Brasil',
    'Português',
    'Sandálias femininas',
    ARRAY['Arezzo', 'Schutz'],
    false,
    '100-200 pares/mês',
    'média',
    'Primeira vez importando. Interessada em sandálias femininas de qualidade para venda online.',
    'Como funciona o processo de importação?',
    'qualificação',
    'novo',
    'média',
    NULL,
    NOW() - INTERVAL '1 hour'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Carlos Eduardo Lima',
    '+5531977665544',
    'Belo Horizonte',
    'Brasil',
    'Português',
    'Sapatos sociais',
    ARRAY['Ferracini', 'Democrata'],
    true,
    '200-500 pares/mês',
    'baixa',
    'Lojista experiente buscando novos fornecedores. Atualmente trabalha com 3 marcas nacionais.',
    'Vocês trabalham com consignação?',
    'qualificação',
    'novo',
    'baixa',
    NULL,
    NOW() - INTERVAL '3 days'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Fernanda Costa',
    '+5541966554433',
    'Curitiba',
    'Brasil',
    'Português',
    'Tênis casuais',
    ARRAY['Vans', 'Converse', 'New Balance'],
    true,
    '300-500 pares/mês',
    'alta',
    'Dona de e-commerce focado em tênis casuais. Quer exclusividade regional para algumas marcas.',
    'É possível ter exclusividade de marca na região sul?',
    'proposta',
    'em_atendimento',
    'alta',
    'Agendar call para apresentar proposta',
    NOW() - INTERVAL '5 hours'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Roberto Almeida',
    '+5585955443322',
    'Fortaleza',
    'Brasil',
    'Português',
    'Chinelos e slides',
    ARRAY['Havaianas', 'Rider'],
    true,
    '1000+ pares/mês',
    'alta',
    'Grande distribuidor do Nordeste. Busca preços competitivos para alto volume.',
    'Qual desconto para pedidos acima de 1000 pares?',
    'fechamento',
    'convertido',
    'alta',
    'Pedido fechado! Primeiro lote de 1500 pares',
    NOW() - INTERVAL '7 days'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Mariana Santos',
    '+5551944332211',
    'Porto Alegre',
    'Brasil',
    'Português',
    'Botas femininas',
    ARRAY['Via Marte', 'Bottero'],
    false,
    '50-100 pares/mês',
    'média',
    'Influenciadora digital interessada em revender para seguidores.',
    'Vocês fazem dropshipping?',
    'qualificação',
    'perdido',
    'baixa',
    'Não temos estrutura para dropshipping no momento',
    NOW() - INTERVAL '10 days'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Pedro Henrique Souza',
    '+5562933221100',
    'Goiânia',
    'Brasil',
    'Português',
    'Sapatos infantis',
    ARRAY['Pampili', 'Bibi'],
    true,
    '200-300 pares/mês',
    'média',
    'Loja especializada em calçados infantis. Busca ampliar portfólio de marcas.',
    'Trabalham com todas as numerações infantis?',
    'negociação',
    'em_atendimento',
    'média',
    'Enviado catálogo completo',
    NOW() - INTERVAL '1 day'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Luciana Ferreira',
    '+5571922110099',
    'Salvador',
    'Brasil',
    'Português',
    'Tênis esportivos',
    ARRAY['Mizuno', 'Asics'],
    false,
    '100-200 pares/mês',
    'alta',
    'Personal trainer querendo abrir loja de artigos esportivos.',
    'Preciso de CNPJ para comprar?',
    'qualificação',
    'novo',
    'alta',
    NULL,
    NOW() - INTERVAL '30 minutes'
  );

-- Insert sample history
INSERT INTO lead_history (lead_id, action, old_value, new_value, performed_by)
SELECT 
  l.id,
  'status_change',
  'novo',
  'em_atendimento',
  s.id
FROM leads l
JOIN sellers s ON l.seller_id = s.id
WHERE l.name = 'João Carlos Mendes';

INSERT INTO lead_history (lead_id, action, old_value, new_value, performed_by)
SELECT 
  l.id,
  'note_added',
  NULL,
  'Cliente prioritário - potencial de grande volume',
  s.id
FROM leads l
JOIN sellers s ON l.seller_id = s.id
WHERE l.name = 'João Carlos Mendes';
