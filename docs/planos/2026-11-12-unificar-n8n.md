# Unificação real das automações Abelha

**Objetivo:** um workflow `🐝 ABELHA — AUTOMAÇÕES`, criado desativado na socialbaboon, contendo os sete blocos existentes e tratamento de erros interno. Sem Execute Workflow/subworkflows.

**Base:** checkout limpo main/2485697 ao iniciar; preservar commit e arquivos. Ler os sete workflows remotos antes de consolidar, reaproveitando endpoints, parâmetros e referências de credenciais pertencentes ao Abelha. Backup remoto original preservado, sem excluir nada.

**Decisões de implementação:** um Schedule Trigger de 15 minutos emite somente operações tick e preços, roteadas por Switch. Backend continua verificando horários, vencimentos, domingo e intervalo de cada produto. Um gatilho manual com seletor tick/accounts/prices/weekly-review mantém os auxiliares independentes; não dispara tudo. Quatro webhooks conservam paths/auth/corpo binário e ficam desconectados do relógio. As três rotinas já cobertas pelo tick não recebem cron redundante.

Erros de Code/HTTP usam saída separada e adaptadores internos que descartam payload/secrets. Webhooks recebem resposta genérica não-2xx; falhas de relógio geram saída `ok:false` e log com código/bloco, sem abortar a outra operação do mesmo relógio. Não usar Error Workflow externo ou autorreferência recursiva. Falhas tratadas podem deixar a execução n8n como concluída: registrar essa limitação operacional e como conferir o ramo de erro.

## Etapas

- [x] Conferir Git, documentação, inventário e definições remotas; fontes atuais estão desativadas.
- [x] Escrever testes do consolidado: equivalência de parâmetros/credenciais/código, roteamento isolado, um único relógio, ausência de ciclos entre automações/subworkflows, erros redigidos e layout/nomes únicos. Vistos falhar antes de gerar.
- [x] Implementar gerador determinístico de um JSON consolidado reutilizando fontes; preservar binário/HMAC, idempotência e checagem de frequência no backend. Notas coloridas para os oito blocos pedidos.
- [x] Executar cada bloco em dados sintéticos e contratos HTTP/SQL; revisão independente e correções concretas realizadas. Runtime remoto permanece pendente de credenciais/ensaio, sem alegação de execução real.
- [x] Criar no Cloudfy sem ativar, reler e comparar definição/configuração. Após equivalência, confirmado que os sete backups continuam existentes/inativos; não foi necessária alteração de estado.
- [x] Atualizar inventário, guia, checklist e progresso com novo ID, backups, credenciais pendentes e limites de runtime. Testes/builds aprovados; nenhum serviço temporário mantido.

## Registro de decisões e evidência

Ruling: dois percursos nativos e finitos de lote (≤50 leads/≤20 observações), reset=false, dentro do mesmo workflow — necessários porque o motor n8n decide retry olhando apenas o primeiro item; continuar erro em lote parcial perderia tentativas do item seguinte. Não há ciclo de gatilhos, automações ou workflows. Testes de grafo permitem somente quatro arestas de feedback controladas; demais ciclos são recusados.

Busca compara contagem e markers de erro antes de responder sucesso; falha parcial responde503. Logger corrigido de console.warn para console.log após revisão da implementação oficial; stdout exige configuração/verificação do host e não foi habilitado automaticamente. Ambos os achados foram corrigidos com testes vermelho/verde e conferência focada do revisor.

Resultado: n20DNyb13Aaw3nq5, 62 nós, um relógio, quatro webhooks e um manual; definição remota igual ao artifact. 47 testes backend/13 frontend, TypeScript/builds e lint aprovados. HEAD2485697 preservado, fontes e três workflows de outros projetos intactos. Nenhum servidor persistente foi iniciado; testes HTTP/SQL fecharam sockets e processos encerraram.

Sem migration, deploy, commit, push, PR, ativação, criação de infraestrutura ou teste destrutivo com dados reais. Não acessar valores secretos nem reutilizar credenciais de terceiros.
