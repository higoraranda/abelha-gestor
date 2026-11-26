# Abelha — requisitos e encerramento do Prompt03.3

Encerramento local em 26/11/2026. **Pronto para revisão e commit manual; não publicado e não homologado remotamente nesta missão.** A orientação posterior do proprietário prevalece sobre a autorização excepcional do texto inicial: sem stage, commit ou push em qualquer branch. HEAD base `030976f093517ac1d3438c01560e67a7a775c01e`, branch existente `feature/phase-01-multi-tenant-foundation`.

## Verificação dos requisitos originais

Cada tabela específica abaixo detalha os subitens, componentes, ambiente e limites, sem confundir implementação local com produção.

| Área / requisito | Já existia | Feito no03.3 | Componente/evidência | Ambiente | Estado e pendência |
|---|---|---|---|---|---|
| Multiusuário: proprietário, convidados e autorização por sessão | Sim | Guardas preservados | member-modules/auth; teste multiuser-api e baseline03.1 | Auth.js/PGlite; baseline anterior Neon HML | PASS local; sem nova publicação |
| Administração, revogação e concessão de módulos | Sim | Preservado | member-modules; matriz de acesso dirigida | Local | PASS local/baseline; não inferir remota atual |
| Personalização individual e ausência de autoconcessão | Sim | Preservado | MemberHome/member-modules | Baseline03.1 | PASS baseline sem alteração |
| Projetos: carteira privada, relatórios e aceite humano | Sim | Preservado | personal routes; integração mantém pending_review | Local e baseline03.1 | PASS; relatório não conclui marco sozinho |
| Kanban: oito etapas, persistência e legado | Sim | Preservado | ProjectBoard/project-pipeline | Baseline03.1 UI→SQL→reload | PASS anterior; remoto candidato BLOCKED |
| Busca: nicho livre/cidade/UF, resultados e importação seletiva | Sim | Corrigidos406/fallback e alias plural veterinárias | [Checklist Busca Lead](ABELHA-BUSCA-LEAD-033.md) | Testes locais + consultas públicas limitadas | PASS implementação; BLOCKED disponibilidade pública, controles mínimos também expiraram |
| Fonte alternativa gratuita, termos/custos e presença digital | Parcial | Pesquisa documentada; nenhuma contratação | Checklist Busca Lead, fontes oficiais | Pesquisa externa | PASS estudo; cobertura semântica universal não comprovada; ausência de site na fonte não significa inexistência |
| Templates: menu/dashboard/atalhos/rota/dependências | Já fora da navegação | Removida página sem uso; alias antigo abre Calculadora | [Templates/Conversas](ABELHA-CONVERSAS-TEMPLATES-033.md); navigation.ts | Inspeção/build | PASS local |
| Templates: histórico e endpoints legados | Sim | Preservados sem deletar dados | prospecting routes/drafts | Inspeção e testes anteriores | PASS compatibilidade; não expostos como módulo novo |
| Calculadora: briefing livre com todos os dados solicitados | Parcial | Orientação e preenchimento antes do cálculo | [Checklist detalhado](ABELHA-CALCULADORA-033.md) | Browser/PGlite | PASS local |
| Orçamento: serviços, valores, recorrência, desconto, condições e texto | Sim | Regras preservadas | quote-model/quote-proposal + fluxo completo | Browser/SQL descartável | PASS local |
| Persistência e snapshot/histórico isolados | Parcial | Histórico comercial e de prompts adicionados | Migration20261129 e rotas com org/user | PGlite + teste legado | PASS local; migration nova ainda não aplicada HML |
| Pipeline comercial: seis estados e decisões explícitas | Parcial | Implementados estados faltantes e transições | quote-models; status_history | HTTP local | PASS local; testes remotos pendentes |
| Prompt aprovado: estrutura sênior, lacunas e limites | Parcial | Ampliadas seções sem API paga | [Exemplo real sintético](ABELHA-PROMPT-EXEMPLO-033.md) | Gerador determinístico | PASS local; revisão qualitativa humana disponível |
| Prompt: visualizar/editar/copiar/regenerar/histórico | Parcial | Persistência append-only e UI | QuoteProposals e quote_proposal_prompts | Browser, clipboard real, reload e SQL | PASS local; 3 versões comprovadas |
| Conversas: QR/estado/lista/texto/horários/não lidas | Sim | Preservados e revisados | [Matriz Conversas](ABELHA-CONVERSAS-TEMPLATES-033.md) | Teste visual sintético | PASS local; operação real BLOCKED, nenhum número autorizado |
| Conversas: pesquisa, vínculo CRM, reconexão | Parcial | Pesquisa das conversas carregadas acrescentada | ConversationList; webhook por telefone único | Browser390/1440 | PASS busca local; vínculo manual ausente, automático por telefone existente |
| Conversas: mídia/áudios/documentos/notificações | Não | Viabilidade e limites documentados | Matriz Conversas | Documental | BLOCKED implementação futura opcional; não impede release seguro sem canal ativo |
| Evolution versus Meta, infraestrutura e procedimento exclusivo | Parcial | Procedimento completo sem configurar serviços | Matriz Conversas, fontes oficiais | Documental | PASS procedimento; pareamento/envio/custos dependem autorização própria |
| Codex: identificação de projeto, repo e idempotência | Sim | Testes ampliados para dois projetos | [Integração](ABELHA-INTEGRACAO-033.md) | Contrato local/fixtures | PASS local; não equivale a dois projetos remotos |
| Segundo Cérebro: nota técnica, bloqueios e próxima etapa | Sim | Persistência adicional do comprovante UUID, sem sobrescrever | complete-project-delivery/obsidian-task-receipt | Diretórios descartáveis | PASS local; nenhum registro sintético permanente no cofre |
| Integração: recibo, histórico, revogação e falhas | Parcial | Notas separadas idempotentes e reconciliação | Testes de entrega/recibo + API sintética | Local | PASS local |
| Atualização automática por evento real/progresso comprovado | Não operacional | Gate e mecanismo por projeto documentados, não instalado | Integração; requer evento real, confiança do cliente e evidência CI | Nenhum trigger real observado | BLOCKED opcional; execução manual não é automação; aceite de marco permanece humano |

## Testes e estado atual

- Rodada principal: **93 testes backend PASS**, incluindo matriz local126rotas/124negativas/66positivas/655asserções. Depois da interrupção, executados **dois testes dirigidos PASS**: sessão multiusuário e a nova migration com snapshots legados preservados. Não somar essas duas rodadas como se fossem95testes distintos de uma suíte.
- Frontend: **50 testes PASS**, lint e build PASS; JS principal **267,60kB** preservado. Busca Lead:24testes dirigidos, RED/GREEN para406ealias. Conversas: RED para campo inexistente e GREEN390/1440px. Calculadora: fluxo completo com clipboard, SQL, histórico e isolamento PASS. Revisão estática independente não identificou defeito importante concreto.
- A revisão geral se justifica pelas novas rotas/estado/schema e parser compartilhado; não houve repetição das nove migrations em bancos remotos. A migration nova foi validada só em banco descartável. HML/produção não receberam DML ou DDL nesta missão.
- A matriz03.1 continua histórica para aquele candidato; [matriz local03.3](ABELHA-MATRIZ-ACESSO-033.md) e `ABELHA-EVIDENCIA-ACESSO.json` refletem o código novo. Não reutilizar o PASS remoto anterior como aceite do novo workflow.
- Um teste de retomada falhou por ausência da variável dummy DATABASE_URL no launcher, antes de rodar os cenários. Corrigido o ambiente do teste e repetido com PASS; nenhuma conexão real foi usada. A tentativa incompleta de concorrência no socket PGlite foi retirada; não é uma prova de locks concorrentes no PostgreSQL remoto.

## HML, e-mail e limites

Sem commit/push manual, o novo candidato ainda não está disponível na fonte remota do Render. Nenhum deploy ou mudança de fonte foi realizado. URLs existentes, sem alegar conteúdo novo: [Render HML](https://abelha-gestor-api-hml.onrender.com), Vercel Preview do projeto `prj_Cd3vrf5gNVRmT3CjBJeX8saUrVVv` (último endereço no relatório03.2; não houve Preview novo). Neon `abelha_homologacao` não foi alterado.

Após envio manual do proprietário: conferir SHA/ref, mudar exclusivamente fonte Render HML para a branch autorizada com auto-deploy off, homologar a migration **nova**20261129 uma única vez, entregar backend/frontend do mesmo candidato e executar somente gates remotos restantes. Não reaplicar as nove anteriores. HTTPS/cookiesSecure/CORS/coldstart/autenticação/PWA e funcionalidades novas continuam BLOCKED até esse ensaio.

E-mail: nenhuma caixa autorizada ou credencial/remetente verificado novo foi fornecido. Não enviar OTP/reset real. Confirmar domínio/remetente no Resend, configurar privadamente no HML as variáveis já documentadas em03.2, autorizar caixa exata e só então testar entrega. Não registrar segredo no Git/cofre. Não alterar produção nem contratar serviços.

Busca pública indisponível, WhatsApp sem número autorizado e automação por evento não comprovada são opcionais: podem permanecer desabilitados sem impedir áreas independentes. **Prompt04 ainda não deve ser só publicação**, por falta do preview integrado/schema novo/e-mail de conta; os opcionais não são usados como bloqueio artificial de todo o produto.

## Entrega manual

SHA informado acima é a base, não um commit novo. Manifesto final do working tree em `.abelha-homologacao/rc-prompt033-manifest.json`. Não houve stage/commit/push, configuração global ou projeto Codex duplicado. Recursos temporários próprios encerrados e portas conferidas no fechamento. O código e os registros do usuário foram preservados.

Mensagem sugerida para o commit manual: `feat(abelha): completar fluxo de propostas e preparar homologação operacional`.

Skills usadas nas frentes pertinentes: using-superpowers, dispatching-parallel-agents, systematic-debugging, test-driven-development, verification-before-completion, requesting-code-review, frontend-design/frontend-design-premium e openai-docs. Memória final atualizada seletivamente, sem dados privados ou credenciais.
