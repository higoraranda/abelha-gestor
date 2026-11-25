# Recuperação de senha

Na tela de login, **Esqueci minha senha** abre o painel de recuperação. Digite o endereço existente no cadastro, abra o link recebido, confirme a nova senha e volte ao login. O botão de olho alterna a exibição sem enviar o formulário. O link expira em 20 minutos, é de uso único e não é enviado pela API ao navegador que pediu o e-mail. Redefinir encerra sessões antigas da conta; pedir um link não muda a senha nem bloqueia o login.

## Ativação por ambiente

- O login multiusuário precisa de `20261125_account_invites.sql`; ela tem um gate explícito de um usuário e uma organização. Confirmar identidade/ambiente, snapshot e ausência de aplicações parciais antes de qualquer promoção. Não substituir o papel por `owner` em código e não rodar seed para recuperar a conta.
- Para promover a release completa, validar na ordem `20261125_account_invites.sql`, `20261125_quote_models.sql`, `20261125_signup_email.sql`, `20261125_password_reset.sql`. Aplicar só o que falta, primeiro em homologação autorizada e depois em produção mediante aprovação específica. Não inferir que código publicado aplicou migrations.
- Reusar `ABELHA_OTP_RESEND_API_KEY` e `ABELHA_OTP_FROM` do cadastro. Configurar um remetente verificado e desabilitar rastreamento de cliques em links de recuperação. `FRONTEND_URL` deve ser a origem HTTPS oficial do ambiente, sem caminho. Para a conta proprietária legada, confirmar o e-mail por canal independente e configurar `ABELHA_OWNER_RECOVERY_EMAIL` com o endereço exato já cadastrado. O fluxo não altera a sua identidade. Para membros, o e-mail precisa ter sido validado no cadastro; confirmar o acesso aos membros antigos separadamente.
- Validar com caixa autorizada: login existente, pedido neutro para e-mails elegíveis ou não, recebimento/validade/link correto, troca de senha, reuso rejeitado, logout das sessões antigas e entrada com a senha nova. Não usar credenciais ou dados reais em testes automatizados.
- O token aleatório tem 32 bytes, é armazenado somente como SHA-256 e viaja no fragmento do URL (que a tela remove). Não registrar corpo de solicitações, tokens, links nem senhas; não exibir segredos em recibos. O cooldown por conta é de 5 minutos. A entrega é iniciada após a resposta neutra, sem reenvio automático; falhas do provedor aparecem nos logs sem dados pessoais. Monitorar e configurar quotas do remetente antes de publicar.

Referência de segurança: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
