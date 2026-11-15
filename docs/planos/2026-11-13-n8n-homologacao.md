# Integração do workflow único à homologação

Objetivo: configurar somente n20DNyb13Aaw3nq5 na infraestrutura socialbaboon para o backend HML, preservando seus62 nós, conexões, gatilhos, organização visual e estado desativado.

- [x] Conferir Git/main, alterações anteriores, documentos atuais, workflow remoto e schemas de credenciais. Preservar produção, sete backups e proteção do Preview.
- [x] Criar as duas credenciais httpHeaderAuth com segredos exclusivos HML já preparados, sem valores em documentação/export/logs.
- [x] Substituir o host em exatamente dez URLs, preservando paths/expressões; vincular saída backend em nove chamadas e entrada em três webhooks. GitHub continua com corpo binário/HMAC, sem Header Auth.
- [x] Reler e comparar o workflow: somente hosts/referências permitidos, zero destinos de produção, sem mudanças em conexões/settings/posições. Conferir backups inalterados.
- [x] Executar testes pertinentes de contratos/rotas e HTTP/SQL sintético isolado; distinguir execução de Code nodes/contratos da execução no motor n8n. Não ativar workflow nem criar listeners de produção.
- [x] Documentar listeners/testes manuais exatos, limites de preços/logs e condições para ativação futura; atualizar progresso e memória. Limpar fixtures/conexões/processos próprios.

Limites: sem commit, push, merge, deploy, migrations, upgrade ou nova infraestrutura. Ações manual accounts preservam o alias original do tick completo; somente operações devidas pelos horários do backend produzem seus efeitos. Não alterar esse contrato nesta configuração.
