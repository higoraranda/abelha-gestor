# Loader de inicialização do Abelha

## Objetivo e decisões
Reutilizar intacto `frontend/public/bee-mark.png`, a marca usada no login e na navegação. O PNG transparente contém apenas a abelha, sem camadas ou flor. A flor será um SVG independente; não haverá redesenho da abelha nem extração artificial de asas. Usar React, CSS e Web Animations API, sem dependências novas, vídeos ou GIFs. Consumir os tokens escuros atuais de `theme.css`.

O loader envolve o roteador antes da montagem das telas. Estados: `loading` (voo contínuo), `finishing` (voo da posição atual até o miolo, redução e ocultação atrás das pétalas, saída suave) e `done` (montagem do sistema). A conclusão dispara uma vez por inicialização, sem interferir nas regras de sessão existentes.

Disponibilidade será verificada por GET `/api/v1/health`, alias do `/health` atual para passar pelo proxy já existente. Exigir resposta JSON `{status:"ok"}`, sem cache. Timeout por tentativa de 12 segundos, intervalo de 2,5 segundos entre tentativas, sem sobreposição. Após 45 segundos, informar demora e oferecer tentativa imediata, mantendo as tentativas automáticas e o voo. Offline tem orientação própria. Desmontagem cancela requisição, timers, listeners e animações. Preferência por movimento reduzido elimina o voo e encurta a conclusão.

## Execução e validação
- [x] Testar falha de rede/HTTP, HTML de fallback, JSON inválido, timeout, cancelamento e recuperação antes de implementar o polling em `frontend/src/lib/backendReady.ts`.
- [x] Criar `useBackendReady.ts`, `BeeLoader.tsx` e `BeeLoader.css`; integrar em `App.tsx` e expor o alias de health no backend.
- [x] Executar testes, lint, build e validação de UI pertinente; verificar em navegador loop, conclusão única, mobile, offline, retry e movimento reduzido com respostas sintéticas locais.
- [x] Revisar o diff, registrar fatos duradouros pertinentes e encerrar os processos temporários criados. Permanecer em `main`, sem commit, push ou deploy.

## Evidências locais
- `cd frontend; npm test`: 25 testes aprovados, incluindo 5 de disponibilidade/cancelamento.
- `cd frontend; npm run lint` e `npm run build`: aprovados. `cd backend; npm run build`: aprovado.
- `cd frontend; npm run test:loader`, com Playwright/Chromium disponíveis por `ABELHA_PLAYWRIGHT_MODULE` e `ABELHA_BROWSER_EXECUTABLE`: aprovado em desktop, 390px, offline/reconexão, teclado, movimento reduzido e aviso de demora com relógio simulado. Servidor loopback e navegador encerrados no `finally`.
- Smoke do backend compilado, com URL de banco sintética em loopback: `/health` e `/api/v1/health` retornaram 200, JSON de saúde e `Cache-Control: no-store`. Processo encerrado e porta verificada como liberada; nenhum banco remoto consultado.
- Auditoria estática estrita: 39 achados existentes em formulários/textareas, já contemplados como divergências em `UX-CONTRACT.md`; nenhum nos arquivos do loader. Não equivale à aprovação global nessa auditoria.
- Capturas e resultados descartáveis em `.abelha-homologacao/bee-loader/`. Nenhuma publicação remota realizada. A disponibilização exige publicar o alias do backend junto ao frontend; o endpoint informa disponibilidade do processo HTTP, sem testar banco ou integrações.
