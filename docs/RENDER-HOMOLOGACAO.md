# Backend de homologação — Render

Estado verificado em12/11/2026: **ativo, deploy live, integração sintética aprovada**. Nenhum commit, push, merge, PR, migration ou alteração de produção nesta etapa.

## Serviço e origem

| Configuração | Estado |
|---|---|
| URL HTTPS | https://abelha-gestor-api-hml.onrender.com |
| Serviço | abelha-gestor-api-hml / srv-dbr3if3tqb8s73cr2jn0 |
| Workspace | tea-d0sgutadbo4c73f2qgvg |
| Plano / região / runtime | Free / Oregon / Node.js |
| Repositório / branch | higoraranda/abelha-gestor / codex/homologacao-abelha |
| Commit implantado | 37f989809041aff6150b3ec3405bdda65622adf8 |
| Deploy validado | dep-dbr3in49v7es73ekeq6g / live |
| Auto-Deploy | Desativado |
| Build | cd backend && npm ci --include=dev && npm run build |
| Start | cd backend && npm start |
| Diretório de execução | backend, pelos comandos; Root Directory do serviço fica vazio |
| Saúde | Checagem TCP padrão do Render; GET /health validado separadamente com HTTP200 |

A adaptação de diretório e saúde foi autorizada explicitamente: a interface de criação disponível não expõe Root Directory nem Health Check. Não foi configurado um health check HTTP gerenciado no Render. O primeiro deploy começou na criação; após obter a URL real, AUTH_URL foi configurada e houve deploy manual da configuração final, sem mudar a branch.

O plano Free pode suspender o serviço por inatividade; a próxima requisição pode ter partida demorada. Referências: [Render Free](https://render.com/docs/free) e [health checks](https://render.com/docs/health-checks).

## Neon e isolamento

- Projeto Free curly-river-94350351; branch br-hidden-night-ace956m0; compute existente ep-crimson-snow-acmuhqgp, habilitado com mínimo=máximo0,25CU. Sem upgrade, nova branch ou novo compute.
- Database abelha_homologacao e role abelha_hml_app. Nenhuma migration foi repetida; o schema existente de35 tabelas/18 Personal foi reutilizado.
- Mantida somente a identidade sintética já preparada. Não foram utilizadas credenciais ou registros de produção.
- A conexão real confirmou current_database/current_user; um projeto criado pela API HTTPS foi encontrado nesse banco com o proprietário sintético correto. Isso comprova o caminho API → banco isolado, além da configuração declarada.
- Fixtures de projeto e captura foram removidas por identificadores exclusivos. Contagens/fingerprints das35 tabelas iguais ao início:1 organização,1 usuário e zero registros de negócio.
- Serviço Render e disponibilidade do compute são mantidos para o uso de homologação solicitado. Conexões/sessões do teste foram encerradas; nenhum servidor local temporário foi iniciado.

## Variáveis do backend

Configuradas com valores exclusivos de homologação; valores secretos não constam deste documento:

| Nomes | Verificação |
|---|---|
| DATABASE_URL | Role/database/host isolados; leitura e escrita HTTP/SQL comprovadas |
| AUTH_SECRET, AUTH_URL, NODE_ENV | Login/sessão/saída e cookie seguro aprovados; URL real do backend de homologação |
| FRONTEND_URL | Origem HTTPS exata do Preview existente, validada por CORS |
| ABELHA_INTEGRATION_TOKEN | Token correto aceito e inválido rejeitado |
| ABELHA_INTEGRATION_ORGANIZATION_ID, ABELHA_INTEGRATION_USER_ID | Conta sintética da mesma organização, resolvida pelo servidor |
| VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT | Par próprio, subject HTTPS válido; configuração reconhecida; nenhum push real enviado |
| GITHUB_WEBHOOK_SECRET | Ping HMAC válido aceito, sem evento de negócio |

Pendentes/opcionais: **PRICE_ALLOWED_HOSTS**, **EVOLUTION_API_URL**, **EVOLUTION_API_KEY**, **EVOLUTION_WEBHOOK_SECRET**. Dependem de fontes/contas autorizadas; não bloqueiam o Personal. Preços reais, WhatsApp e entrega push física não foram testados. A autenticação do backend para n8n está pronta, mas as credenciais do workflow e seus dez destinos HTTP ainda precisam ser configurados em homologação.

Os arquivos privados .abelha-homologacao/backend.env e credenciais-hml.json permanecem ignorados pelo Git. backend/.env de produção foi preservado.

## Testes remotos aprovados

1. Identidade PostgreSQL, role e baseline sintética.
2. GET /health200.
3. Personal sem sessão401.
4. Login com CSRF, sessão com os UUIDs sintéticos e cookie Secure/HttpOnly/SameSite=Lax.
5. GET preferences, notifications, projects, finance, subscriptions, prices e reviews:200; chave VAPID pública corresponde à homologação.
6. CORS com credentials aceita a origem Preview; a origem de produção não recebe permissão CORS.
7. Mutação sem X-Abelha-Client:web403; projeto HTTPS encontrado no banco de homologação.
8. Token de integração inválido401; tick autenticado200, push configurado/sent0; prices/due503 enquanto não há fonte autorizada.
9. Captura sintética201 e reenvio com mesmo ID/reused=true, sem duplicação.
10. Ping GitHub com assinatura HMAC válida200.
11. Logout e rejeição de nova consulta protegida401.
12. Limpeza das fixtures e restauração das35 contagens/fingerprints.

## Logs e limites

Logs do serviço confirmaram inicialização na porta10000 e deploy live. Não foram encontrados erros de conexão, exceções não tratadas ou falhas CORS nos testes. Foi observado o aviso **env-url-basepath-redundant**: a versão atual da biblioteca o emite quando AUTH_URL e basePath estão presentes. A URL canônica foi mantida conforme a configuração solicitada; login/sessão passaram. O aviso não foi ocultado e não houve alteração de código para silenciá-lo.

Produção srv-daldd0142hec73c3ltt0 preservada: mesmas configurações e histórico de deploys antes/depois, commit live observado4f78117b308f71b08fcb55dc9e102e7d3e3c9acd. O workflow n20DNyb13Aaw3nq5 continua desativado, com62 nós. Nenhum deploy de frontend foi iniciado nesta etapa.

## Próximo passo — Vercel Preview

1. No projeto abelha-gestor, definir **BACKEND_URL** somente em Preview para a URL HTTPS deste backend. Não modificar Production nem colocar tokens em VITE_*.
2. Publicar/reimplantar somente o Preview da branch de homologação quando autorizado; alterações de variáveis exigem novo deployment para entrar em vigor. Se a URL Preview mudar, atualizar FRONTEND_URL somente no backend de homologação e fazer deploy manual desse serviço.
3. Testar login/logout pelo proxy do Preview, cookies no domínio do frontend, sete telas Personal, atualização e reconexão da PWA.
4. Depois, configurar a credencial Header Auth e os dez destinos backend do workflow único para esta homologação. Manter o workflow desativado até autorização própria; não usar a URL de produção em testes de gravação.

Relatório estruturado: [render-homologation-20261112.json](audits/render-homologation-20261112.json).
