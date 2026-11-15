# Vercel Preview — homologação

Verificado em **13/11/2026**: deployment **READY**, com Dark Mode e backend isolado. Resultado estruturado: [vercel-preview-20261113.json](audits/vercel-preview-20261113.json).

## Ambiente

| Item | Estado |
|---|---|
| Preview | https://abelha-gestor-bzjtcg3ka-higoraranda-gmailcoms-projects.vercel.app |
| Projeto / deployment | abelha-gestor / dpl_2Mv23jgB9JZdrMGAdNxxLEHEPPpu |
| Código | 40c179cc2f976deb8f312e4ec3559e284d1a5924, já publicado na main |
| Backend | https://abelha-gestor-api-hml.onrender.com |
| Render HML | srv-dbr3if3tqb8s73cr2jn0 / Free / main / Auto-Deploy desligado |
| Deploy backend | dep-dbrfscdbedkc73dg79gg / live / 40c179c |
| Banco / role | abelha_homologacao / abelha_hml_app |
| Neon | br-hidden-night-ace956m0 / ep-crimson-snow-acmuhqgp / habilitado, mínimo=máximo0,25CU |

O usuário mantém commits manuais somente na **main**. Este Preview usa o SHA já publicado, sem criar/sincronizar branch, commit, push ou PR. A referência Git do deployment é o próprio SHA; os três aliases de produção, inclusive git-main, foram preservados.

Este Preview é uma cópia fixa. Novos commits na main não o atualizam automaticamente. **Push na main pode disparar Production** pelas integrações existentes; não interpretar publicação manual na main como atualização exclusiva de Preview. Para testar outra revisão, publicar um novo Preview fixado no SHA autorizado, sem promoção.

## Configuração e segurança

- **BACKEND_URL**: criada no servidor Vercel exclusivamente em **Preview**, apontando ao backend HML. Abrange os Previews do projeto; a Vercel não aceita override Preview pelo nome da branch de produção main. Nenhuma variável Production foi alterada.
- **VITE_API_URL**: existente e preservada. Builds publicados usam API no mesmo domínio pelo proxy; essa variável não configura o proxy. Nenhum segredo foi exposto em VITE_*.
- **FRONTEND_URL**: somente no Render HML, atualizada para a origem exata deste Preview. Atualização por merge, preservando as demais variáveis, seguida de redeploy manual HML.
- O proxy em Preview exige BACKEND_URL HTTPS explícita e recusa o hostname conhecido de produção, inclusive ponto DNS final e URLs com credenciais. Testes confirmam bloqueio antes de encaminhar uma gravação.
- Deployment Protection da Vercel permanece habilitada. Testes usam acesso temporário próprio; links e cookies de acesso não são versionados.

## Testes e limites

- **53 testes backend,16 frontend**, builds/TypeScript dos dois projetos e ESLint sem warnings aprovados.
- **77 capturas locais**:17 áreas CRM/Personal em desktop/mobile, reflow adicional em320px/768px, teclado, modais, carregamento, vazio e recuperação de erro; sem falhas detectadas de contraste de texto, overflow ou exceções JavaScript.
- **11 cenários funcionais locais**: projetos/revisão humana, GitHub sintético, faturas/metas, assinaturas, ausência de preço inventado, revisão semanal, templates, validação de leads, mobile, offline/reconexão e atualização voluntária do SW preservando rascunho.
- **12 testes diretos HML**: identidade PostgreSQL, autenticação, cookies, sete endpoints Personal, proteção de mutação, token n8n, captura idempotente, HMAC GitHub e restauração de35 contagens/fingerprints.
- CORS após atualizar FRONTEND_URL: OPTIONS204 permite a origem exata do novo Preview com credentials e não permite a origem de produção.
- Navegador remoto: login real pelo proxy, cookie seguro no domínio do Preview, sete endpoints Personal, projeto/fatura/conta/revisão pela UI com confirmação no banco isolado e navegação desktop/mobile. Resultado final e limpeza no relatório estruturado acima.

**Limitação PWA no Preview protegido:** o SW busca o shell com `credentials:omit`; a Vercel redireciona esse acesso sem autenticação. A instalação do cache offline falha de forma segura. Não foi enfraquecida a política do cache nem desativada a proteção. O teste completo de offline e troca de versão passou localmente; instalação offline remota, instalação em dispositivo e entrega física de push ficam pendentes. O uso online do Preview permanece disponível.

A primeira rodada do verificador remoto precisou ajustar o seletor da tela de Conversas e a limpeza do aviso semanal. Uma espera sem limite do SW foi encerrada com seus próprios processos Chrome; fixtures sintéticas foram removidas antes da nova rodada. Não foram necessárias alterações no código funcional publicado.

## Uso manual e próxima etapa

1. Abrir a URL do Preview e autenticar-se na Vercel com acesso à equipe. Entrar no Abelha com a conta sintética preparada em `.abelha-homologacao/credenciais-hml.json`; abrir esse arquivo apenas localmente, sem copiar valores para Git, documentação ou cofre.
2. Para homologar instalação offline remota, decidir um mecanismo de acesso de teste compatível com recursos estáticos públicos. Mudanças na proteção exigem autorização específica; não habilitar cache de API privada. Validar instalação/notificações em dispositivo de teste autorizado.
3. Próxima etapa possível: configurar **o workflow único n20DNyb13Aaw3nq5**, mantendo-o desativado. Releitura Cloudfy confirmou62 nós, zero credenciais referenciadas e dez destinos backend ainda na produção. Alterar esses destinos para HML antes de executar qualquer teste.
4. Configurar Header Auth HML (`Authorization: Bearer <ABELHA_INTEGRATION_TOKEN>`), credencial de entrada dos webhooks e GitHub/HMAC correspondente. Token/UUIDs sintéticos já estão preparados privadamente. Não fornecer DATABASE_URL ao n8n nem reutilizar credenciais de outros projetos.
5. Preços reais dependem de fonte/API e allowlist autorizadas. WhatsApp depende das variáveis Evolution opcionais. Essas integrações não foram tratadas como ativas.

Configurar/testar o workflow é uma próxima etapa; **ativação n8n, migrations e publicação de produção continuam sem autorização**. O Personal/automações ainda não está liberado para produção.

Produção Vercel preservada em dpl_6roGRoZHCXA4YvkRibqBfYommVZ3, com os mesmos aliases e variáveis existentes. Nenhum deploy/variável foi solicitado no Render de produção srv-daldd0142hec73c3ltt0. Backend HML e compute são recursos persistentes solicitados; processos de teste, navegador, conexões e acesso temporário são encerrados ao final, conforme evidência estruturada.
