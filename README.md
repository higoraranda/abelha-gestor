![Capa do projeto](./capareadme.png)

# abelha-gestor

CRM web integrado ao WhatsApp, distribuído como SaaS multi-tenant. Permite que profissionais autônomos e pequenas empresas gerenciem conversas de WhatsApp, contatos e relacionamento comercial em um único painel — sem depender do WhatsApp Web.

---

## Visão Geral

O projeto nasce da necessidade de centralizar o atendimento via WhatsApp com contexto de CRM: quem é o cliente, a qual empresa ele pertence, qual o histórico de conversas e quais compromissos estão pendentes. Tudo isso acessível em uma interface construída para uso profissional.

**Público-alvo:** profissionais autônomos, consultores, pequenas empresas que usam WhatsApp como canal principal de atendimento.

**Modelo de distribuição:** SaaS multi-tenant — cada organização tem seus dados completamente isolados.

---

## Funcionalidades do MVP

| Módulo | Status |
|---|---|
| Autenticação com email e senha | Concluído |
| Caixa de entrada WhatsApp em tempo real (SSE) | Concluído |
| Envio de mensagens via WhatsApp | Concluído |
| Clientes — CRUD + entrada automática via WhatsApp | Concluído |
| Empresas — CRUD + vinculação com clientes | Concluído |
| Lembretes — CRUD + vinculação com clientes ou empresas | Concluído |
| Webhook processor (recebimento de mensagens) | Concluído |
| Conexão WhatsApp via QR Code | Bloqueado — ver seção de status |
| Tela de detalhe de empresa | Pendente |
| Formulário de criação de lembretes no frontend | Pendente |
| Deploy final | Pendente |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                  Usuário (Browser)                   │
│              React + Vite + TypeScript               │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP / SSE
                      ▼
┌─────────────────────────────────────────────────────┐
│              Backend Express (Node.js)               │
│                                                     │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │   Auth.js v5 │  │  REST API  │  │  SSE /events│ │
│  └──────────────┘  └─────┬──────┘  └──────┬──────┘ │
│                           │                │         │
│  ┌────────────────────────▼────────────────▼──────┐ │
│  │    Middleware de Tenant (organization_id)       │ │
│  └────────────────────────────────────────────────┘ │
│                           │                          │
│  ┌────────────────────────▼────────────────────────┐ │
│  │           Neon PostgreSQL (postgres.js)          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  POST /webhooks/evolution ← Evolution API   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                      │ HTTP
                      ▼
┌─────────────────────────────────────────────────────┐
│              Evolution API (self-hosted)             │
│          Uma instância por organização               │
│       Conectada ao WhatsApp via QR Code              │
└─────────────────────────────────────────────────────┘
```

### Fluxo de mensagem recebida

```
WhatsApp → Evolution API → POST /webhooks/evolution
  → valida X-Evolution-Secret
  → identifica tenant pelo instanceName
  → upsert cliente (cria se novo)
  → upsert conversa
  → insere mensagem (deduplicação por whatsapp_message_id)
  → atualiza last_message_at e unread_count
  → emite evento SSE para o frontend
```

### Fluxo de mensagem enviada

```
Usuário → POST /api/v1/messages
  → valida JWT + extrai organization_id
  → busca credenciais da Evolution API do tenant
  → envia para Evolution API
  → salva no banco (direction: 'out')
  → emite evento SSE
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Estilo | Tailwind CSS (dark mode) |
| Estado global | Zustand |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | PostgreSQL serverless (Neon) |
| ORM/Query builder | postgres.js (SQL nativo) |
| Autenticação | Auth.js v5 (cookie-based, Credentials provider) |
| WhatsApp | Evolution API (self-hosted) |
| Tempo real | SSE (Server-Sent Events) |
| Deploy frontend | Vercel |
| Deploy backend | Fly.io |

---

## Estrutura do Projeto

```
abelha-gestor/
│
├── backend/                        # API REST + webhook + SSE
│   └── src/
│       ├── app.ts                  # Express — registro de rotas e middlewares
│       ├── auth.config.ts          # Auth.js v5 — Credentials provider
│       ├── db/
│       │   ├── index.ts            # Conexão Neon via postgres.js
│       │   ├── schema.sql          # Schema completo (source of truth)
│       │   └── seed.ts             # Cria organização + usuário inicial
│       ├── middleware/
│       │   ├── auth.ts             # Valida sessão, injeta req.userId
│       │   └── tenant.ts           # Injeta req.organizationId
│       ├── routes/
│       │   ├── conversations.ts    # GET /  GET /:id  POST /:id/read
│       │   ├── messages.ts         # POST / — envia via Evolution API
│       │   ├── clients.ts          # CRUD + ?search= e ?company_id=
│       │   ├── companies.ts        # CRUD + contatos internos + lembretes
│       │   ├── reminders.ts        # CRUD + ?linked_type= e ?linked_id=
│       │   ├── webhooks.ts         # POST /evolution — recebe mensagens
│       │   └── events.ts           # GET / — stream SSE
│       └── services/
│           ├── evolutionApi.ts     # Cliente HTTP para a Evolution API
│           ├── sseManager.ts       # Gerencia conexões SSE por organização
│           └── webhookProcessor.ts # Processa payload da Evolution API
│
├── frontend/                       # SPA React
│   └── src/
│       ├── App.tsx                 # Rota única /* → AppPage
│       ├── types/index.ts          # Interfaces TypeScript do domínio
│       ├── lib/
│       │   ├── api.ts              # fetch wrapper com credentials: include
│       │   └── auth.ts             # login() / logout()
│       ├── store/
│       │   └── auth.ts             # Zustand — usuário persistido
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   └── AppPage.tsx         # Orquestrador — todo o estado aqui
│       └── components/
│           ├── layout/
│           │   ├── AppSidebar.tsx      # Sidebar 64px — empresas e navegação
│           │   ├── ClientColumn.tsx    # Coluna 240px — lista contextual
│           │   ├── ChatMessages.tsx    # Thread de mensagens + input
│           │   └── ClientDetailPanel.tsx # Painel 220px — info do cliente
│           └── clients/
│               ├── NewClientModal.tsx
│               └── NewCompanyModal.tsx
│
└── evolution/                      # Evolution API self-hosted
    ├── Dockerfile                  # Herda da imagem oficial + entrypoint custom
    ├── docker-entrypoint.sh        # Corrige .env e aplica migrations no startup
    └── fly.toml                    # Configuração Fly.io
```

---

## Banco de Dados

Toda tabela de dados de negócio tem `organization_id` como coluna obrigatória e indexada. Nenhuma query retorna dados sem esse filtro — é a regra de segurança central do projeto.

```sql
organizations       -- tenant raiz
users               -- 1 por organização no MVP
evolution_instances -- credenciais da Evolution API por organização
companies           -- empresas contratantes (múltiplas por organização)
company_contacts    -- contatos internos de cada empresa
clients             -- clientes finais; company_id nullable
conversations       -- uma por chat do WhatsApp
messages            -- direction: 'in' | 'out'
reminders           -- linked_type: 'client' | 'company' | null
```

---

## API — Endpoints Principais

Todas as rotas abaixo exigem sessão autenticada via cookie (Auth.js). O `organization_id` é extraído da sessão pelo middleware de tenant — nunca vem do frontend.

```
# Autenticação
GET  /api/auth/csrf
POST /api/auth/callback/credentials
GET  /api/auth/session
POST /api/auth/signout

# Conversas
GET  /api/v1/conversations          ?page= &limit=
GET  /api/v1/conversations/:id
POST /api/v1/conversations/:id/read

# Mensagens
POST /api/v1/messages               { conversation_id, content }

# Clientes
GET  /api/v1/clients                ?search= &company_id= &page= &limit=
GET  /api/v1/clients/:id
POST /api/v1/clients
PATCH /api/v1/clients/:id
DELETE /api/v1/clients/:id

# Empresas
GET  /api/v1/companies
GET  /api/v1/companies/:id          retorna + contatos internos + lembretes
POST /api/v1/companies
PATCH /api/v1/companies/:id
DELETE /api/v1/companies/:id

# Lembretes
GET  /api/v1/reminders              ?linked_type= &linked_id=
POST /api/v1/reminders
PATCH /api/v1/reminders/:id
DELETE /api/v1/reminders/:id

# Webhook (sem JWT — autenticado por secret no header)
POST /webhooks/evolution

# SSE
GET  /api/events
```

---

## Segurança Multi-Tenant

O `organization_id` é embutido no JWT no momento do login. O middleware de tenant o injeta em `req.organizationId` — toda query usa esse valor como filtro obrigatório.

O que nunca é feito:
- Receber `organization_id` do body ou query params em rotas protegidas
- Fazer queries sem `WHERE organization_id = $1`
- Retornar 403 (revela existência de dados de outro tenant) — sempre 404

---

## Configuração — Desenvolvimento Local

### Pré-requisitos

- Node.js 20+
- Conta no [Neon](https://neon.tech) (PostgreSQL serverless gratuito)
- Evolution API self-hosted com uma instância configurada

### Backend

```bash
cd backend
npm install
cp .env.example .env   # preencher as variáveis
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # preencher VITE_API_URL
npm run dev
```

### Banco de dados

```bash
# Rodar o schema
psql $DATABASE_URL < backend/src/db/schema.sql

# Criar organização e usuário inicial
cd backend && npx ts-node src/db/seed.ts
```

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://...?sslmode=require

AUTH_SECRET=                    # openssl rand -base64 32
AUTH_URL=http://localhost:3000

FRONTEND_URL=http://localhost:5173

EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=
EVOLUTION_WEBHOOK_SECRET=       # openssl rand -base64 32

NODE_ENV=development
PORT=3000
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:3000
```

---

## Status Atual

O projeto está com o backend e frontend do MVP praticamente completos. O bloqueio atual está na hospedagem da Evolution API.

**Problema:** provedores de cloud (Fly.io, AWS, GCP, etc.) têm seus IPs frequentemente bloqueados pelo WhatsApp ao usar o protocolo Baileys (WhatsApp Web). A Evolution API inicia mas não consegue gerar o QR Code de conexão.

**Caminho para desbloquear:** hospedar a Evolution API em uma VPS com IP não-cloud (Oracle Cloud Always Free, Hetzner, DigitalOcean) ou em um servidor próprio.

---

## Roadmap

- [x] Fase 1 — Fundação: banco, auth, middleware de tenant
- [x] Fase 2A — Evolution API deployada
- [x] Fase 2B — Webhook processor + rotas de backend completas
- [ ] Fase 2C — Conexão WhatsApp (bloqueado — ver status acima)
- [x] Fase 3 — Caixa de entrada com SSE
- [x] Fase 4 — Módulo de clientes completo
- [x] Fase 5 — Módulo de empresas (backend completo / UI de detalhe pendente)
- [x] Fase 6 — Módulo de lembretes (backend completo / criação no frontend pendente)
- [ ] Fase 7 — Gerenciamento WhatsApp (QR Code, status)
- [ ] Fase 8 — Deploy final (Vercel + Fly.io)
- [ ] Fase 9 — Inteligência Artificial (resumo de conversa, sugestão de resposta, classificação de urgência)

---

## Licença

MIT License — veja o arquivo [LICENSE](LICENSE) para detalhes.
