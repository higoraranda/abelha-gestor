# Integração por projeto — verificação 03.3

Data: 2026-11-25. Ambiente: checkout local, diretórios descartáveis e PGlite em memória. Nenhuma entrega desta missão foi enviada ao Abelha remoto ou ao cofre real. Nenhuma configuração global, conexão Codex, projeto, hook ou serviço permanente foi criado.

## Resultado e limites

O transporte opt-in existente identifica o checkout pelo `origin` GitHub e pelo SHA de `HEAD`, lista os projetos permitidos pelo token dedicado, exige uma correspondência exata e pede o ID quando o repositório é ambíguo. Ele grava uma nota técnica imutável antes do envio e mantém o mesmo evento nas tentativas transitórias. O SHA identifica o commit; não certifica alterações ainda sem commit.

Nesta missão, o recebimento também passa a gerar uma segunda nota imutável `AAAA-MM-DD-task_id-comprovante.md` com UUID do projeto, UUID retornado pelo Abelha, SHA e estado `pending_review`. Antes, o comprovante ficava somente na saída do processo. O retorno do script adiciona `delivery_note`. Uma resposta sem UUID válido não cria comprovante. Conflito ou falha de escrita após o servidor receber gera erro de reconciliação: repetir o mesmo evento e conteúdo, sem criar outro evento. A nota anterior nunca é sobrescrita.

| Requisito | Evidência local | Estado |
| --- | --- | --- |
| Identificação e vínculo por repositório | Dois repositórios sintéticos distintos selecionam IDs corretos; teste adicional rejeita vínculo ambíguo e SHA diferente | PASS local |
| Nota técnica, bloqueios e próxima etapa | Diretórios descartáveis contêm nota pendente com testes, bloqueios e próxima atividade | PASS local |
| Envio e comprovante | Contrato de transporte injetado testa retorno e persistência do UUID; suíte da API usa Express/PGlite e comprova relatório pendente | PASS local; envio externo BLOCKED |
| Histórico | API persiste relatório, reaproveita o mesmo evento e recusa conteúdo alterado | PASS local |
| Idempotência e falhas | Mesmo conteúdo reaproveita notas; HTTP 401 sem retry; 503 até três tentativas; resposta inválida sem comprovante; conflito preserva nota existente | PASS local |
| Revogação | Transporte recusa 401 na listagem sem gravar nova nota nem enviar; API exige token dedicado e escopo autorizado | PASS local |
| Progresso comprovado e aceite humano | API mantém marco aberto após receber relatório; exige `reviewed: true` na sessão autenticada para concluir; contagens são derivadas dos marcos revisados | PASS local para o controle; conclusão automática BLOCKED |
| Trigger automático ao concluir tarefa | Nenhum evento de conclusão de tarefa foi observado nem hook foi instalado ou aceito no cliente | BLOCKED |

Os testes de transporte dos dois projetos não usam Actions URLs inventadas nem pretendem validar o esquema completo do relatório. A suíte preexistente da API usa fixtures sintéticas do esquema. Nenhuma dessas verificações comprova execução real de CI, automação por evento, publicação ou funcionamento remoto.

## Gates para ativação real

1. Escolher um projeto já cadastrado e confirmar seu par ID/repositório e a pasta técnica correspondente no cofre. Manter o token dedicado em ambiente privado e escopo restrito no backend; revogar retirando a concessão ou rotacionando esse token. O script não cadastra projetos nem escolhe a pasta do cofre automaticamente.
2. Obter evidência real aceita pelo contrato. `backend/src/services/personal.ts::reportInput` exige pelo menos um teste aprovado com `evidence_url` em `https://github.com/<org>/<repo>/actions/runs/<id>`. Um log local não atende a esse contrato. Sem run real do mesmo repositório, não há envio real válido; não preencher com URL fictícia. Qualquer extensão para evidências locais precisa de especificação e verificação próprias.
3. Definir uma declaração explícita de conclusão técnica por projeto contendo o envelope `project_id`, `report` e `receipt`, com evento estável, commit, critérios, bloqueios e próxima atividade. A criação do envelope não concede aceite humano nem autorização de publicação. Não inferir conclusão pelo texto livre do chat.
4. A documentação oficial suporta `.codex/hooks.json` no projeto confiável. O proprietário precisa revisar e confiar na definição exata do hook no cliente; alterações na definição exigem nova confiança. Proposta: um handler por projeto, sem credencial no arquivo, que só consuma o envelope explicitamente marcado pronto, valide o checkout e chame o transporte. Um `Stop` isolado é encerramento de turno, não prova de tarefa concluída. `Stop` também exige JSON na saída; a saída do CLI atual não deve ser conectada diretamente como resposta do hook.
5. Ensaiar um evento originado pelo próprio cliente local, verificar os dois arquivos, UUID no histórico do Abelha, ausência de duplicação após novo evento, retirada de concessão e falhas de rede. Só esse ensaio pode liberar a linha de automação. Invocar manualmente um handler continua sendo teste de handler.

Fonte oficial consultada: [Hooks — Codex local](https://learn.chatgpt.com/docs/hooks), seções de localização por projeto, revisão/confiança e evento Stop. Não foi alterado trust, configuração global ou configuração do cliente nesta missão. O projeto não possui `.codex/hooks.json` e não foi criada uma definição sem ensaio. Operações críticas e publicação em produção permanecem dependentes de autorização humana.

## Verificação executada

- `npm run build` no backend: PASS.
- Suites direcionadas: `complete-project-delivery.test`, `obsidian-receipt.test`, `codex-report-scope.test`, `delivery-evidence.test` e `personal-api.test`: **6 testes PASS, 0 FAIL**.
- Execução com preload `scripts/isolated-test-env.cjs`, `ABELHA_HOMOLOGATION_SESSION_FILE` vazio, `DATABASE_URL` sintética apontando para `127.0.0.1:1/never_connect` e credenciais operacionais removidas do processo filho. PGlite foi criado em memória. A primeira execução com o banco de ambiente ausente interrompeu a importação da suíte da API; foi corrigida a configuração isolada do processo de teste, sem carregar `.env`.
- Os diretórios das duas simulações são removidos em `finally`; servidor Express, socket PGlite, cliente SQL e banco da suíte da API são encerrados pelo teste. O processo de testes terminou normalmente. Nenhum recurso temporário desta validação ficou ativo.

O executável de verificação de release e o servidor MCP de projetos foram inspecionados e não exigiram alteração: o primeiro apenas lê as três fontes e exige o mesmo SHA; o segundo mantém o contrato pendente, sem aceitar marcos nem executar publicação. O fluxo implementado permanece opt-in. A automação real continua bloqueada pelos gates acima.
