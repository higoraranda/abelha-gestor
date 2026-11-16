# Configuração e ativação revisável

**Release publicado16/11:** frontend/backend Production e HML em94ccaa03b24f402f1519b3654219f54070c77bec. HML e leitura autenticada Production confirmadas pelo usuário; Render On Commit e Vercel Automatic restaurados. Não repetir migrations ou publicação a partir das instruções históricas abaixo. n8n segue HML/inativo; fase4 sem autorização e propostas de segredos privadas não aplicadas. [Estado final](SPRINT-LANCAMENTO-20261116.md), [transição futura](releases/n8n-production-transition-20261116.json).

Release autorizado16/11: patch do relógio n8n remoto aplicado/conferido, somente tick, workflow inativo/HML. Controles de deploy temporariamente Render Off/Vercel exit0, originais On Commit/Automatic registrados. Aguardar SHA do commit/push manual na main antes de qualquer deploy; promover Production somente após delta HML aprovado. Restaurar controles ao final. Fase4 (destinos/credenciais/ativação n8n Production) permanece sem autorização. [Execução atual](SPRINT-LANCAMENTO-20261116.md).

Estado final16/11: [publicação coordenada e rollback](SPRINT-LANCAMENTO-20261116.md), com correções DELETE/PWA e preços opt-in ainda locais. HML publicado conserva40c179c; produção Vercel23c06eb/Render2dcc9d0. Não fazer push manual na main antes de controlar os auto-deploys de produção. Propostas exclusivas de automação estão ignoradas em `.abelha-homologacao/propostas-producao/`, sem aplicação; preservar credenciais HML, AUTH_SECRET e VAPID existentes. Migration já aplicada, sem nova execução.

Estado13/11: [Vercel Preview conectado ao backend HML](VERCEL-PREVIEW-HOMOLOGACAO.md), com Dark Mode e BACKEND_URL somente em Preview. Render HML usa main/40c179c, Auto-Deploy desligado e FRONTEND_URL do novo Preview. Sem mudanças na produção; offline remoto depende de acesso estático compatível com a proteção Vercel. Os detalhes de12/11 abaixo conservam o histórico anterior.

## Desenvolvimento

Backend de homologação **ativo no Render Free**: https://abelha-gestor-api-hml.onrender.com, branch main, Auto-Deploy desligado. Database **abelha_homologacao**, role própria e compute Neon existente habilitado em0,25CU. AUTH_URL, FRONTEND_URL e VAPID foram configurados com os destinos de homologação. Conexão/secrets somente em `.abelha-homologacao/backend.env`, fora do Git; backend/.env de produção preservado. Resultado e próximo passo Preview: [RENDER-HOMOLOGACAO.md](RENDER-HOMOLOGACAO.md).

Use Node 22.12+ (Vite 8 e dependências atuais). Frontend e backend mantêm seus `package-lock.json`. Instale com `npm ci` em cada diretório; nunca use `npm run seed` ou schema.sql em uma base existente.

Backend: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `FRONTEND_URL`, variáveis Evolution existentes. Frontend de desenvolvimento: `VITE_API_URL` aponta para o backend local. Produção mantém API pelo proxy existente e não recebe secrets VITE.

## Migration aplicada em produção

`backend/src/db/migrations/20261111_personal_platform.sql` foi ensaiada em isolamento e aplicada após autorização em **16/11/2026**, no Neon produção br-square-sunset-acpb91u2/neondb. COMMIT da transação71684 confirmado;35 tabelas,92 índices e17 tabelas CRM preservadas por contagens/hashes. Snapshot Free snap-silent-fog-acdvwgeu mantido sem expiração. Usuário confirmou Personal, Leads e Templates abrindo sem erro. [Resultado e limites](EXECUCAO-MIGRATION-PERSONAL.md). A migration não roda no startup e não deve ser executada novamente.

Para futuras migrations: obter autorização específica, revalidar backup/catálogo, ensaiar com dados sintéticos em isolamento e usar transação limitada por timeouts e conexão direta. A autorização da execução concluída não se estende a novas migrations ou restaurações. Não apagar as tabelas recém-criadas como rollback automático.

Tabelas novas usam organização/usuário e FKs compostas. Nenhum contrato, cobrança, despesa, conversa, senha ou sessão existente é alterado. O índice composto novo em users não muda os IDs existentes.

## Push

Gere chaves localmente com `node scripts/generate-vapid.cjs` no backend e guarde em secret manager/ambiente do servidor. O comando imprime um par novo: não versionar sua saída. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto/HTTPS válido). A API autenticada só retorna a chave pública. Sem as três variáveis o envio permanece desativado.

Subscriptions contêm endpoint e chaves de um dispositivo; persistem somente no backend, por usuário/organização. Payload enviado contém apenas chave estável/destino Personal, sem valores ou nomes. O service worker exibe texto genérico. Endpoints push aceitam provedores conhecidos e HTTPS, evitando requisições a URLs internas. Inscrição já ligada a outra conta não é transferida silenciosamente.

## Automação e preços

Consulte INTEGRACOES-N8N.md. `ABELHA_INTEGRATION_TOKEN` é separado da sessão do usuário e do secret GitHub. Conta da integração é fixada em `ABELHA_INTEGRATION_ORGANIZATION_ID` / `ABELHA_INTEGRATION_USER_ID`. `PRICE_ALLOWED_HOSTS` lista hosts exatos de lojas cuja fonte foi autorizada; sozinho não cria um provedor. O backend não faz scraping ou consultas pagas.

O backend de homologação está live e seu token de integração foi validado. Preços retornam503 enquanto não houver fonte/allowlist autorizada. O workflow único ainda precisa receber credenciais e destinos de homologação; permanece desativado. Os sete workflows antigos são backups desativados, documentados em [CLOUDFY-N8N.md](CLOUDFY-N8N.md); não reimportar.

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
