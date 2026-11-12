# Abelha CRM + Personal

Pedido de referência: evolução solicitada em 11/11/2026. Este roteiro amplia o CRM existente; não substitui o briefing da reformulação nem autoriza publicação ou mudanças na carteira de produção.

## Fases e critérios

1. **Base:** ambientes CRM/Personal na URL, navegação mobile, instalação PWA, offline sem dados privados, atualização voluntária e inscrições push por organização/usuário/dispositivo.
2. **Projetos:** cadastro real, marcos, bloqueios, decisões e relatórios versionados. Alegações de conclusão ficam pendentes até evidência verificável e confirmação humana. Integração GitHub autenticada, idempotente, sem acesso arbitrário ao banco.
3. **Leads:** busca Overpass por nicho/cidade, atribuição, limites, deduplicação, revisão da captura e templates que geram rascunhos sem contratos/cobranças/envios.
4. **Finanças pessoais:** faturas por ciclo, diferenças negativas/zero, metas e valores efetivamente guardados separados, recorrências e confirmação manual.
5. **Preços:** cadastro, histórico, interface de provedor e ingestão autenticada. Nenhum preço fictício ou scraping de loja.
6. **Automações:** workflows n8n exportáveis, notificações deduplicadas e revisão semanal calculada com dados reais.

Cada fase exige TypeScript, testes de comportamento, lint/build frontend e documentação. Integrações dependentes de credenciais ficam explicitamente pendentes; a implementação local avança sem modificar produção.

## Ponto de retomada

Estado após unificação em12/11: um único workflow remoto **🐝 ABELHA — AUTOMAÇÕES / n20DNyb13Aaw3nq5**, com62 nós e todos os blocos internos, desativado. Sete originais mantidos como backup inativo. Retomar pelo [guia único](WORKFLOW-UNICO-N8N.md); configurar e testar em homologação antes de qualquer autorização de ativação.

Homologação em12/11: migration aprovada no Neon isolado,18 tabelas/isolamento/preservação, rollback e cleanup completos; compute voltou a disabled/idle. Render/Vercel já em2485697; rota nova existe e retorna503 por integração não configurada. **49 testes backend,16 frontend e11 cenários de navegador aprovados.** Próxima etapa: [ambiente persistente, credenciais e runtime n8n](HOMOLOGACAO-INTEGRACAO.md). A migration de produção, guard de preview ainda local e ativação do consolidado dependem de autorização; preços reais e push físico pendentes.

Em 11/11/2026, todas as seis fases receberam implementação local e testes das partes independentes. A revisão de ativação corrigiu as dependências vulneráveis, timeout e falhas concretas de PWA/push/GitHub; a migration foi revisada e permanece sem aplicação no Neon. Consulte PROGRESSO.md e AUDITORIA-ATIVACAO.md para evidências. A próxima etapa segue [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md): autorização do ambiente e configuração de VAPID/n8n/GitHub/provedor de preços/classificador, seguida de ensaio externo e publicação autorizada.

## Restrições permanentes

- Não executar `backend/src/db/schema.sql`, reset ou seed de negócio.
- Não aplicar migrations/deploy em produção, commit, push ou PR sem autorização.
- Manter autenticação existente e acesso pessoal apenas em loopback de desenvolvimento.
- Manter contratos, recebíveis, despesas comerciais e WhatsApp existentes.
- Dados Personal: `organization_id` **e** `user_id`; nunca persistir finanças em armazenamento/cache do navegador.
- Nenhum processo temporário desta execução deve continuar ativo ao terminar.
