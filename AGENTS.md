# Abelha | Regras do repositório

- Identifique o checkout e a branch pelo remoto e Git. Preserve alterações locais. Sem commit, push, merge, deploy, migration remota, mudança de credencial ou configuração global sem autorização específica.
- Autorização vem da sessão no backend. Todo recurso privado exige escopo de organização e, quando aplicável, usuário. Preferência visual jamais concede acesso. Configuração de conta não autoriza ver dados privados do membro.
- Dados de clientes, e-mail, WhatsApp, tokens, QR e chaves não entram no Obsidian, nos logs de validação ou nos prompts de desenvolvimento. Roteie integrações de saída por destinos explicitamente autorizados e sem redirects.
- Mantenha integrações de execução separadas de administração e automações. Evidências do Codex entram pendentes de revisão. Relatório, aceite e publicação são estados distintos.
- Valide migrations em banco descartável ou HML explicitamente autorizado. Nunca use produção como fixture. Não repita migrations aplicadas, nem faça reset de dados para corrigir divergências. Encerre processos temporários iniciados durante a tarefa.
- Retome por [roadmap do Abelha](docs/ABELHA-ROADMAP-MULTIUSUARIO.md) e [inventário de acesso](docs/ABELHA-MATRIZ-DE-ACESSO.md).

