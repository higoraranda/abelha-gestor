# Arquitetura incremental — CRM + Personal

## Auditoria de 11/11/2026

Checkout limpo em `main`, HEAD `96a5441`; remoto `higoraranda/abelha-gestor`. React 19.2, Vite 8, TypeScript 6 no frontend; Express 4, Auth.js, postgres.js e TypeScript 5 no backend. O README contém seções históricas; o código e os manifests prevalecem para a stack atual.

CRM existente: visão geral, carteira/relacionamento, contratos/cobranças, tarefas em quadro/checklist, pipeline, relatórios, agenda, exportações, notificações internas e WhatsApp/SSE. Reutilizar Modal/Radix, DataState, useRemote, api, workspace.css e URL query params.

Neon consultado exclusivamente em leitura: projeto `curly-river-94350351`, branch production `br-square-sunset-acpb91u2`, PostgreSQL 18.6; delivery_tasks existe, personal_projects e push_subscriptions ausentes. Branch antiga de testes existe, documentada com compute desativado. Nenhuma infraestrutura foi reativada ou provisionada.

## Decisões

- Mesmo frontend e backend; domínio Personal em rotas e tabelas próprias. Sem reescrever CRM/autenticação.
- Ambiente e tela explicitados na URL; links antigos CRM continuam válidos. Trocar de ambiente remove seleção de registro do outro domínio.
- Personal exige identidade real do usuário. Na prévia local usa somente o único usuário existente na organização identificada pelo middleware atual; ambiguidade retorna erro, sem criar identidade.
- Cache PWA limitado a shell público/recursos estáticos compilados. APIs, autenticação, SSE e dados privados nunca entram no Cache Storage; sem fila de escrita offline. Atualização depende de ação explícita, preservando formulários abertos.
- Push com VAPID no servidor, payload discreto sem nomes/valores financeiros; chaves de inscrição nunca em logs/exportações. Permissão apenas por botão. Destinos de push limitados a provedores conhecidos para evitar SSRF.
- Migrações somente aditivas e transacionais, sem execução automática no startup. Testes de banco usam PostgreSQL embarcado efêmero (PGlite) com dados sintéticos, sem DATABASE_URL do usuário; a persistência real permanece Neon/postgres.js.
- n8n orquestra chamadas; backend autoriza, valida e persiste. Token de integração separado, vinculado a usuário/organização por configuração do servidor; idempotência no banco.
- Relatórios de projetos são declarações auditáveis, não prova automática. Não aceitar `passed:true` como verificação externa; exigir commit/PR/testes/critérios e confirmação do usuário antes de concluir um marco.
- Fontes externas opcionais; falha é erro visível, nunca resultado vazio inventado. Preços sem provedor permanecem aguardando configuração.

## Riscos e ativação

Atualização12/11: ensaio PostgreSQL real na branch isolada aprovado com credencial/schema próprios, depois removidos; compute desativado/idle e public preservado. Render/Vercel já publicaram2485697. Guard de preview e runner de ensaio são alterações locais adicionais; configuração persistente e limites em [HOMOLOGACAO-INTEGRACAO.md](HOMOLOGACAO-INTEGRACAO.md). A migration Personal permanece ausente em produção; n8n segue desativado.

Produção não possui as tabelas novas. APIs devem retornar 503 informativo até a aplicação autorizada das migrations. VAPID, token n8n, validação GitHub e agendamento dependem de configuração; não presumir credenciais. Testes locais não comprovam entrega push em aparelhos físicos nem workflows ativos.

Revisão de ativação em 11/11/2026: Auth.js corrigido com compatibilidade de sessão sintética anterior comprovada; auditorias npm sem alertas nos lockfiles locais; timeout de busca frontend maior que o transporte Overpass; cache valida MIME; fila push por aparelho e janela de virada para agendamento. Isolamento de leitura permanece no backend, com integridade por FKs, sem RLS para acesso SQL externo. Evidências e limites em [AUDITORIA-ATIVACAO.md](AUDITORIA-ATIVACAO.md); sequência manual em [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md).
