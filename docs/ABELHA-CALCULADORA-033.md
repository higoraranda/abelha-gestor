# Calculadora e propostas — verificação 03.3

Concluído localmente em 26/11/2026, sem commit, push, migration remota ou publicação. Requisitos conferidos antes da implementação; modelo de preços existente preservado.

| Requisito | Existia | Alteração nesta missão / componente | Evidência e ambiente | Estado / pendência |
|---|---|---|---|---|
| Cliente | Sim | Seleção CRM em QuoteProposals.tsx | Fluxo browser/PGlite | PASS local |
| Empresa, segmento, objetivo | Parcial: briefing livre | Orientação explícita no campo livre, preservando legados | Exemplo sintético persiste os campos no briefing | PASS local; não são novas colunas obrigatórias |
| Problemas, serviços e funcionalidades | Parcial: briefing livre | Instruções de preenchimento no briefing | Texto do orçamento e prompt gerado | PASS local |
| Requisitos, integrações, referências | Parcial: briefing livre | Campo livre antes do cálculo, lacunas explícitas | Exemplo sem presumir tecnologia | PASS local |
| Restrições e observações adicionais | Parcial: briefing livre | Mantidas livres e indicadas na UI | Persistência e geração | PASS local |
| Serviços e preços personalizados | Sim | quoteModels/QuoteModelsPage preservados | Modelo sintético, valor1200 | PASS local |
| Implantação, recorrência e desconto | Sim | Regras determinísticas preservadas | Único1080 após10%; mensal80 separado | PASS local |
| Condições de pagamento | Sim | terms preservado | Texto comercial e snapshot SQL | PASS local |
| Texto pronto para cliente | Sim | Gerador determinístico sem API paga | Cópia real da proposta no clipboard | PASS local |
| Salvar/consultar/reabrir | Sim | Proposta e briefing imutáveis | Reload do navegador mantém proposta | PASS local |
| Histórico comercial | Não integral | status/status_history; rotas quote-models | Rascunho→enviado→aguardando→aprovado; cancelamento e recusa testados em API | PASS local |
| Seis estados | Parcial: aprovado/recusado | draft, sent, awaiting_approval, approved, refused, cancelled | Transições fechadas exigem nova proposta, confirmação explícita da decisão | PASS local |
| Isolamento | Sim | Novas rotas mantêm requireOwner+org/user | Outro proprietário na mesma organização recebe404 nas cinco operações de proposta/prompt/status | PASS local; novos caminhos ainda não homologados no PostgreSQL remoto |
| Snapshot aprovado não muda com tabela de preços | Sim | Preservado | Modelo alterado depois; orçamento mantém108000centavos | PASS local |
| Botão Gerar Prompt só após aprovação | Sim | Rótulo claro e nova geração versionada | UI e recusa409 sem aprovação | PASS local |
| Contexto, objetivo, escopo e funcionalidades | Parcial | proposalPrompt em quote-proposal.ts | Documento gerado a partir de briefing/itens aprovados | PASS local |
| Requisitos funcionais/não funcionais, integrações e restrições | Parcial | Seções explícitas; informação ausente vira lacuna | Testes de estrutura e exemplo | PASS local |
| Entregáveis, implementação, segurança e testes | Parcial | Seções de execução limitada ao contratado | Exemplo e teste do gerador | PASS local |
| Aceitação, documentação, autorização, modelo/esforço | Parcial | Seções explícitas; esforço médio inicial e modelo disponível na ferramenta, sem API obrigatória | Exemplo gerado | PASS local |
| Não inventar requisitos | Parcial | Dados não confiáveis delimitados; instrução de investigar lacunas, sem executar links/comandos do briefing | Exemplo com integração/hospedagem indefinidas | PASS do contrato do gerador; revisão humana continua necessária |
| Visualizar/editar/copiar/regenerar | Não integral | Histórico append-only quote_proposal_prompts; QuoteProposals.tsx | Três versões generated/edited/generated, copiar clipboard e reload | PASS local |
| Preservar prompt/proposta históricos | Parcial | Nova migration aditiva e FK composta | Teste quote-workflow-migration preserva snapshots legados aprovado/recusado/rascunho | PASS PGlite; BLOCKED HML real |

## Evidências

`backend/scripts/verify-calculator-033.cjs` executado: briefing antes do cálculo → orçamento → texto comercial → persistência → enviado/aguardando → aprovação → geração → edição → regeneração → cópia real → reload. Três versões confirmadas no SQL; 390/1440px e ausência de overflow a390px. Roteadores e SQL reais sobre PGlite descartável, sessão sintética injetada: **não é autenticação remota nem entrega a cliente**. Erros JavaScript ausentes. Capturas privadas em `.abelha-homologacao/calculator-033/`.

[Prompt gerado para avaliação](ABELHA-PROMPT-EXEMPLO-033.md), contendo somente dados fictícios. Nenhum projeto do cliente foi executado, nenhum texto enviado externamente, nenhuma API de IA chamada.

Nova migration `20261129_quote_proposal_workflow.sql`: acrescenta status/histórico comercial e tabela de versões de prompt, deriva somente decisões explicitamente existentes, sem reescrever briefing/preços/snapshot. Não idempotente: aplicar uma única vez depois das migrations de propostas/decisões, somente após homologação autorizada. Não reaplicar as nove anteriores nem usar produção como fixture. Não aplicada ao Neon nesta missão. Concorrência real de locks permanece gate de PostgreSQL HML; tentativa de simular corrida pelo socket PGlite foi descartada, sem afrouxar código ou declarar essa corrida aprovada.

Sessões/rotas/migration novas cobertas pelos testes dirigidos `multiuser-api.test.ts`, `access-matrix.test.ts` e `quote-workflow-migration.test.ts`; roteiro do navegador encerra browser, listener e banco mesmo se o fechamento do browser rejeitar. Publicação depende do commit/push manual do proprietário e da homologação nova. A autorização excepcional inicial de Git foi revogada expressamente pelo proprietário nesta sessão.
