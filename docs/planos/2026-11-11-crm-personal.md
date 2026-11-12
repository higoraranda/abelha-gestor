# Abelha CRM + Personal — plano de implementação

> Execução local nesta etapa, por fases; sem commit/push/PR/deploy ou migrations de produção. O pedido já autoriza decisões técnicas rotineiras e dispensa nova rodada de aprovação do plano.

**Objetivo:** ampliar o Abelha preservando o CRM e oferecendo organização pessoal no mesmo produto.
**Arquitetura:** frontend e backend existentes; APIs e tabelas Personal com organização/usuário; automações autenticadas e idempotentes. PWA armazena somente recursos públicos.
**Stack:** React/Vite/TS, Express, postgres.js/Neon; web-push para criptografia VAPID e PGlite somente para testes sintéticos isolados.
**Especificação:** docs/ROADMAP-ABELHA.md e docs/ARQUITETURA-PERSONAL.md, derivados do pedido integral de 11/11/2026.

## Restrições globais
Preservar registros e código existente. Não executar schema.sql. Nenhuma mudança em autenticação publicada, regras financeiras ou ambientes externos. Encerrar recursos temporários.

## Foco de revisão
Isolamento org/usuário, SSRF e origem das mutações, repetição concorrente, falha de configuração sem dados simulados, troca de versão/offline sem perda de formulário ou cache privado.

## Tarefas

- [ ] 1. Testar política de cache/destinos e navegação. Implementar manifesto/ícones/SW, ambientes e central de instalação/notificações. Verificar TypeScript, testes SW, lint/build e browser estreito/offline.
- [ ] 2. Testar relatórios/evidências e SQL isolado. Implementar identidade Personal, migrations aditivas, projetos/marcos/histórico e revisão humana. Testar autorização, entradas inválidas e repetição.
- [ ] 3. Testar consulta Overpass/normalização e deduplicação; implementar busca/captura revisável e templates/rascunhos sem efeitos financeiros.
- [ ] 4. Testar diferenças de fatura/ciclos, médias/projeções, metas e recorrências. Implementar UI/API separadas; verificar zero/negativos e pagamento explícito.
- [ ] 5. Testar alertas de preço idempotentes e validação de URL; implementar cadastro/provedor/histórico, estado sem configuração.
- [ ] 6. Testar rotinas por horário/fuso/reexecução; implementar integração n8n, revisão semanal, envio push e documentação/configuração. Atualizar progresso e verificar tudo, revisar diff e encerrar prévias.

Os arquivos de serviço são separados por domínio; testes de comportamento precedem a lógica. Cada fase atualiza o registro de progresso com evidência e limites. A criação de uma migration não significa autorização de aplicá-la em produção.

## Execução registrada — 11/11/2026

- [x] Base local e projetos implementados; worker, identidade, relatórios e revisão testados.
- [x] Leads/templates, financeiro pessoal, cadastro/ingestão de preços e revisão/tick implementados e validados localmente.
- [x] Testes com postgres.js real em banco efêmero; TypeScript, lint, build, navegador desktop/mobile/offline e revisão independente executados.
- [x] Migrations, arquitetura, variáveis, guias e sete workflows sem credenciais documentados.
- [ ] Ativação Neon, push físico, GitHub/n8n externos, fonte real de preços/classificação e publicação: pendentes de autorização/configuração e testes reais. Consulta real Overpass expirou.

Os checkboxes originais das tarefas englobam critérios externos e não representam fases publicadas. O status detalhado por fase e as decisões/menores adiados estão em docs/PROGRESSO.md. Nenhum commit foi feito; o checkout atual conserva o trabalho revisável.
