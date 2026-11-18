# Instalar e usar a PWA

Em uma publicação HTTPS autorizada, abra o Abelha e entre na conta normalmente. Em Personal → Preferências:

- Android/Chrome: use Instalar Abelha quando oferecido ou o menu → Instalar aplicativo.
- iPhone/Safari: Compartilhar → Adicionar à Tela de Início; abra o app instalado pelo ícone antes de ativar notificações.
- Desktop: o navegador pode oferecer instalação na barra de endereço ou no menu.

O manifesto inclui ícones 192/512, maskable e apple-touch-icon com a marca existente. O navegador decide se oferece o diálogo de instalação; não se pode forçá-lo.

## Offline e atualização

O build gera `sw.js` com hash da versão e lista explícita de arquivos públicos. Todos os arquivos precisam responder com sucesso antes de concluir a instalação. A navegação usa o HTML da versão ativa até a troca autorizada, sem misturar os hashes de duas publicações. Shell, JS/CSS e ícones podem ser carregados sem rede. API, auth, SSE, webhooks e qualquer gravação ficam fora do cache. O app não salva finanças/tokens/respostas autenticadas em Cache Storage, IndexedDB ou localStorage novo e não enfileira gravações offline.

A instalação também confere MIME e rejeita redirects e respostas `private`/`no-store`. Um fallback HTML com status 200 não pode ser instalado no lugar de JavaScript/CSS. Headers incorretos no host devem ser corrigidos antes da publicação.

Sem internet, dados exigem reconexão e um aviso explica essa condição. Não há promessa de edição financeira offline. Dados já presentes apenas na memória da tela podem continuar visíveis até o recarregamento. Formulários abertos permanecem na sessão; salve ou copie seu rascunho antes de sair/recarregar. Ao reabrir offline, a tela de reconexão não trata falha de rede como sessão encerrada, nem libera dados privados sem verificar a sessão. A validação de identidade e os cookies de produção permanecem os mesmos.

Quando uma versão nova fica pronta, o app oferece **Atualizar e recarregar**. A instalação do worker não chama skipWaiting automaticamente. A versão ativa permanece até a ação do usuário ou o encerramento natural dos clientes antigos. O header de sw.js impede cache de publicação obsoleta. Nenhum deploy foi feito nesta execução.

## Notificações

Permissão só é solicitada após clicar **Ativar neste dispositivo**. Negar não impede o uso normal. Avisos na tela bloqueada são genéricos; abra o app para ler detalhes. Clique no lembrete da fatura abre a tela de registro.

VAPID, migration e workflow de tick precisam estar configurados. Sem eles, salvar horários não agenda execução externa. A entrega fora do app depende do navegador/sistema. Contas, marcos e valores não são modificados por receber um aviso.

Verificação em **18/11/2026**: VAPID configurado no backend de produção, com deploy concluído e botão **Ativar neste dispositivo** habilitado. O usuário confirmou a ativação no iPhone 14 Pro pelo ícone instalado; uma inscrição Apple foi encontrada no banco. Um único aviso de teste foi aceito pela Apple com HTTP `201`, sem gravações de teste no banco, e o usuário confirmou seu recebimento no aparelho. Isso valida a entrega física desse teste; os avisos agendados continuam sujeitos à execução da automação e às condições do sistema. O workflow de automações permanece ativo; horários salvos: diário às 07:40 e domingos às 08:00, em Brasília. As chaves são persistentes e não devem ser geradas novamente a cada publicação.

Se as chaves VAPID mudarem, reabra o app e ative novamente em cada aparelho: a ação explícita substitui a inscrição com chave antiga. Se a API falhar ao salvar uma nova inscrição, ela é revogada no navegador e a tela não informa sucesso. Confira os passos de teste físico em [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md).

Referências: [cache PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching), [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [Web Push no iOS](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).
