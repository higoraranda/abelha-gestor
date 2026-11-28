# Contratos de interface — Abelha

Fonte de produto: docs/ROADMAP-ABELHA.md, docs/ARQUITETURA-PERSONAL.md, docs/briefing-aprovado.md. Valores visuais atuais: DESIGN.md; tokens executáveis: frontend/src/theme.css; componentes compartilhados: frontend/src/workspace.css. A direção escura de 12/11/2026 substitui a paleta clara do briefing, preservando os fluxos.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | select nativo + workspace.css | DESIGN.md | Opções curtas, rótulo acessível, teclado do sistema | Browser: seleção/teclado |
| Date | input date/time nativo + lib/time.ts | docs/ARQUITETURA-PERSONAL.md | Datas civis; horários America/Sao_Paulo | Testes de fuso e browser |
| Form | crm-form + Modal.tsx + API | Fluxos existentes CRM e pedido de preservação | Validação nativa de required/min/max + servidor; bloqueio de envio duplicado e rascunho mantido | Browser e API real sintética |
| Scrollbar | workspace.css | DESIGN.md | Rolagem visível; quadros/tabelas com rolagem interna | Browser em 390px |
| Toast | feedback inline role=status/alert | Fluxos existentes CRM | Sucesso junto à ação; erro persistente | Browser/erros API |
| CRUD | useRemote.ts + lib/api.ts | docs/ARQUITETURA-PERSONAL.md | Consultas canceláveis; atualizar após salvar; cancelar não grava | Testes HTTP/SQL e browser |
| Modal | components/ui/Modal.tsx | DESIGN.md | Radix, Escape, foco/restauração, conteúdo rolável | Browser/teclado |
| Navegação | lib/navigation.ts + AppSidebar/AppPage | DESIGN.md | Sidebar desktop e menu lateral compacto via Radix. URL e histórico preservados. Estado ativo com `aria-current` | Testes e browser em 320–1920 px |
| Inicialização | BeeLoader.tsx + useBackendReady.ts + lib/backendReady.ts + lib/beeMotion.ts | Pedido do loader e DESIGN.md | loading → finishing → done; GET /api/v1/health sem cache, backoff 2,5–10s e timeout 12s; aguardar imagem e sessão, snapshot consumível apenas no primeiro acesso e descartado ao mudar histórico/usuário; erros com retry, offline e controle de voo com preferência dinâmica; telas montadas após concluir | backendReady.test.mjs + beeMotion.test.mjs + auth.test.mjs + scripts/verify-bee-loader.cjs |

O tema começa escuro. Em CRM e Personal, o controle fica no rodapé da sidebar em desktop e na barra compacta em celular. Autenticação e área de convidados mantêm seus controles. A escolha fica no navegador, é aplicada pelo HTML antes de carregar o React e vale para a aplicação instalada na mesma origem. Controles nativos seguem o tema ativo. A impressão do extrato usa papel claro. Conversas, feedback e diálogos consomem os tokens compartilhados. Evidências em `docs/DARK-MODE.md` e nos relatórios operacionais.

Decisão de compatibilidade: manter validação nativa dos formulários, com validação de autoridade no servidor, e textareas redimensionáveis verticalmente como no CRM existente. O auditor da skill exige `noValidate` e `resize:none` independentemente do contrato: esses achados serão registrados como divergências conhecidas, sem reescrever os formulários comerciais para atender uma preferência genérica da ferramenta. Isso não representa aprovação integral na auditoria estática.

## PWA e dados privados
Offline mostra aviso e exige reconexão para consultar/salvar dados. Não disponibilizar último financeiro por cache. Atualização manual não recarrega uma tela silenciosamente. Permissão push apenas após clique; negar permissão não impede uso normal. Notificações na tela bloqueada têm texto genérico.

## Projetos e integrações
Sem status/progresso fictício em vazio. Marco só conclui após critérios e evidência revisados; relatório recebido permanece pendente. Reexecução conserva o mesmo registro. APIs sem configuração explicam a ação necessária.
