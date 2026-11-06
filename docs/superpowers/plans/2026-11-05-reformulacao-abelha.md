# Plano de implementação do Abelha

Execução inline, sem commits/publicação. Stack e acesso pessoal anteriores preservados.

- [x] Base visual e navegação consistente; desktop/celular.
- [x] Entregas com quadro/checklist sobre o mesmo registro e retorno à coluna anterior.
- [x] Pipeline, detalhes, probabilidades/previsão e conversão assistida transacional.
- [x] Contato sem contrato, notas, favoritos, próxima ação e filtros.
- [x] Extrato/filtros financeiros, busca, relatórios, notificações e exportações.
- [x] TypeScript, 18 testes puros, lint, build e revisão independente.
- [x] Branch de teste explicitamente autorizada e criada no mesmo projeto Neon.
- [x] Integração SQL/API, rollback, isolamento, exportações, persistência dos avisos e 12 conversões concorrentes sem duplicar.
- [x] Regressão de fuso com backend real em sessão de outro dia/fuso.
- [x] Navegador com dados sintéticos, formulários, arraste, cancelamento/confirmacão, baixas/reabertura, downloads e relatórios.
- [x] Schemas/processos/downloads temporários limpos; compute de teste desativado.
- [x] Autorização específica para aplicar a migration em production.
- [x] Ativação incremental em transação, preservação conferida por fingerprints, 14 consultas reais aprovadas em modo leitura e prévia encerrada.

Não executar backend/src/db/schema.sql nem usar registros pessoais em testes de escrita. Procedimento e estado atual: BANCO-REFORMULACAO.md e PROGRESSO.md.
