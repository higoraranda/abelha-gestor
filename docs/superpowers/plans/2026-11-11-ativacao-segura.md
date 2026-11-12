# Preparação da ativação — Abelha

Pedido: continuação com preservação integral das alterações locais; sem migration em produção, deploy, commit ou push.

## Sequência autorizada

- [x] Registrar auditoria original e mapear alertas a versões/caminhos reais; consultar avisos primários.
- [x] Fixar comportamento de autenticação em teste HTTP/SQL sintético: credenciais, CSRF, cookies de produção, isolamento, logout e compatibilidade de sessão 0.35.0.
- [x] Atualizar dependências corrigidas sem `audit fix --force`; provar regressões/compatibilidade e auditar frontend/backend.
- [x] Testar timeout Overpass e alinhar o orçamento servidor/cliente, com erro claro e sem resultado fictício.
- [x] Revisar migration, adicionar verificações de integridade/isolamento/remoção e incompatibilidade de ambiente, sem executar no Neon.
- [x] Revisar PWA/push/n8n; corrigir problemas concretos e distinguir modelos, credenciais e implementações pendentes.
- [x] Reexecutar suites, builds, lint e fluxos de navegador relevantes; encerrar somente recursos temporários iniciados pelo agente.
- [x] Atualizar progresso/auditorias e entregar checklist de ativação com configuração manual e autorizações separadas.

## Evidência e limites

Testes usam PGlite/PostgreSQL via postgres.js em loopback, sem dados reais. Uma atualização de Auth.js só será mantida se os contratos existentes passarem e a sessão anterior for aceita. A revisão independente é somente leitura. Testes/consultas externos nunca serão descritos como aprovados sem execução real.
