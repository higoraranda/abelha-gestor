# Busca Lead — verificação 03.3

Data: 25/11/2026. Ambiente: checkout local; sem publicação, importação de empresas, credenciais adicionais ou contratação. Evidências 03.1 preservadas.

## Implementação existente e correção

`frontend/src/pages/LeadsPage.tsx` já oferece nicho livre, cidade com UF, limite, execução/cancelamento, filtro de resultados, endereço, telefone, site/redes informados, seleção e importação individual dos selecionados. Não exige dropdown de categorias. `backend/src/services/personal.ts` valida texto, escapa operadores e usa aliases comuns ou correspondência textual nas etiquetas OSM. A UF representa a região; não existe busca por uma região geográfica arbitrária separada do município.

Texto livre significa que qualquer nicho válido pode ser enviado. Não implica compreensão semântica universal: termos não reconhecidos buscam literalmente nome/marca/descrição/categoria. Por exemplo, “Empresas de energia solar” pode não coincidir com uma empresa descrita apenas como “energia solar”. A implementação não comprova cobertura integral de qualquer nicho/cidade.

Correção desta missão em `backend/src/services/leads.ts`: HTTP 406 da instância também permite uma única tentativa na alternativa, respeitando orçamento total e cancelamento. Antes, uma recusa de negociação/gateway interrompia a busca antes da alternativa. HTTP 400 de sintaxe continua sem reenvio. Não houve aumento de timeout nem alteração de banco ou contrato da importação.

Também corrigido o alias plural “Clínicas veterinárias”: agora resolve `amenity=veterinary`, como o singular. Antes, esse exemplo solicitado caía em texto literal e poderia perder clínicas corretamente etiquetadas. Nichos desconhecidos continuam aceitos sem exigir categoria predefinida.

## Diagnóstico e provas públicas reais

Requisições sequenciais de baixo volume, em processos Node que terminaram, sem conexão ao banco nem endpoint de importação. As respostas foram reduzidas a status, tempos, tipo e contagens; nenhum nome de empresa, contato ou conteúdo comercial foi registrado.

| Experimento | Destino | Resultado observado |
|---|---|---|
| Transporte sandbox, controle mínimo | Primária e alternativa | `EACCES` em 32 ms / 2 ms; restrição local, não timeout do Overpass |
| Controle sem User-Agent da aplicação | overpass-api.de | HTTP 406 em 703 ms, HTML nginx |
| Controle sem User-Agent da aplicação | overpass.private.coffee | HTTP 429 em 639 ms, exige User-Agent significativo |
| Consulta gerada pelo código: Dentistas / Salto, SP / 3, headers exatos da aplicação | overpass-api.de | `TimeoutError`, 14.008 ms |
| Mesma consulta e headers | overpass.private.coffee | `TimeoutError`, 14.004 ms |
| Controle trivial `node(1);out ids;`, headers da aplicação | overpass.private.coffee | `TimeoutError`, 9.002 ms |
| Apenas resolução da área Salto, admin_level 8, headers da aplicação | overpass.private.coffee | `TimeoutError`, 9.000 ms |

Diagnóstico: a indisponibilidade observada também afeta controle trivial e resolução isolada, portanto não há evidência para afirmar que a causa seja apenas o custo da consulta por município. O caminho público de transporte/provedor não respondeu com JSON dentro do orçamento. A execução `[timeout:10]` do Overpass não limita espera de rede/fila; `[out ... 3]` limita a saída e não o custo de localizar objetos. O servidor pode recusar demanda e não oferece garantia para serviço comercial, conforme o [manual de uso compartilhado](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html).

O User-Agent significativo já existia no código: sua ausência foi apenas uma variável do diagnóstico, não uma correção pendente. A falha HTTP 406 foi reproduzida numa condição de transporte distinta; a recuperação por outra instância foi comprovada por teste sintético, não por resultado público bem-sucedido. O upstream ou caminho exato que não respondeu não pode ser isolado mais precisamente com estas evidências. Não declarar Overpass operacional nem afirmar que os timeouts do Render foram resolvidos.

## Alternativas e decisão

Valores em USD consultados em fontes oficiais em 25/11/2026; sem impostos/câmbio. Qualidade brasileira por cidade e nicho exige amostra real autorizada: cobertura global declarada não comprova estabelecimentos completos ou contatos atualizados no Brasil.

| Fonte | Busca/cobertura e dados | Franquia e custo posterior | Termos, limites e adequação |
|---|---|---|---|
| OpenStreetMap / Overpass | Base comunitária mundial incluindo Brasil; etiquetas comerciais, nome, endereço, telefone/site/redes quando cadastrados. Nicho desconhecido é correspondência textual, não busca semântica universal. | Sem chave ou cobrança por chamada; instâncias compartilhadas podem limitar/recusar; infraestrutura própria gera custo operacional. | ODbL exige atribuição e condições aplicáveis ao uso da base. Sem SLA público. Única fonte atual; requisições reais indisponíveis neste teste. |
| Google Places Text Search New | Texto livre e informações comerciais; campos de telefone e site pertencem à faixa Enterprise. Cobertura brasileira deve ser medida, não presumida integral. | Pro: 5.000 eventos/mês gratuitos e US$32/1.000 excedentes na primeira faixa; Enterprise: 1.000 gratuitos e US$35/1.000 excedentes. A máscara de campos determina cobrança; requer billing e chave/OAuth. | Restrições de exportação, armazenamento e cache impedem tratar a resposta como importação irrestrita ao CRM; place IDs têm exceção. Exige análise de licença/modelo de uso antes de adaptar o importador. |
| Foursquare Places API atual | Pesquisa por palavras-chave em base global; nomes/categorias e atributos disponíveis segundo os campos/plano. Não confundir Places com Personalization ou endpoint V3 legado. | 500 chamadas Pro gratuitas; depois US$15/1.000 até 100 mil. Premium US$18,75/1.000 na primeira faixa; checar classificação dos campos necessários no contrato. | Conta/chave, atribuição e limites contratuais de retenção. Não assumir importação persistente permitida. Site comercial ainda menciona 10 mil em trecho promocional; prevalece anúncio específico vigente desde 01/06/2026 de 500 Pro. |
| Geoapify Places | Consulta por categorias e localização, não substitui nicho livre arbitrário; dados OSM e atributos disponíveis conforme objeto. Telefone/site não garantidos. | 3.000 créditos/dia grátis, até 5 req/s, sem cartão; Places cobra por blocos de até 20 locais. Próximo plano: US$59/mês por 10.000 créditos/dia. | Uso comercial no grátis permitido com atribuições Geoapify/fonte. Requer conta/chave; não resolve sozinho a limitação semântica de categorias nem comprova melhor cobertura brasileira. |

Fontes oficiais consultadas:

- OSM: [licença e atribuição](https://www.openstreetmap.org/copyright), [áreas e resolução de municípios](https://dev.overpass-api.de/overpass-doc/en/full_data/area.html).
- Google: [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search), [preços por SKU](https://developers.google.com/maps/billing-and-pricing/pricing), [uso e billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing/), [políticas de armazenamento e exportação](https://developers.google.com/maps/documentation/places/web-service/policies).
- Foursquare: [visão da API atual](https://docs.foursquare.com/fsq-developers-places/reference/places-api-overview), [mudança de franquia e descontinuação V3](https://docs.foursquare.com/developer/reference/upcoming-changes), [tabela comercial](https://foursquare.com/pricing/), [licença PAYG](https://foursquare.com/legal/terms/apilicenseagreement/).
- Geoapify: [API e configuração da chave](https://apidocs.geoapify.com/docs/places/), [créditos Places](https://apidocs.geoapify.com/docs/places/places/), [preços e uso comercial](https://www.geoapify.com/pricing/).

Nenhuma fonte gratuita avaliada foi comprovada adequada à combinação completa “qualquer nicho + cobertura comercial brasileira + disponibilidade + importação persistente”. Manter integração atual com erro explícito é seguro, mas a função permanece bloqueada operacionalmente. Próximo passo de menor custo: testar novamente duas consultas pequenas a partir do HML após publicação manual do candidato; se continuar indisponível, escolher e autorizar provedor/licença com persistência compatível. Google/Foursquare exigem análise de licença e custo antes de qualquer contratação/configuração. Geoapify exige adaptação de nichos e não deve ser apresentado como substituto semanticamente equivalente. Não foi adicionada integração sem chave nem mock de sucesso como fallback de produção.

## Checklist da seção 3

| Requisito | Já existia | Responsável/evidência | Resultado local / pendência |
|---|---|---|---|
| Digitar nicho livre | Sim | LeadsPage, resolveLeadNiche; teste de texto livre | PASS do contrato; cobertura semântica universal não comprovada |
| Informar cidade/região | Cidade + UF | overpassQuery, teste de homônimos/UF | PASS município/UF; região arbitrária não implementada |
| Executar pesquisa pública | Sim | searchLeads; tentativas reais descritas acima | BLOCKED: provedores não responderam com dados |
| Visualizar resultados | Sim | LeadsPage; normalização sintética | PASS implementação; resultado público real pendente |
| Consultar informações comerciais | Sim | normalizeOverpass, links seguros e dados opcionais | PASS implementação; qualidade real não aferida |
| Identificar site sem inferir ausência | Sim | UI: “Site não informado na fonte”; orienta investigar presença digital | PASS inspeção; nenhuma classificação inventada |
| Importação seletiva | Sim | saveSelected → POST /leads/import; autorização por sessão/organização já existente | PASS inspeção; não importado dado real; homologação sintética integrada sob responsabilidade do runner geral |
| Investigar Overpass sem apenas aumentar timeout | Parcial anterior | controles mínimos, transporte/headers, 406 RED/GREEN | PASS investigação limitada; causa externa mais específica não comprovada |
| Avaliar alternativas, custos e termos | Não consolidado | comparação e fontes acima | PASS documental; sem contratação |
| Validar pesquisas reais | Tentativa anterior expirou | nova busca Dentistas / Salto SP e controles | BLOCKED operacional; tentativas reais realizadas, nenhum sucesso fabricado |

## Testes e encerramento

RED: novo cenário `not-acceptable` falhou porque HTTP 406 não acionava alternativa (16 passam, 1 falha). GREEN: `npm run build` e `node --test dist/services/leads-security.test.js dist/services/personal.test.js` — 24 testes passaram, zero falhas. Cobre orçamento global, aborto, stream limitado, privacidade dos logs, erros e sucesso vazio, validação de cidade, texto livre e fallback. Testes sintéticos não substituem homologação pública. Nenhum servidor, porta, worker ou container foi iniciado; processos de consulta terminaram.

Segundo RED/GREEN: a asserção do alias plural falhou com busca literal; após acrescentar apenas o alias correspondente, os mesmos 24 testes passaram, preservando o cenário de nicho desconhecido.

Skills aplicadas: systematic-debugging, test-driven-development e verification-before-completion. Memória duradoura pertinente: manter a distinção entre texto livre aceito e cobertura universal, e entre teste sintético e disponibilidade real. Atualização do Segundo Cérebro fica coordenada no encerramento geral da missão para evitar notas duplicadas.
