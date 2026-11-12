# Configuração e ativação revisável

## Desenvolvimento

Homologação persistente preparada após autorização A: database **abelha_homologacao** na branch Neon de teste, schema completo e role própria verificados. Conexão/secrets novos somente em `.abelha-homologacao/backend.env`, fora do Git; URLs/contato VAPID ainda pendentes. Compute desativado até a próxima autorização de disponibilidade. Backend futuro deve usar a revisão de homologação aprovada e publicada manualmente, nunca reutilizar backend/.env de produção. Consulte [ATIVACAO-BRANCH-BANCO.md](ATIVACAO-BRANCH-BANCO.md).

Use Node 22.12+ (Vite 8 e dependências atuais). Frontend e backend mantêm seus `package-lock.json`. Instale com `npm ci` em cada diretório; nunca use `npm run seed` ou schema.sql em uma base existente.

Backend: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `FRONTEND_URL`, variáveis Evolution existentes. Frontend de desenvolvimento: `VITE_API_URL` aponta para o backend local. Produção mantém API pelo proxy existente e não recebe secrets VITE.

## Migration pendente

`backend/src/db/migrations/20261111_personal_platform.sql` passou em PGlite e no **Neon isolado autorizado em12/11**, com dados sintéticos:18 tabelas, reexecução, FKs/isolamento e preservação. Schemas/role de teste foram removidos; o public da branch foi preservado por rollback e o compute voltou a disabled/idle. **Não aplicada à produção.** Não roda no startup. Produção continua usando o CRM sem depender das tabelas novas; entrar no Personal antes da ativação retorna erro 503 explicativo. Estado e configuração de homologação: [HOMOLOGACAO-INTEGRACAO.md](HOMOLOGACAO-INTEGRACAO.md).

Para ativar: obter autorização específica do ambiente; verificar backup/ponto de restauração e diferenças de schema; executar apenas esta migration em uma transação com `lock_timeout` e `statement_timeout`; conferir preservação dos registros de negócio e isolamento com usuário sintético no ambiente de teste, antes de autorizar produção. Usar conexão direta, não pooler, para a migração. Não reutilizar uma autorização antiga de outra migration.

Tabelas novas usam organização/usuário e FKs compostas. Nenhum contrato, cobrança, despesa, conversa, senha ou sessão existente é alterado. O índice composto novo em users não muda os IDs existentes.

## Push

Gere chaves localmente com `node scripts/generate-vapid.cjs` no backend e guarde em secret manager/ambiente do servidor. O comando imprime um par novo: não versionar sua saída. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto/HTTPS válido). A API autenticada só retorna a chave pública. Sem as três variáveis o envio permanece desativado.

Subscriptions contêm endpoint e chaves de um dispositivo; persistem somente no backend, por usuário/organização. Payload enviado contém apenas chave estável/destino Personal, sem valores ou nomes. O service worker exibe texto genérico. Endpoints push aceitam provedores conhecidos e HTTPS, evitando requisições a URLs internas. Inscrição já ligada a outra conta não é transferida silenciosamente.

## Automação e preços

Consulte INTEGRACOES-N8N.md. `ABELHA_INTEGRATION_TOKEN` é separado da sessão do usuário e do secret GitHub. Conta da integração é fixada em `ABELHA_INTEGRATION_ORGANIZATION_ID` / `ABELHA_INTEGRATION_USER_ID`. `PRICE_ALLOWED_HOSTS` lista hosts exatos de lojas cuja fonte foi autorizada; sozinho não cria um provedor. O backend não faz scraping ou consultas pagas.

Em12/11, Render/Vercel já publicaram a base2485697. A nova rota de preços responde503 por integração não configurada; o404 anterior é histórico. O serviço de homologação ainda não existe. Os sete workflows antigos são backups desativados, documentados em [CLOUDFY-N8N.md](CLOUDFY-N8N.md); não reimportar.

Eles foram posteriormente consolidados em **🐝 ABELHA — AUTOMAÇÕES / n20DNyb13Aaw3nq5**. Configurar somente esse workflow conforme [WORKFLOW-UNICO-N8N.md](WORKFLOW-UNICO-N8N.md); os sete anteriores permanecem backups desativados, sem chamadas entre workflows.

## Verificações sem produção

Backend: `npm test` compila e executa testes puros e HTTP/SQL com PGlite em memória. O runner define DATABASE_URL fictícia antes de importar os routers; não conecta na carteira. O teste HTTP usa o próprio **postgres.js** via PGlite Socket em loopback, verificando inclusive a serialização de JSONB usada na persistência real. Todos os servidores/conexões fecham em `finally`. Frontend: `npm test`, `npm run lint`, `npm run build`. A verificação de UI usa prévia sintética separada, descrita em PROGRESSO.md.

Auditoria de ativação: os nove avisos herdados do backend foram corrigidos, incluindo os três críticos e dois altos. A auditoria adicional do frontend encontrou 21 entradas; ambas as árvores agora têm **zero vulnerabilidades reportadas pelo npm audit**, nos lockfiles locais revisados. Relatórios atuais: `dependency-audit.json` e `dependency-audit.frontend.json`; histórico e justificativa do override de minimatch em [AUDITORIA-ATIVACAO.md](AUDITORIA-ATIVACAO.md). Não foi usado `audit fix --force`.

Auth.js foi atualizado para Express 0.12.3/Core 0.41.3, já incluído na base2485697 publicada. Testes HTTP/SQL verificam login com senha, CSRF, rejeição de Bearer malformado, cookie seguro, logout e sessão sintética emitida pelo Core 0.35.0. **Preserve AUTH_SECRET, domínio/path e configuração de cookie em produção.** A fixture legada contém apenas dados e segredo sintéticos, nunca uma sessão real.

Checklist manual completo: [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md). O ensaio isolado passou; a validação de runtime n8n e testes físicos de push continuam pendentes. Em Preview, criar BACKEND_URL somente no servidor Vercel, escopo Preview, com backend HTTPS isolado. O guard local bloqueia ausência/host conhecido de produção antes do fetch; ainda precisa ser publicado após autorização. Nunca tratar VITE_API_URL como configuração desse proxy.

## Entrega push e falhas incertas

Entregas bem-sucedidas persistem por aparelho: uma falha temporária em outro dispositivo pode ser retomada sem reenviar aos aparelhos já confirmados. Endpoints expirados (404/410) são removidos. O logout tenta remover a inscrição e também a revoga no navegador; falhas de push não impedem a saída da conta.

A fila é paginada por aparelho: um dispositivo falhando não retém as notificações posteriores de outro. O contador de envio só inclui aceitação pelo provedor, sem contar endpoints expirados. Ao trocar VAPID, cada aparelho precisa reabrir e clicar em ativar; a chave é comparada e a inscrição antiga é substituída. Não rotacione o par a cada build.

Não há garantia distribuída de entrega exatamente uma vez: se o provedor aceitar o envio e o commit falhar, uma tentativa posterior pode repetir a entrega. `topic` e `Notification.tag` estáveis reduzem duplicação visual; `renotify` permanece falso. Isso precisa ser conferido em dispositivos reais antes de ativar push em produção.
