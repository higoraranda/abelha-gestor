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

Em 12/11/2026, os sete workflows foram completados e criados **desativados** na Cloudfy/socialbaboon, sem duplicar o tick ou a infraestrutura. Retomar pelos IDs e configuração de [CLOUDFY-N8N.md](CLOUDFY-N8N.md), sem reimportação. Permanecem pendentes credenciais/fontes externas, ensaio no runtime, migration e publicação autorizadas; o backend publicado ainda não contém a nova rota de preços.

Em 11/11/2026, todas as seis fases receberam implementação local e testes das partes independentes. A revisão de ativação corrigiu as dependências vulneráveis, timeout e falhas concretas de PWA/push/GitHub; a migration foi revisada e permanece sem aplicação no Neon. Consulte PROGRESSO.md e AUDITORIA-ATIVACAO.md para evidências. A próxima etapa segue [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md): autorização do ambiente e configuração de VAPID/n8n/GitHub/provedor de preços/classificador, seguida de ensaio externo e publicação autorizada.

## Restrições permanentes

- Não executar `backend/src/db/schema.sql`, reset ou seed de negócio.
- Não aplicar migrations/deploy em produção, commit, push ou PR sem autorização.
- Manter autenticação existente e acesso pessoal apenas em loopback de desenvolvimento.
- Manter contratos, recebíveis, despesas comerciais e WhatsApp existentes.
- Dados Personal: `organization_id` **e** `user_id`; nunca persistir finanças em armazenamento/cache do navegador.
- Nenhum processo temporário desta execução deve continuar ativo ao terminar.
