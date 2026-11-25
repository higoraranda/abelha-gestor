# Abelha | Fase 1: cadastro por convite

## Uso

- Na conta proprietária: **Personal → Preferências → Convidar alguém**. Informe o email, gere o link e compartilhe-o individualmente. Nenhum email é enviado automaticamente.
- O link expira em 72 horas, é de uso único e outro convite para o mesmo email invalida o anterior. O convidado informa seu email, nome e senha.
- Cada convidado começa com uma organização independente e vê uma área Personal simplificada para listar e criar seus próprios projetos. CRM, configurações proprietárias e integrações não são recursos de convidados. Pipeline e sincronização de projetos são etapas separadas.

## Segurança e compatibilidade

O servidor lê o papel atualizado do banco com o par usuário/organização contido na sessão assinada, inclusive para o JWT legado sem papel. Os roteadores privados de CRM e de eventos exigem proprietário. O Personal limita explicitamente as operações de convidado e usa filtros combinados de usuário e organização. Os endpoints das integrações conservam seu mecanismo próprio. O token aleatório não é armazenado em claro; cadastro, consumo do convite, organização e conta fazem parte da mesma transação. O fragmento do link não é enviado no carregamento da página e é retirado do histórico ao montar o formulário.

A migration `backend/src/db/migrations/20261125_account_invites.sql` espera exatamente uma conta anterior e uma organização. Isso é uma proteção estrutural, não uma verificação da identidade de quem está no banco. Uma aplicação futura deve identificar a conta legada e ambiente antes de migrar, fazer backup, verificar o índice de emails canônicos e validar em HML antes de produção. Não publicar a nova versão do backend antes de aplicar e validar a migration correspondente. Não remover a migration nem executar o schema de reset contra bases com dados. Não aplicar retorno de schema sem plano para manter as contas criadas.

## Validação local

- `npm test` no backend roda com banco sintético seguro por padrão; testes de integração PGlite sobem um socket de loopback e não devem usar bancos remotos.
- `npm test`, `npm run lint` e `npm run build` no frontend.
- Para usar a interface local com login, defina somente nos processos de teste `ABELHA_REQUIRE_LOGIN=true` (backend), `VITE_REQUIRE_LOGIN=true` (frontend dev) e a API local apropriada em `VITE_API_URL`. Use base descartável preparada. O modo local anterior sem login continua restrito a uma única organização de desenvolvimento.
- Escopo atual: implementação e testes locais. Nenhum convite real, commit, push, deploy ou migration remota.
