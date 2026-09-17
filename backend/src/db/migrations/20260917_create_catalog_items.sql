-- Catálogo pessoal de produtos, serviços e regras de preço.
-- Migração aditiva: não remove nem altera dados existentes.

CREATE TABLE IF NOT EXISTS catalog_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                  VARCHAR(120),
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  item_type             VARCHAR(30) NOT NULL DEFAULT 'service'
                          CHECK (item_type IN ('service', 'package', 'plan', 'addon', 'option')),
  category              VARCHAR(60) NOT NULL DEFAULT 'outros',
  base_price            NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  setup_price           NUMERIC(12, 2) CHECK (setup_price IS NULL OR setup_price >= 0),
  monthly_price         NUMERIC(12, 2) CHECK (monthly_price IS NULL OR monthly_price >= 0),
  premium_monthly_price NUMERIC(12, 2) CHECK (premium_monthly_price IS NULL OR premium_monthly_price >= 0),
  weight                INTEGER CHECK (weight IS NULL OR weight >= 0),
  pages_included        INTEGER CHECK (pages_included IS NULL OR pages_included >= 0),
  extra_page_price      NUMERIC(12, 2) CHECK (extra_page_price IS NULL OR extra_page_price >= 0),
  multiplier            NUMERIC(8, 4) CHECK (multiplier IS NULL OR multiplier > 0),
  per_page              BOOLEAN NOT NULL DEFAULT FALSE,
  featured              BOOLEAN NOT NULL DEFAULT FALSE,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  included_item_codes   TEXT[] NOT NULL DEFAULT '{}',
  attributes            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_organization
  ON catalog_items (organization_id, active, category, name);

WITH seed (
  code, name, description, item_type, category, base_price, setup_price,
  monthly_price, premium_monthly_price, weight, pages_included,
  extra_page_price, multiplier, per_page, featured, included_item_codes, attributes
) AS (VALUES
  -- Automações avulsas
  ('atendimento_ia', 'Atendimento personalizado com IA', NULL::text, 'service', 'automacao', 1000, NULL, NULL, NULL, 2, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('agendamento_calendar', 'Agendamento Google Calendar', NULL, 'service', 'automacao', 800, NULL, NULL, NULL, 2, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('followup_pos_consulta', 'Follow-up pós-consulta', NULL, 'service', 'automacao', 500, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('lembretes_consulta', 'Lembretes de consulta', NULL, 'service', 'automacao', 400, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('confirmacao_presenca', 'Confirmação de presença', NULL, 'service', 'automacao', 500, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('recuperacao_inativos', 'Recuperação de inativos', NULL, 'service', 'automacao', 900, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('triagem_sintomas', 'Triagem por sintomas', NULL, 'service', 'automacao', 1200, NULL, NULL, NULL, 2, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('nps_satisfacao', 'NPS / Satisfação', NULL, 'service', 'automacao', 400, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('aniversariantes', 'Aniversariantes', NULL, 'service', 'automacao', 250, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('cobranca_inadimplentes', 'Cobrança de inadimplentes', NULL, 'service', 'automacao', 700, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('captacao_leads', 'Captação e qualificação de leads', NULL, 'service', 'automacao', 1200, NULL, NULL, NULL, 2, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('segunda_via_docs', 'Segunda via de documentos', NULL, 'service', 'automacao', 500, NULL, NULL, NULL, 1, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),

  -- Pacotes de automação
  ('pacote_basic', 'BASIC', 'Pacote inicial de automação', 'package', 'automacao', 0, 1600, 600, 600, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY['atendimento_ia','lembretes_consulta','confirmacao_presenca'], '{}'::jsonb),
  ('pacote_plus', 'PLUS', 'Pacote intermediário de automação', 'package', 'automacao', 0, 2500, 750, 750, NULL, NULL, NULL, NULL, FALSE, TRUE, ARRAY['atendimento_ia','agendamento_calendar','lembretes_consulta','confirmacao_presenca','followup_pos_consulta'], '{}'::jsonb),
  ('pacote_advanced', 'ADVANCED', 'Pacote avançado de automação', 'package', 'automacao', 0, 3500, 900, 900, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY['atendimento_ia','agendamento_calendar','lembretes_consulta','confirmacao_presenca','followup_pos_consulta','recuperacao_inativos','nps_satisfacao','aniversariantes'], '{}'::jsonb),

  -- Tipos de projeto web
  ('landing_page', 'Landing Page', '1 página de conversão', 'service', 'site', 800, NULL, NULL, NULL, NULL, 1, 400, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('site_institucional', 'Site Institucional', 'Site completo para empresas', 'service', 'site', 1500, NULL, NULL, NULL, NULL, 5, 250, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('blog_portal', 'Blog / Portal de Conteúdo', 'Blog ou portal de notícias', 'service', 'site', 2000, NULL, NULL, NULL, NULL, 6, 200, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('ecommerce', 'E-commerce / Loja Virtual', 'Loja virtual completa', 'service', 'site', 3500, NULL, NULL, NULL, NULL, 7, 250, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('sistema_web', 'Software / SaaS', 'Sistema ou aplicação web', 'service', 'site', 5000, NULL, NULL, NULL, NULL, 8, 350, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('portfolio', 'Portfólio', 'Portfólio profissional', 'service', 'site', 1000, NULL, NULL, NULL, NULL, 4, 200, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('site_evento', 'Site para Evento', 'Página para evento ou lançamento', 'service', 'site', 1200, NULL, NULL, NULL, NULL, 3, 250, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('linktree', 'Linktree / Link em Bio', 'Entrega em 3 a 5 dias, sem mensalidade', 'service', 'site', 150, NULL, 0, NULL, NULL, 1, 0, NULL, FALSE, FALSE, ARRAY[]::text[], '{"fixedPrice":true}'::jsonb),

  -- Níveis de design
  ('design_simples', 'Design simples', 'Template adaptado', 'option', 'design', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.00, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('design_intermediario', 'Design intermediário', 'Design customizado e identidade visual', 'option', 'design', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.15, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('design_avancado', 'Design avançado', 'Design único, animações e microinterações', 'option', 'design', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.30, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('design_premium', 'Design premium', 'Motion design, ilustrações e acabamento exclusivo', 'option', 'design', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.45, FALSE, TRUE, ARRAY[]::text[], '{}'::jsonb),

  -- Funcionalidades extras para sites
  ('blog_integrado', 'Blog integrado', NULL, 'addon', 'site_extra', 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('area_restrita', 'Área restrita / login de usuário', NULL, 'addon', 'site_extra', 800, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('painel_admin', 'Painel administrativo customizado', NULL, 'addon', 'site_extra', 1500, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('integracao_whatsapp', 'Integração com WhatsApp', NULL, 'addon', 'site_extra', 300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('formulario_avancado', 'Formulário avançado', 'Multi-step e validações', 'addon', 'site_extra', 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('analytics_pixel', 'Google Analytics + Pixel Meta', NULL, 'addon', 'site_extra', 300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('seo_avancado', 'SEO técnico avançado', NULL, 'addon', 'site_extra', 700, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('multilingue', 'Multilíngue', 'Valor por idioma extra', 'addon', 'site_extra', 600, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('agendamento_online', 'Agendamento online', NULL, 'addon', 'site_extra', 1000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('integracao_api', 'Integração com sistema externo (API)', NULL, 'addon', 'site_extra', 1000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('chatbot_basico', 'Chatbot básico (sem IA)', NULL, 'addon', 'site_extra', 500, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('chatbot_ia', 'Chatbot com IA', NULL, 'addon', 'site_extra', 1200, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('newsletter', 'Newsletter / captura de e-mail', NULL, 'addon', 'site_extra', 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('galeria_avancada', 'Galeria de fotos avançada', NULL, 'addon', 'site_extra', 300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('video_animacoes', 'Vídeo de fundo / animações', NULL, 'addon', 'site_extra', 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('gateway_pagamento', 'Integração com gateway de pagamento', NULL, 'addon', 'site_extra', 800, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('comentarios', 'Sistema de comentários', NULL, 'addon', 'site_extra', 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('mapa_customizado', 'Mapa interativo customizado', NULL, 'addon', 'site_extra', 500, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('calculadora_online', 'Calculadora online customizada', NULL, 'addon', 'site_extra', 800, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('catalogo_sem_checkout', 'Catálogo de produtos sem checkout', NULL, 'addon', 'site_extra', 700, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('filtros_busca', 'Filtros e busca avançada', NULL, 'addon', 'site_extra', 600, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('feed_redes_sociais', 'Integração com redes sociais', 'Feed automático', 'addon', 'site_extra', 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('lgpd', 'LGPD', 'Banner de cookies e política gerada', 'addon', 'site_extra', 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('banco_imagens', 'Banco de imagens', 'Seleção de imagens para o projeto', 'addon', 'site_extra', 200, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),

  -- Conteúdo, prazo e mensalidade
  ('conteudo_cliente', 'Cliente fornece o conteúdo', NULL, 'option', 'conteudo', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('conteudo_adaptado', 'Adaptação do conteúdo do cliente', NULL, 'option', 'conteudo', 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('conteudo_do_zero', 'Produção de conteúdo do zero', 'Valor por página', 'option', 'conteudo', 150, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('prazo_padrao', 'Prazo padrão', '30 dias', 'option', 'prazo', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.00, FALSE, FALSE, ARRAY[]::text[], '{"delivery":"30 dias"}'::jsonb),
  ('prazo_acelerado', 'Prazo acelerado', '15 a 20 dias', 'option', 'prazo', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.20, FALSE, FALSE, ARRAY[]::text[], '{"delivery":"15-20 dias"}'::jsonb),
  ('prazo_urgente', 'Prazo urgente', 'Até 10 dias', 'option', 'prazo', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.50, FALSE, TRUE, ARRAY[]::text[], '{"delivery":"até 10 dias"}'::jsonb),
  ('plano_essencial', 'Plano Essencial', 'Hospedagem, domínio, SSL, backup mensal, segurança e suporte por e-mail', 'plan', 'site_mensal', 0, NULL, 100, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{"setupBracketStep":1000,"multiplierStep":0.5,"maxSetup":50000}'::jsonb),
  ('plano_plus', 'Plano Plus', 'Essencial + 2h/mês de alterações, backup semanal, WhatsApp e relatório', 'plan', 'site_mensal', 0, NULL, 250, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, ARRAY[]::text[], '{"setupBracketStep":1000,"multiplierStep":0.5,"maxSetup":50000}'::jsonb),
  ('plano_premium', 'Plano Premium', 'Plus + alterações ilimitadas, post mensal, SEO contínuo e suporte prioritário', 'plan', 'site_mensal', 0, NULL, 500, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, ARRAY[]::text[], '{"setupBracketStep":1000,"multiplierStep":0.5,"maxSetup":50000}'::jsonb),

  -- Multiplicadores regionais usados pela calculadora
  ('regiao_salto', 'Salto', 'Multiplicador regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.00, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_itu', 'Itu', 'Multiplicador regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.00, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_indaiatuba', 'Indaiatuba', 'Multiplicador regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.20, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_sorocaba', 'Sorocaba', 'Multiplicador regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.40, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_campinas', 'Campinas', 'Multiplicador regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.40, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_interior', 'Cidade pequena / interior', 'Preset regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.00, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_media', 'Cidade média', 'Preset regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.20, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_polo', 'Cidade grande / polo regional', 'Preset regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.40, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('regiao_capital', 'Capital / grande centro', 'Preset regional', 'option', 'regiao', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1.60, FALSE, FALSE, ARRAY[]::text[], '{}'::jsonb),
  ('combo_site_automacao', 'Combo site + automação', 'Desconto no setup combinado', 'package', 'combo', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, ARRAY[]::text[], '{"discountPercent":10}'::jsonb)
)
INSERT INTO catalog_items (
  organization_id, code, name, description, item_type, category, base_price,
  setup_price, monthly_price, premium_monthly_price, weight, pages_included,
  extra_page_price, multiplier, per_page, featured, included_item_codes, attributes
)
SELECT
  organizations.id, seed.code, seed.name, seed.description, seed.item_type, seed.category,
  seed.base_price, seed.setup_price, seed.monthly_price, seed.premium_monthly_price,
  seed.weight, seed.pages_included, seed.extra_page_price, seed.multiplier,
  seed.per_page, seed.featured, seed.included_item_codes, seed.attributes
FROM organizations
CROSS JOIN seed
ON CONFLICT (organization_id, code) DO NOTHING;
