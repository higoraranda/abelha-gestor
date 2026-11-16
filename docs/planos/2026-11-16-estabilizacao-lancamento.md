# Estabilização e preparação de lançamento — 16/11/2026

Objetivo: concluir a validação possível em um ciclo, reaproveitando as evidências aprovadas e preparando uma sequência única de publicação/rollback. Base observada: main/23c06eb, com alterações anteriores preservadas.

## Limites

Sem branch nova, commit, push, deploy de produção, migration/restauração, credenciais de produção alteradas, workflow ativado, serviço pago ou escrita em dados comerciais. Recursos HML já autorizados podem ser usados com dados sintéticos e cleanup. Publicação que dependa de push fica no pacote final de autorização. Sem autoria/créditos de ferramentas nos arquivos.

## Frentes e arquivos

- [x] A — exclusão revisada e comprovada por15 requisições autenticadas local→Neon HML; cleanup35/35. Nenhuma refatoração adicional; UI publicada segue pendente.
- [x] B — preços opt-in no gerador/modelo e regressões/roteamento aprovados. Após autorização A explícita, plugin recebeu HTTP400 por settings; usuário aplicou somente jsCode pelo editor e comparação integral confirmou62 nós/destinos HML/layout/conexões/settings preservados, inativo. Somente tick automático; nenhum modelo histórico importado. A aplicação está concluída, sem ativação.
- [x] C — instalação/atualização SW corrigidas e cobertas por oito regressões novas; cache público/credentials:omit, proteção Preview e VAPID preservados. Roteiro físico mínimo preparado, sem declarar ensaio físico realizado.
- [x] D — plataformas relidas/preservadas, propostas de três segredos exclusivos preparadas em arquivos ignorados, manifesto/rollback/gates/autorizações agrupadas em SPRINT-LANCAMENTO-20261116.md e progresso atualizado. Nenhuma publicação realizada.

## Verificação e entrega

Reutilizar96 requisições HML e oito callbacks n8n completos já aprovados. Rodar somente testes relacionados a mudanças: backend/gerador e frontend/PWA, além de DELETE no banco isolado. Não declarar navegação física/produção/cron automático comprovados por API ou build. Conferir cleanup35/35, processos próprios encerrados e produção sem mudanças.

Publicação proposta: revisão/commit manual na main com gatilhos de produção controlados; push autorizado; deploy HML de SHA fixo; validação de somente o delta; publicação coordenada dos componentes compatíveis; credenciais de automação exclusivas após autorização; ativação futura do único workflow com preços desligados. Sem nova migration. Rollback por artefato/configuração anterior e workflow inativo, sem restaurar dados automaticamente.
