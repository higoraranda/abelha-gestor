# Banco da reformulação

## Estado atual — 05/11/2026

A reformulação passou nos testes de integração e na interface usando uma branch Neon isolada autorizada pelo usuário. **Migration aplicada com autorização explícita em `production`; ativação concluída.** A configuração local de conexão permaneceu intacta.

Projeto existente: MELAO CRM (`curly-river-94350351`). Produção: `br-square-sunset-acpb91u2`, endpoint original `ep-wandering-pond-acitqqn8`.

Branch criada após autorização explícita: `codex-abelha-reform-test-20261105` (`br-hidden-night-ace956m0`), filha de production. Endpoint de teste: `ep-crimson-snow-acmuhqgp.sa-east-1.aws.neon.tech`, compute limitado a 0,25 CU.

## Verificação concluída

- Migration aplicada em schemas sintéticos na branch de teste e reaplicada para verificar idempotência.
- API: tarefas, retorno à coluna anterior, operações entre organizações, notas/próxima ação, conversão inválida com rollback, conversão confirmada/reenvio, notificações, exportações e relatórios.
- Concorrência real: 12 confirmações simultâneas da mesma oportunidade resultaram em 1 contrato e 2 cobranças de R$ 500,00, sem duplicação. Uma resposta criou o contrato; onze reutilizaram o vínculo.
- Estado de notificação consultado por uma conexão independente e validado após recarregar a interface.
- Regressão de fuso: aplicação real com sessão PostgreSQL em outro dia/fuso. Cobrança com vencimento no dia brasileiro permaneceu A vencer nas listas, filtros e totais financeiros.
- Navegador com backend real e registros sintéticos: arrastar card, quadro/checklist nos dois sentidos, criar tarefa, cadastrar prospect sem contrato, criar oportunidade, probabilidade automática, cancelar/confirmar contrato com 5% de desconto, notas, favoritos, próxima ação, busca, notificações, CSV/JSON baixados, baixa/reabertura e relatório de recebimentos.
- Cancelamento pelo navegador comprovado por consulta ao banco: oportunidade permaneceu em proposal, preservando os 1 contrato/2 cobranças sintéticos anteriores. Confirmação posterior criou um único contrato de R$ 3.800,00 a partir de R$ 4.000,00 à vista.
- Testes não usaram registros pessoais como massa de gravação. A branch contém a cópia padrão do Neon, mas os testes copiaram apenas estrutura para namespaces próprios e operaram somente neles.

Total: 18 testes puros + 3 testes de integração aprovados. TypeScript, ESLint, build de produção e revisão independente aprovados.

## Migration aplicada e conferida

Arquivo: `backend/src/db/migrations/20261105_personal_crm.sql`.

- Acrescenta `clients.favorite` e `reminders.is_next_action`, inicialmente falsos.
- Cria notas datadas, tarefas de entrega, oportunidades com detalhes e estados de notificações.
- Usa relações compostas por organização/registro e índices escopados.
- Não cria tarefas para contratos antigos, não altera valores/datas de cobranças nem recalcula contratos.
- Não contém reset, limpeza ou seed. As estruturas usam IF NOT EXISTS.
- Executar em uma transação, somente no ambiente expressamente autorizado.

**Não executar `backend/src/db/schema.sql`: ele contém DROP TABLE.**

O usuário autorizou expressamente a migration em production após os testes isolados. Aplicado somente o arquivo acima, em transação REPEATABLE READ, com limite de espera de lock, timeout e trava de execução. SHA-256: 23465af517e20dc578f8fddfb05d5afb6ccc50c3a90ee68609131cc8f00d8e05.

Uma tabela temporária ON COMMIT DROP guardou contagens e fingerprints dos registros de clientes, lembretes, contratos, cobranças e despesas. A verificação antes/depois ocorreu na mesma transação e abortaria a operação em caso de diferença, desconsiderando apenas as duas colunas novas. Resultado: registros existentes preservados. Sem reset, seed ou recálculo.

Pós-commit: 4 tabelas, 2 colunas e 6 índices novos confirmados. Nenhuma nota, tarefa, oportunidade ou estado de aviso fictício foi criado na carteira. A tabela temporária de verificação desapareceu ao concluir a transação.

## Reexecução dos testes

A partir de `backend`, depois de disponibilizar novamente o compute da branch de teste autorizada:

```powershell
node node_modules/typescript/bin/tsc
node src/integration/run-branch-tests.mjs ep-crimson-snow-acmuhqgp.sa-east-1.aws.neon.tech
```

O runner recusa o endpoint atual do aplicativo, preserva `.env`, altera a conexão somente na memória do processo filho e exige o host isolado antes de qualquer DDL. Os testes criam nomes exclusivos de schema e encerram seus servidores/conexões. O teste inicial desfaz uma transação; os testes de concorrência/fuso precisam de múltiplas conexões e removem somente seus schemas sintéticos ao terminar, verificando que desapareceram.

A prévia manual usa `node src/integration/preview-branch.mjs <host-isolado>`; ela sobe backend real e Vite em loopback, cria apenas dados de teste, registra PIDs e remove seus processos/schema ao receber `stop`. Nunca executar contra o host da carteira.

## Encerramento confirmado

- Todos os schemas `abelha_test_*`, `abelha_concurrent_*` e `abelha_ui_*` desta execução foram removidos; consulta final retornou zero.
- Antes da ativação, os campos/tabelas novos estavam ausentes em production e no public da branch de teste. Após autorização, production recebeu a migration; o public da branch de teste permanece como cópia anterior.
- Backend/Vite temporários e seus filhos encerrados; portas 3000 e 4173 liberadas. Downloads sintéticos removidos após conferência. Aba fechada e viewport restaurado.
- Endpoint de teste desativado (`disabled=true`), estado final `idle`. A branch está preservada como referência da validação; seu compute não foi deixado ativo. Nenhuma configuração de plano/cobrança foi alterada.

## Decisões de dados

- Quadro e checklist usam o mesmo `delivery_tasks.id`; não há uma segunda lista sincronizada.
- Conclusão guarda a coluna anterior; reabertura sem histórico retorna a A fazer.
- Ganho só acontece na transação de contrato/cobranças; cancelar o assistente conserva a etapa anterior sem chamar conversão.
- Probabilidade é derivada da etapa. Ganhos/perdidos ficam fora dos totais abertos.
- Avisos são calculados sob consulta; leitura/descarte persistem por organização/chave estável. Reagendar pode gerar novo aviso. Sem workers externos.
- Consultas financeiras, agenda e notificações seguem America/Sao_Paulo. Datas civis armazenadas permanecem intactas; a correção de fuso muda somente a classificação sob consulta e o padrão de novas baixas sem data fornecida.
- JSON v1 usa lista explícita de campos e preserva IDs/relações; não é restauração validada. Credenciais/configuração não entram na consulta. Chaves sensíveis em objetos estruturados são removidas; texto livre de negócio permanece sem promessa de varredura de segredos digitados pelo usuário.

## Conferência final da carteira real

Após a migration, 14 consultas HTTP da aplicação real passaram: clientes, visão geral, tarefas, pipeline, contratos, avisos, busca, relatórios, financeiro, lembretes, relacionamento/detalhe e exportações JSON/CSV. As exportações foram inspecionadas somente em memória, sem salvar dados pessoais em arquivos. A conexão desta inspeção usou default_transaction_read_only=on, sem alterar a configuração global do banco nem o .env.

No navegador, visão geral/clientes abriram com os registros existentes; entregas e pipeline exibiram estados vazios válidos, sem erro de migration pendente. Console sem erros. Nenhuma gravação de negócio ou abertura de conversa foi feita. Prévia e filhos encerrados (backend21544, Vite5800, filhos22428/16540 e auxiliar8256); portas3000/4173 livres. Captura final: abelha-ativado-desktop.png no diretório de visualizações desta conversa. Código não foi publicado, commitado ou enviado.
