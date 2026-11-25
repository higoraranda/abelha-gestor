# Abelha | Verificação de e-mail no cadastro

O cadastro continua exclusivo por convite. Depois de informar nome, e-mail do convite e senha, o convidado solicita um código de seis dígitos. O navegador não recebe o código do servidor: o adaptador o envia para o endereço vinculado ao convite. O banco só cria usuário e organização e marca `email_verified_at` na transação que confirma o código e consome o convite. Contas anteriores continuam funcionando, sem marcar e-mails antigos como verificados retroativamente.

O cadastro reutiliza a mesma estrutura visual do login. No desktop, o painel à esquerda permanece e o código substitui o formulário de cadastro à direita. No celular, o painel do formulário mantém o layout de uma coluna. O visual e as credenciais do login foram preservados, sem adicionar código ao fluxo de entrada.

O e-mail tem o assunto “Seu código de confirmação do Abelha”, cores do Abelha, código destacado, validade e aviso para ignorar envios não solicitados. A versão em texto simples traz as mesmas informações. O modelo não depende de imagens, links ou fontes remotas.

A tela usa um campo nativo para teclado numérico, preenchimento automático compatível e colagem. A confirmação tem rótulo, marca visual verde e animação curta, desativada pela preferência de movimento reduzido. O código vive por até 10 minutos, limitado também pela validade do convite. Reenvio invalida o desafio anterior. Há 60 segundos entre envios, até 5 envios e até 8 erros válidos por convite, inclusive entre reenvios. O banco guarda apenas HMAC do código, nunca o código em claro. O frontend não guarda senha, link de convite ou código em armazenamento persistente.

## Ativação em homologação
1. Confirmar alvo, conta legada e configuração HML. Aplicar `20261125_signup_email.sql` depois de `20261125_account_invites.sql`. Não reaplicar a migration inicial de convites se já estiver instalada. A migration nova é aditiva.
2. Configurar no backend (não em `VITE_*`) `ABELHA_OTP_SECRET` independente com ao menos 32 bytes aleatórios, `ABELHA_OTP_FROM` remetente verificado e `ABELHA_OTP_RESEND_API_KEY` chave de envio. O adaptador segue a [API de envio do Resend](https://resend.com/docs/api-reference/emails/send-email), com texto/HTML e chave de idempotência. Sem configuração válida, o fluxo recusa cadastro; não usa código de teste por padrão.
3. Validar navegador móvel/desktop, foco/colagem/estados, entrega real somente em caixa de e-mail de teste aprovada, reenvio e login. Não publicar frontend e backend incompatíveis. Nenhuma configuração de domínio, credencial, deploy ou migration remota foi feita nesta etapa. Para reduzir dados em logs, não registrar corpos de requisições dos endpoints de cadastro/verificação.
