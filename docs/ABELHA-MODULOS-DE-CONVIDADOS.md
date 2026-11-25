# Abelha | Administração e módulos de convidados (gates B/C)

## Fluxos no produto

- Em **Personal → Preferências**, o proprietário cria convites individuais com validade escolhida; a API aceita 1 a 168 horas (72 horas por padrão) e a interface oferece 4, 24, 72 horas ou 7 dias. O painel distingue pendente, expirado, revogado e utilizado. Revogar encerra apenas um link ainda não utilizado. Reemissão pelo mesmo emissor invalida o token anterior e reinicia a verificação; outro emissor não pode apropriar-se daquele convite.
- Após cadastro, o painel **Contas e módulos dos convidados** exibe o e-mail do convite, estado, data de cadastro, último login e última mudança de estado quando disponíveis. Não exibe projetos, valores, telefone ou dados privados do convidado. Desativar fecha operações autenticadas e invalida as sessões anteriores da conta; reativar exige novo login. Nenhuma exclusão física é disponibilizada.
- A área **Meu espaço** apresenta apenas os módulos autorizados. Em **Personalizar meu espaço**, o convidado pode ocultar/restaurar itens liberados. Essa preferência persiste, mas não concede nem remove autorização de API. Links para módulos escondidos ou não liberados não montam a tela. Em caso de falha na consulta de permissões, a interface oferece nova tentativa sem presumir permissões.

## Inventário e limites

| Módulo | Política para convidados |
|---|---|
| Projetos pessoais e Calculadora | Direitos anteriores preservados. Projetos mantém apenas criação/listagem de registros próprios; calculadora permite modelos próprios, não propostas comerciais. Cada um pode ser desligado. |
| Financeiro pessoal (faturas/metas), Assinaturas e Monitor de preços | Opt-in independente, desligado por padrão. Endpoints explicitamente enumerados, operam por organização e usuário da sessão. Monitor guarda itens próprios e indica ausência de fonte. Nenhuma coleta/agendamento externo foi concedido. |
| Personal / painel agregado, revisão semanal e notificações | Sem habilitação genérica: agregam outros módulos e poderiam revelar dados de uma área bloqueada. Exigem projeção de autorização por origem antes de liberar. |
| CRM, clientes, conversas/WhatsApp, Busca Lead, propostas e financeiro comercial | Exclusivos do proprietário. Exigem fluxos e autorização de workspace dedicados antes de qualquer abertura a convidados. |
| Integrações, webhooks, automações e administração | Exclusivos dos atores privilegiados existentes. Não entram na enumeração de permissões de membros. |

Permissão administrativa, preferência individual e controle operacional são separados. O middleware valida o papel e a revisão da conta na sessão, e cada método privado permitido confere o módulo e o usuário/organização efetivos. As flags não elevam papéis.

## Migração e recuperação

A migration aditiva `20261127_managed_accounts.sql` vem após account_invites, signup_email, password_reset e `20261126_member_modules.sql`. Ela guarda a preferência de visualização, a revisão revogável do acesso, carimbos de estado/último login, a revogação do convite e a identidade permanente do convidado que o usou. O backfill só vincula uso confirmado à conta canônica compatível criada no resgate; ambiguidades permanecem sem gerenciamento em vez de transferir autoridade. Novos registros vinculam o UUID no mesmo commit do cadastro. Validar em homologação a contagem de convites usados sem vínculo **antes** de liberar o painel. Se houver janela entre aplicar a migration e subir o backend novo, não aceitar cadastros nessa janela ou revalidar o backfill antes de liberar a gestão. Não remover as colunas nem voltar a um backend antigo enquanto existir conta desativada; ele pode ignorar as revogações. Não houve aplicação remota.

OTP e recuperação têm prazo, uso único, limites, resposta de recuperação neutra e proteção contra reuso concorrente. Link de recuperação emitido antes de uma desativação não reabre a conta. O login de credenciais limita operações por identidade e por processo; o orçamento é uma defesa local de uma instância, não um limitador distribuído. A comparação fictícia de bcrypt reduz disparidade de tempo para e-mails inexistentes (senhas legadas com custo distinto podem ter latência diferente). Configuração de remetente, domínio, credenciais e entrega real do Resend **não verificados**; as evidências locais são de e-mail simulado e adaptador. Não divulgar segredos nem enviar a um destinatário real sem autorização.

## Evidência e conclusão

Os testes HTTP com Auth.js/PGlite exercitam proprietário, dois convidados, usuário sintético sem convite e cliente anônimo. Cobrem defaults compatíveis, isolamento das consultas, gestão apenas de convites próprios, falha de autoatribuição, preferências sem elevação de acesso, desativação sem exclusão, tentativa de novo login bloqueada e reativação sem restaurar JWT antigo. Os testes de convites e recuperação usam entrega simulada e cobrem expiração, revoked/reissue, vínculo estável e concorrência.

A administração e os cinco módulos segregados foram implementados localmente. Provedor real, homologação remota e capacidades deliberadamente restritas não são créditos de aprovação. Rotas dependentes da configuração oficial do Abelha continuam fora desse gate.
