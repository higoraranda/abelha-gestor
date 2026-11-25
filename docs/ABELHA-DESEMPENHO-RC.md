# Abelha RC: JavaScript inicial, PWA e contingência de carregamento

## Evidência local comparável

Checkout `higoraranda/abelha-gestor`, branch local `feature/phase-01-multi-tenant-foundation`. As duas compilações foram executadas no mesmo computador, com `frontend/node_modules/.bin/vite.cmd build --configLoader runner` e Vite 8.3.8 já instalado.

| Indicador | Baseline antes da divisão | Candidato |
|---|---:|---:|
| JavaScript do chunk principal (minificado, saída do Vite) | 500,27 kB | 267,60 kB |
| gzip do chunk principal (saída do Vite) | 142,83 kB | 86,35 kB |
| CSS inicial (saída do Vite) | 149,41 kB | 142,27 kB |

O chunk principal reduziu aproximadamente **46,5%** sem alteração do limite de aviso. O bundle separa a área do proprietário da área convidada. Projetos, Financeiro CRM, Financeiro Personal, Conversas, Busca Lead, Contas, Preços, Agenda e Relatórios só carregam quando solicitados. O Chrome em loopback (com SW bloqueado para medir o caminho de rede e HTTP sintético) observou 267.601 bytes JS no login a frio, 396.478 bytes no primeiro panorama autenticado e 419.518 bytes após abrir Projetos. Esse script soma módulos distintos carregados no fluxo, não imagens, CSS, transferências HTTP reais ou o custo da instalação do PWA. O controle foi o tamanho compilado do chunk monolítico; não é medição de latência em usuários reais.

## Cache, falhas e acessos

O worker existente continua validando e instalando atomicamente a lista pública de arquivos da mesma versão. O teste garante que todos os módulos e CSS gerados são incluídos; o precache do PWA ainda baixa todos os assets públicos em segundo plano na instalação. O ganho não significa que o total a instalar foi reduzido. Não há cache de APIs, sessão autenticada, mutações ou dados privados; o teste integrado abre offline só a interface pública, sem revelar projetos, e confirma retorno ao reconectar e atualização manual preservando um rascunho.

Uma falha ao importar uma área mostra erro, sem recarregar automaticamente ou prometer que um rascunho está persistido. Se ocorrer numa área interna, o menu continua utilizável e trocar de vista limpa o erro daquela vista. O botão de recarga é explícito. O teste aborta uma requisição do chunk de Projetos para validar esse caminho.

A Abelha inicia o voo sem botão manual e mantém o pulso em movimento reduzido durante o carregamento normal. Quando a espera excede 45 s, há falha de sessão/imagem ou conexão offline, entra em recuperação visível, para o voo e oferece tentar novamente. As sondagens continuam com backoff quando cabível para recuperar instabilidade; a sessão nunca é presumida. Em estado saudável, o pouso e a transição permanecem guiados pela prontidão real. A falha de backend foi simulada com relógio e respostas controladas, não provocada em produção.

## Limites e próxima medição

Não foram adicionadas dependências nem modificados índices, limites de banco ou temporizações de produto. Os endpoints de projetos usam organização/usuário no filtro e limite existente de 100; a latência de agregação/ordenação e o perfil de índices devem ser medidos com dados representativos antes de mudar paginação ou adicionar índice. O cenário de inicialização já verifica uma única consulta de sessão após o health OK. APIs de áreas que não foram abertas não são necessárias para carregar seus módulos; a invalidação compartilhada ainda pode disparar consulta para visões montadas após mutação. Não reduza chamadas removendo invalidação sem instrumentar o fluxo e testar consistência. Uso de memória real, latência de produção, volume do cache em dispositivo físico e cold start no Render ficam **não verificados** sem ambiente real autorizado e telemetria. Um relatório de cold start deve separar DNS/TLS, primeira resposta de health, confirmação de sessão e tempo até a interação, e comparar frio/quente sem fazer requisições repetidas só para manter o serviço acordado.

## Reprodução

Com a aplicação compilada e os executáveis Playwright/Chrome já disponíveis: `cd frontend; node scripts/verify-route-splitting.cjs`, `node scripts/verify-bee-loader.cjs`. Use `ABELHA_PLAYWRIGHT_MODULE` e `ABELHA_BROWSER_EXECUTABLE` para apontar instalações existentes. Testes Personal/PWA e Dark Mode usam somente a prévia sintética isolada `backend/scripts/preview-personal.cjs`, nunca Vercel/Render de produção.
