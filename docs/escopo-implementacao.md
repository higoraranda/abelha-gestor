Implemente a reformulação do meu CRM pessoal **Abelha**, seguindo o briefing aprovado fornecido nesta conversa e disponível no projeto.

Esta solicitação autoriza o desenvolvimento da reformulação. Preserve as funcionalidades, os dados e as alterações existentes.

## 1. Retome o contexto antes de editar

Projeto existente:
C:/Users/higor aranda/Documents/Programações/SAAS/ABELHA

- Leia AGENTS.md, README, o briefing aprovado, documentação, migrations e código relevante.
- Verifique branch, HEAD e alterações atuais do Git. O briefing registrava main no commit 68647ab, mas confira o estado real sem retornar automaticamente a esse commit.
- Preserve as alterações de acesso pessoal sem login na prévia local e quaisquer mudanças posteriores.
- Considere o briefing aprovado como a referência atual de produto e direção visual. O DESIGN.md antigo, inspirado no Linear escuro, precisa ser atualizado para refletir as decisões aprovadas.
- Verifique as ferramentas, skills e plugins disponíveis. Utilize os pertinentes a frontend, design, engenharia, depuração e verificação. Informe no resultado quais utilizou e para quê.
- Não troque a stack nem introduza bibliotecas sem necessidade concreta.

Esta execução será feita pelo Codex no projeto atual. Não dependa de alterações paralelas feitas por outro assistente.

## 2. Objetivo e limites

Transformar o Abelha em um CRM pessoal mais bonito, organizado e útil, usando a linguagem visual do **Rapport** em todas as telas e preservando a identidade da abelha e do amarelo.

As funções inspiradas no Tandem e no Fernly devem parecer partes do mesmo produto.

Não ampliar para gestão de equipes, multiempresa ou SaaS empresarial. Preserve as estruturas técnicas existentes que forem necessárias, sem transformá-las em novas funcionalidades de produto.

Não adicionar provedores, serviços pagos, integrações ou infraestrutura por conveniência.

## 3. Banco e preservação de dados

O checkout analisado utiliza PostgreSQL no Neon. O armazenamento do navegador identificado não é o banco da carteira de clientes.

- Preserve a persistência existente e o isolamento por organization_id.
- Não migre para SQLite, IndexedDB, arquivos ou outro banco sem uma decisão explícita minha.
- Não crie outro banco em nuvem.
- Não reative o Neon, altere plano ou habilite cobrança automaticamente.
- Verifique primeiro a configuração e a disponibilidade atuais sem expor segredos.
- Se o banco continuar indisponível, explique o bloqueio e solicite a ação específica necessária. Enquanto isso, avance nas partes independentes, sem apresentar integrações não verificadas como concluídas.
- Não interprete listas vazias ou erros como prova de que não existem dados.

O arquivo backend/src/db/schema.sql contém reset destrutivo: **não o execute**.

Se forem necessárias alterações de schema, faça migrations incrementais, revisáveis e compatíveis com os registros existentes. Não rode reset, limpeza ou seed automaticamente.

Antes de aplicar migrations ou testar gravações, confirme que existe um ambiente adequado e autorizado. Não use registros pessoais reais como massa de teste.

## 4. Referências visuais e funcionais

**Rapport — referência visual principal:**
https://demo.codeandchill.store/rapport/#/overview

**Tandem — referência funcional de relacionamento:**
https://demo.codeandchill.store/tandem/#

**Fernly — referência funcional de execução:**
https://demo.codeandchill.store/fernly/#dashboard

Use o briefing e as capturas já existentes para aproveitar a análise anterior. Reabra referências quando necessário para esclarecer detalhes visuais ou interações, sem repetir toda a entrevista.

Não presuma que recursos de demonstração tenham backend operacional.

### Direção visual obrigatória

- Fundo claro e quente.
- Superfícies claras, bordas discretas e sombras suaves.
- Cards arredondados, botões e filtros em cápsulas.
- Tipografia e hierarquia visual consistentes.
- Navegação principal superior e barra separada de ações rápidas.
- Adaptação para telas estreitas.
- Identidade do Abelha preservada, com amarelo como cor principal.
- Estados consistentes de foco, seleção, carregamento, vazio, erro e sucesso.

Referências observadas no Rapport: fundo #EBE8E1, texto #17191A, fonte Urbanist e cards com raio próximo de 26 px. Use como orientação, ajustando contraste, legibilidade e identidade do Abelha.

Crie padrões reutilizáveis suficientes para manter consistência, sem construir uma biblioteca genérica desnecessária.

## 5. Preserve o que já funciona

Mantenha visão geral, clientes, contratos, financeiro, agenda, conversas e o link externo da calculadora.

Preserve especialmente:

- Regras de contratação.
- Desconto à vista.
- Parcelamento e mensalidades.
- Datas e valores existentes.
- Baixas e reabertura.
- MRR, despesas e saldo.
- Integração WhatsApp existente.
- Isolamento entre organizações.

A reformulação não autoriza recalcular históricos, alterar regras financeiras ou reconstruir autenticação.

O acesso sem login já implementado é restrito à prévia local de desenvolvimento. Preserve as proteções de produção, acesso remoto e proxies.

## 6. Funcionalidades a implementar

### Visão geral

Use indicadores reais, próximos compromissos e pendências úteis.

Corrija a receita atualmente fixada em R$ 0. Diferencie valor zero, carregamento, ausência de registros e falha de consulta.

Não misture receita recebida, valores contratados e previsão comercial.

### Clientes e relacionamento

- Cadastro de contato/prospect sem obrigação de criar contrato.
- Uma próxima ação por cliente, com prazo, reaproveitando lembretes quando adequado.
- Notas datadas na ficha do cliente.
- Clientes favoritos.
- Filtros por serviço contratado e situação financeira, combinados com a busca existente.

Não inclua sequências automáticas, lead score, segmentos personalizados ou histórico automático de todas as operações.

### Quadro e checklist de entregas

Vincule tarefas de entrega aos contratos.

Cada card representa um item do checklist. Checklist e quadro devem consultar e alterar **o mesmo registro**.

Colunas:

1. A fazer.
2. Em andamento.
3. Concluído.

Regras:

- Concluir pelo quadro marca o checklist.
- Marcar o checklist move o card para Concluído.
- Reabrir pelo quadro desmarca o checklist.
- Desmarcar o checklist retorna à coluna anterior.
- Quando não existir coluna anterior conhecida, use A fazer como fallback e documente essa decisão.

Não crie tarefas fictícias para contratos antigos. Apresente um estado vazio útil com opção de cadastrar tarefas.

Não adicione coluna Em revisão, cronômetro ou gestão de equipe.

### Pipeline comercial

Permita várias oportunidades por cliente, inclusive contatos sem contrato.

Etapas e probabilidades automáticas:

- Qualificação: 20%.
- Proposta: 40%.
- Negociação: 70%.
- Fechamento: 90%.

Resultados finais:

- Ganho: 100%.
- Perdido: 0%.

Inclua valor, previsão de fechamento, detalhe e visualizações de quadro e lista.

Previsão ponderada = valor × probabilidade. As métricas de oportunidades abertas devem excluir resultados finais e permanecer separadas das métricas financeiras.

Não adicione ajuste manual de probabilidade sem nova decisão.

#### Conversão em contrato

Ao solicitar o fechamento como ganho, abra o assistente de contrato existente com os dados aproveitados.

- O usuário revisa e confirma.
- Contrato e cobranças somente são criados após confirmação.
- Cancelar o assistente preserva a oportunidade no estado anterior e não cria registros financeiros.
- Proteja contra duplicação por cliques repetidos, reenvio ou repetição do fluxo.
- Registre o vínculo entre oportunidade e contrato convertido.
- Não gere cobranças apenas por arrastar um card.

Considere essa regra de cancelamento uma decisão de implementação para resolver a pendência do briefing; informe-a no resultado.

### Financeiro e extrato

Preserve o financeiro existente e acrescente filtros de cobranças:

- A vencer.
- Atrasadas.
- Pagas.

Gere extrato por cliente com valores, vencimentos e situação das cobranças, adequado para impressão e salvamento em PDF pelo navegador.

Não apresente o extrato como nota fiscal. Não acrescente emissão fiscal, envio automático ou documentos individuais de cobrança com rascunhos.

### Exportações

- CSV para consulta em planilhas.
- JSON versionado com os registros de negócio, identificadores e relações necessários.

Preserve o escopo da organização autorizada. Não exporte senhas, hashes, sessões, cookies, tokens ou segredos de configuração.

Não implemente importação ou restauração nesta etapa. Não anuncie o JSON como restauração validada.

### Busca global

Pesquise clientes, oportunidades e tarefas, com acesso ao resultado correspondente.

Não amplie para todos os módulos nem adicione IA ou serviço externo.

### Relatórios individuais

Crie uma área simples de receitas e pipeline por período.

Deixe clara a definição de cada indicador. Não duplique valores entre oportunidades ganhas e contratos, nem confunda previsão com recebimento.

Não inclua rankings, metas de equipe, origem dos contatos ou desempenho de entregas.

### Central interna de notificações

Implemente avisos internos baseados nos dados existentes:

- Próximas ações vencidas.
- Tarefas com prazo vencido.
- Compromissos do dia.
- Cobranças em atraso.

Inclua leitura/não leitura e descarte. Evite avisos duplicados, mantenha essas escolhas após recarregar e trate datas no fuso utilizado pelo aplicativo.

Use uma solução simples compatível com a arquitetura existente. Não adicione infraestrutura de processamento somente para essa função.

As regras acima resolvem a pendência do briefing; documente-as. Não inclua email, WhatsApp automático, push externo ou avisos com dados fictícios.

## 7. Organização da implementação

Siga esta ordem:

1. Base visual e navegação consistente em todas as telas.
2. Quadro e checklist de entregas.
3. Pipeline e conversão em contrato.
4. Complementos financeiros, relacionamento, busca, relatórios, notificações e exportações.

Primeiro apresente um plano curto com as partes afetadas, dependências de banco e sequência de validação. Depois prossiga com o trabalho autorizado, sem exigir confirmação para cada decisão técnica rotineira.

Escolha rótulos, agrupamentos e atalhos coerentes com o uso pessoal. Não copie os módulos empresariais das referências.

Não transforme cada detalhe visual em uma nova pergunta. Pergunte somente quando houver uma decisão material fora do briefing ou um bloqueio real.

Mantenha um registro de progresso no projeto para permitir retomada em outra conversa.

## 8. Verificação

Execute as verificações adequadas à stack e às alterações.

Priorize testes de comportamento para:

- Sincronização bidirecional entre checklist e quadro.
- Retorno à coluna anterior.
- Probabilidades e previsão ponderada.
- Conversão e cancelamento sem cobranças indevidas.
- Prevenção de duplicação.
- Preservação das regras financeiras.
- Isolamento por organização.
- Exportações sem segredos.
- Persistência dos estados das notificações.
- Preservação das restrições do acesso pessoal local.

Não crie testes que apenas reproduzam detalhes de CSS.

Verifique a interface no navegador, incluindo larguras de desktop e celular, navegação, formulários, filtros e estados de erro e vazio.

Não afirme que um fluxo com banco funciona sem verificá-lo. Se o Neon impedir uma validação, registre exatamente o que foi implementado e o que permanece sem comprovação.

Considere que abrir conversas reais pode marcar mensagens como lidas. Evite esse efeito nas verificações.

Faça uma revisão final do diff em busca de regressões, alterações fora de escopo e complexidade desnecessária.

## 9. Entrega e encerramento

Ao terminar:

- Resuma o que foi implementado.
- Informe validações executadas e resultados.
- Liste bloqueios e limitações reais.
- Documente migrations e decisões tomadas.
- Atualize a documentação visual e o registro de progresso.
- Não faça commits, push, PR ou publicação sem solicitação específica.

Registre os serviços e processos temporários que iniciar. Ao encerrar, finalize somente os que você criou, preservando os programas e processos do usuário. Deixe algum serviço ativo apenas se eu pedir expressamente.

O resultado deve ser um Abelha funcional e visualmente consistente com o Rapport, preservando sua identidade, seus dados e sua finalidade de uso pessoal.