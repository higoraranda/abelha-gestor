# Configuração e ativação revisável

## Desenvolvimento

Use Node 22.12+ (Vite 8 e dependências atuais). Frontend e backend mantêm seus `package-lock.json`. Instale com `npm ci` em cada diretório; nunca use `npm run seed` ou schema.sql em uma base existente.

Backend: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `FRONTEND_URL`, variáveis Evolution existentes. Frontend de desenvolvimento: `VITE_API_URL` aponta para o backend local. Produção mantém API pelo proxy existente e não recebe secrets VITE.

## Migration pendente

`backend/src/db/migrations/20261111_personal_platform.sql` foi testada somente em PostgreSQL embarcado efêmero com dados sintéticos. **Não aplicada ao Neon.** Não roda no startup. Produção continua usando o CRM sem depender das tabelas novas; entrar no Personal antes da ativação retorna erro 503 explicativo.

Para ativar: obter autorização específica do ambiente; verificar backup/ponto de restauração e diferenças de schema; executar apenas esta migration em uma transação com `lock_timeout` e `statement_timeout`; conferir preservação dos registros de negócio e isolamento com usuário sintético no ambiente de teste, antes de autorizar produção. Usar conexão direta, não pooler, para a migração. Não reutilizar uma autorização antiga de outra migration.

Tabelas novas usam organização/usuário e FKs compostas. Nenhum contrato, cobrança, despesa, conversa, senha ou sessão existente é alterado. O índice composto novo em users não muda os IDs existentes.

## Push

Gere chaves localmente com `node scripts/generate-vapid.cjs` no backend e guarde em secret manager/ambiente do servidor. O comando imprime um par novo: não versionar sua saída. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto/HTTPS válido). A API autenticada só retorna a chave pública. Sem as três variáveis o envio permanece desativado.

Subscriptions contêm endpoint e chaves de um dispositivo; persistem somente no backend, por usuário/organização. Payload enviado contém apenas chave estável/destino Personal, sem valores ou nomes. O service worker exibe texto genérico. Endpoints push aceitam provedores conhecidos e HTTPS, evitando requisições a URLs internas. Inscrição já ligada a outra conta não é transferida silenciosamente.

## Automação e preços

Consulte INTEGRACOES-N8N.md. `ABELHA_INTEGRATION_TOKEN` é separado da sessão do usuário e do secret GitHub. Conta da integração é fixada em `ABELHA_INTEGRATION_ORGANIZATION_ID` / `ABELHA_INTEGRATION_USER_ID`. `PRICE_ALLOWED_HOSTS` lista hosts exatos de lojas cuja fonte foi autorizada; sozinho não cria um provedor. O backend não faz scraping ou consultas pagas.

Em 12/11, os sete workflows já foram criados desativados na instância existente. Configuração por nó, credenciais de entrada/saída separadas e IDs em [CLOUDFY-N8N.md](CLOUDFY-N8N.md); não reimportar. O backend publicado ainda precisa receber esta versão após autorização, pois a consulta pública à nova rota de preços retornou 404.

## Verificações sem produção

Backend: `npm test` compila e executa testes puros e HTTP/SQL com PGlite em memória. O runner define DATABASE_URL fictícia antes de importar os routers; não conecta na carteira. O teste HTTP usa o próprio **postgres.js** via PGlite Socket em loopback, verificando inclusive a serialização de JSONB usada na persistência real. Todos os servidores/conexões fecham em `finally`. Frontend: `npm test`, `npm run lint`, `npm run build`. A verificação de UI usa prévia sintética separada, descrita em PROGRESSO.md.

Auditoria de ativação: os nove avisos herdados do backend foram corrigidos, incluindo os três críticos e dois altos. A auditoria adicional do frontend encontrou 21 entradas; ambas as árvores agora têm **zero vulnerabilidades reportadas pelo npm audit**, nos lockfiles locais revisados. Relatórios atuais: `dependency-audit.json` e `dependency-audit.frontend.json`; histórico e justificativa do override de minimatch em [AUDITORIA-ATIVACAO.md](AUDITORIA-ATIVACAO.md). Não foi usado `audit fix --force`.

Auth.js foi atualizado para Express 0.12.3/Core 0.41.3. Testes HTTP/SQL verificam login com senha, CSRF, rejeição de Bearer malformado, cookie seguro, logout e sessão sintética emitida pelo Core 0.35.0. **Preserve AUTH_SECRET, domínio/path e configuração de cookie em produção.** A fixture legada contém apenas dados e segredo sintéticos, nunca uma sessão real. A atualização não foi publicada.

Checklist manual completo: [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md). A auditoria local não substitui o ensaio autorizado na branch isolada e os testes físicos de push.

## Entrega push e falhas incertas

Entregas bem-sucedidas persistem por aparelho: uma falha temporária em outro dispositivo pode ser retomada sem reenviar aos aparelhos já confirmados. Endpoints expirados (404/410) são removidos. O logout tenta remover a inscrição e também a revoga no navegador; falhas de push não impedem a saída da conta.

A fila é paginada por aparelho: um dispositivo falhando não retém as notificações posteriores de outro. O contador de envio só inclui aceitação pelo provedor, sem contar endpoints expirados. Ao trocar VAPID, cada aparelho precisa reabrir e clicar em ativar; a chave é comparada e a inscrição antiga é substituída. Não rotacione o par a cada build.

Não há garantia distribuída de entrega exatamente uma vez: se o provedor aceitar o envio e o commit falhar, uma tentativa posterior pode repetir a entrega. `topic` e `Notification.tag` estáveis reduzem duplicação visual; `renotify` permanece falso. Isso precisa ser conferido em dispositivos reais antes de ativar push em produção.
