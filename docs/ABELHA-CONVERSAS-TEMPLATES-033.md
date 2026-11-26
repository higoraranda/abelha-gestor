# Conversas, WhatsApp e retirada de Templates — Prompt03.3

Escopo: revisão local e preparação. Não houve número/instância real conectada, envio externo, iframe WhatsApp Web ou alteração de serviço externo. A correção posterior do proprietário revogou commit/push automáticos em qualquer branch; publicação HML depende do envio manual.

## Templates

Antes desta missão: navegação e dashboard não possuíam módulo Templates; `resolveNavigation` redireciona `view=templates` à Calculadora. `TemplatesPage.tsx` existia sem importações. Removida essa página morta nesta missão. Nenhuma tabela, registro ou endpoint legado foi apagado.

`/api/v1/prospecting/templates` e os endpoints de drafts permanecem autenticados/exclusivos do proprietário para compatibilidade com histórico. Não foram convertidos em atalho nem módulo independente; o prompt comercial atual pertence à Calculadora/proposta aprovada. Não há nova dependência para Templates.

## Matriz de Conversas

Status PASS local descreve implementação/teste sintético; operação externa continua BLOCKED até configuração exclusiva aprovada.

| Requisito | Antes | Nesta missão | Responsável | Evidência/ambiente | Estado e pendência |
|---|---|---|---|---|---|
| QR pela interface | Sim | Preservado | WhatsAppConnection.tsx; evolutionApi.ts | Runner visual sintético solicita só após clique e esconde QR após conexão | PASS local; BLOCKED pareamento real |
| Estado da conexão | Sim | Preservado | WhatsAppConnection; GET conversations/whatsapp/status | Estados unconfigured/disconnected/connecting/connected/unavailable explícitos | PASS local; provedor não certificado |
| Listar conversas | Sim | Preservado | ConversationList; GET conversations | API com organização da sessão, paginação20 por padrão/máximo50 | PASS local; sem histórico WhatsApp real |
| Consultar mensagens | Sim | Preservado | MessageThread; GET conversations/:id | Últimas50 mensagens, ordenadas para leitura | PASS local; sem paginação de mensagens antigas |
| Receber texto | Sim | Preservado | webhookProcessor; webhooks/evolution | Segredo no header, instância→organização, deduplicação por message ID | PASS em fixture; BLOCKED entrega externa |
| Enviar texto dentro do Abelha | Sim | Preservado | MessageThread; POST messages; evolutionApi | Bloqueado sem conexão; grava só após confirmação do provedor | PASS sintético; BLOCKED envio real |
| Horários | Sim | Preservado | ConversationList/MessageThread | Formatação de data/hora na interface | PASS local |
| Não lidas | Sim | Preservado | unread_count; POST conversations/:id/read | Webhook incrementa, seleção zera em organização correta | PASS local |
| Pesquisar contatos | Não havia campo | Acrescentado filtro nome/telefone sem distinção de acento/caixa/formatação | ConversationList.tsx | Teste visual exige busca inexistente e busca SINTETICO | PASS local após validação; limitado às conversas carregadas, explicitado no rótulo |
| Vincular cliente existente | Automático por telefone exato e único | Preservado | webhookProcessor.ts | Match limitado à organização; ambiguidade não escolhe cliente arbitrário | PASS local para automático; vínculo manual ainda não implementado |
| Desconexão | Sim | Preservado | WhatsAppConnection/InboxPage | Envio desabilitado; estado e consulta de recuperação | PASS local; sem monitoramento de desconexão real |
| Reconectar autorizadamente | Preparado | Preservado | botão Conectar WhatsApp | QR só depois de clique e instância configurada | PASS local; BLOCKED sem instância/número autorizado |
| Novas mensagens na UI | Polling existente | Preservado | InboxPage.tsx | A cada20s somente visível/conectado; não promete streaming pelo proxy | PASS local; latência externa não medida |
| Isolamento de convidados | Sim | Preservado | ownerAuthMiddleware/tenantMiddleware | Rotas owner-only e filtros por org; baseline03.1 mantém evidências | PASS baseline local→HML; não repetido sem mudança de guarda |
| Imagens/documentos/áudios | Não | Nenhuma ativação | Webhook e thread aceitam somente texto | Tipos não textuais ignorados com segurança | BLOCKED implementação futura opcional |
| Notificação de mensagem | Não | Nenhuma ativação | Sem vínculo de mensagens à fila push | Avisos Personal não certificam notificação da caixa de entrada | BLOCKED implementação futura opcional |

## Evolution versus Meta

Evolution é uma camada de integração que pode usar Baileys/WhatsApp Web ou a Cloud API oficial. O caminho QR da implementação atual corresponde ao modelo de sessão Web; não comprova que o Abelha implementa onboarding Cloud API. Baileys depende do protocolo Web, sujeito a alterações e interrupções, e não constitui garantia de autorização da Meta. A documentação do próprio projeto diferencia os dois tipos de conexão. [README oficial Evolution](https://github.com/evolution-foundation/evolution-api-baileys/blob/main/README.md).

A Cloud API oficial possui cadastro/business/telefone/templates e políticas próprios; cobra conforme categoria/mercado e regras vigentes de mensagem. Não foi cotada ou contratada. Valores reais devem ser conferidos no país/categoria da operação, sem prometer custo zero por usar Evolution. [Preços oficiais Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing). Os termos restringem usos e acessos não autorizados; não realizar disparos ou coleta indiscriminada. [Termos WhatsApp](https://www.whatsapp.com/legal/terms-of-service).

Hospedar Evolution envolve compute contínuo, banco/cache/sessões persistentes, TLS, backups e manutenção. Software aberto não elimina esses custos nem as condições de licença da versão escolhida. A versão/cotação da infraestrutura não foi selecionada: não inventar mensalidade ou contratar plano.

## Procedimento de configuração exclusiva — não executado

1. Autorizar infraestrutura e eventual custo, instância exclusiva do Abelha e número de teste específico. Não usar Clínica ADIV, outros projetos ou instâncias do usuário por conveniência. Definir Baileys ou Cloud API conscientemente.
2. Fixar versão auditada da Evolution e sua licença; configurar armazenamento persistente da sessão, PostgreSQL/Redis conforme essa versão, autenticação administrativa, backups e HTTPS em domínio público. Restringir painel/API; não expor chave ao navegador.
3. No backend HML, configurar privadamente `EVOLUTION_ALLOWED_ORIGINS` com origem HTTPS exata e `EVOLUTION_WEBHOOK_SECRET`. O adaptador de Conversas lê `evolution_instances` por organização: autorizar registro único `organization_id`, `instance_name`, `api_url`, `api_key` para a carteira HML. Variáveis globais `EVOLUTION_API_URL/KEY` não substituem o registro dessa carteira neste fluxo. Conferir ACL/role e segredo sem logar valores.
4. Criar instância exclusivamente autorizada; webhook por instância para `https://abelha-gestor-api-hml.onrender.com/webhooks/evolution`, evento de texto `MESSAGES_UPSERT`, header `x-evolution-secret` correspondente. Validar formato do evento e rejeição sem header. Não confundir endpoint webhooks do backend com callback Meta nativo; Cloud API necessita adaptação própria.
5. Entrar como proprietário HML, verificar desconectado, clicar Conectar WhatsApp e só o titular escanear. QR e chaves não entram em screenshots/relatórios/cofre. Conferir estado e expiração; nenhum vínculo automático ao abrir tela.
6. Autorizar mensagem de teste para destinatário específico; validar ida/volta, horário, não lidas, duplicidade/replay, carteira incorreta e acesso de convidados recusado. Testar desconexão/reconexão e limpar somente fixtures identificadas.
7. Enquanto não existir essa autorização, conservar unconfigured, não mostrar QR inventado e manter envio desabilitado. Não bloquear publicação das áreas independentes por esse recurso opcional.

## Mídia e notificações — viabilidade futura

Evolution/Cloud API têm recursos de mídia, mas faltam ao Abelha ingestão de anexos, metadados e armazenamento privado, upload/tamanho/MIME, proteção de URLs/SSRF, acesso autenticado por organização, política de retenção e interface de reprodução/download. Áudio não implica transcrição: seria outra capacidade/custo, jamais obrigatória. Notificações precisam fila/evento de mensagem e inscrição por titular, sem conteúdo privado na notificação pública; entrega física deve ser testada. Não basta acrescentar tags de imagem/iframe ou reutilizar links de provedor com tokens.

## Validação

Testes visuais locais são explicitamente sintéticos, sem conexão externa. O teste de busca foi observado falhar antes da implementação; a rodada verde será registrada no relatório consolidado. Builds e testes finais são coordenados depois das alterações de Calculadora para não disputar artefatos compilados.
