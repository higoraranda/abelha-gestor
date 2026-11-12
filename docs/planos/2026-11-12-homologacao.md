# Homologação e integração — Abelha

Base confirmada main/2485697 local e GitHub, preservando o diff da consolidação. Produção Render/Vercel já recebeu2485697 por deploy do usuário; não executar deploy nesta tarefa.

- [x] Inspecionar metadados Neon/Render/Vercel/GitHub/Cloudfy sem expor segredos; usuário autorizou acesso Vercel e compute temporário0,25CU na branch isolada Free.
- [x] Criar somente schemas/role temporários de teste na branch br-hidden-night-ace956m0; usar credencial própria, sem copiar DATABASE_URL/senhas de produção. Ensaiar migration e contratos HTTP/SQL com dados sintéticos. Conferir18 tabelas, isolamento, preservação e rollback. Dois suites Neon aprovados.
- [x] Reexecutar testes/builds e validar publicações por metadados/GET, sem transações reais ou fonte de preços não autorizada.49 backend/16 frontend/11 browser, audit0.
- [x] Preparar configuração Render/Vercel/n8n de homologação, com guardas contra encaminhar preview para produção. Manifesto local e modelo sem segredos; nenhum backend HTTPS de homologação existente, nenhuma URL remota inventada. Sem novo workflow/infraestrutura ou alteração de produção.
- [x] Atualizar matriz de credenciais e instruções exatas. Recursos próprios removidos, compute disabled=true/idle e fingerprints do public preservados. Relatório HOMOLOGACAO-INTEGRACAO.md; ambiente persistente/runtime/ativação continuam pendentes.

Limites: não publicar, não migrar produção, não ativar n8n. Fonte real de preços e entrega push física permanecem pendentes se não houver credenciais/fontes autorizadas.
