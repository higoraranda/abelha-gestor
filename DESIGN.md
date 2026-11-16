# Design do Abelha — CRM + Personal

Direção atual: Dark Mode padrão, grafite e amarelo Abelha, conforme o redesign de 12/11/2026. Preservar a composição Rapport existente. Esta paleta substitui a aparência clara do briefing anterior; não há alternância de tema nesta etapa.

## Produto e identidade
CRM individual e organização pessoal em ambientes separados, em pt-BR, valores em reais, fuso America/Sao_Paulo. Preservar a marca da abelha e o amarelo. Nada de equipes, metas de vendedores ou decoração empresarial.

## Cores e superfícies
Fonte de verdade executável: `frontend/src/theme.css`, importado por `index.css`. Modelo de propriedade: o CSS mantém os valores; este documento espelha os papéis e explica o uso. `workspace.css` mantém os componentes compartilhados; `personal.css`, carregado por último, mantém somente a composição Personal, consumindo a mesma paleta.

| Papel | Token CSS | Valor | Aplicação |
|---|---|---|---|
| Fundo | `--canvas` | `#141719` | Documento, autenticação, área de mensagens |
| Superfície | `--surface` | `#1D2224` | Painéis, navegação, colunas |
| Card interno | `--card-surface` | `#252A2C` | Cards de quadro, modais, cabeçalhos de tabela |
| Borda estrutural | `--line` | `#353B3E` | Separadores e limites de superfície |
| Borda de controle | `--line-strong` | `#69777D` | Campos, seleção e estados interativos |
| Texto principal | `--ink` | `#F5F5F3` | Títulos, dados e conteúdo |
| Texto secundário | `--ink-soft` | `#AAB3B5` | Explicações e metadados |
| Texto discreto | `--ink-faint` | `#9AA5A8` | Placeholders e informações auxiliares |
| Marca / ação | `--accent-yellow` | `#F4D22F` | Botões principais, foco, gráficos, progresso |
| Texto sobre amarelo | `--on-accent` | `#141719` | Botões, seletor de ambiente, link de salto |
| Seleção contida | `--accent-muted` | `#343222` | Navegação ativa, mensagens enviadas, datas selecionadas |
| Contexto secundário | `--context-green` | `#244E42` | Próximos passos e ritual da fatura |
| Texto no verde | `--context-ink` | `#E0ECE5` | Descrições nos painéis contextuais |

- Hierarquia por superfícies sólidas e bordas discretas. Sem fundos luminosos, gradientes decorativos ou sombras coloridas. O brilho suave do carregamento é a única transição de fundo em gradiente.
- Amarelo continua como principal destaque. Verde não representa outra marca nem substitui as ações amarelas. Sucesso e erro usam tons dessaturados com texto/ícone e situação explícita.
- Raio principal `--radius-panel`: 26px; cards internos `--radius-card`: 20px; campos `--radius-control`: 13px; ações/filtros `--radius-pill`: 999px.
- Sombras `--shadow-sm`, `--shadow-panel` e `--shadow-modal` representam elevação. Evitar brilho branco nas bordas e sombra em cada linha de tabela.
- Cor nunca substitui texto de situação ou de erro.

## Tipografia e densidade
Urbanist (`--font-body`) com fallback system-ui para títulos e corpo, preservando a identidade existente. Títulos 30–43px, peso 600, tracking discreto negativo. Texto operacional de 13–14px; metadados de 11–12px. CSS histórico com texto de 7–10px foi elevado para 11px; eventos compactos do calendário mobile usam 10px e detalhe completo no painel do dia. Valores financeiros e tabelas usam números tabulares. Números claros e ações com rótulo útil.

## Navegação e composição
Navegação superior: Visão geral, Clientes, Entregas, Pipeline, Financeiro, Agenda, Conversas e Relatórios. Rail de ações: busca, novo contato, agenda, exportações e calculadora externa. Notificações no cabeçalho. URL guarda área e registro selecionado para links de busca/notificações.
O seletor CRM/Personal fica junto à marca. CRM acrescenta Buscar leads e Templates. Personal: Meu dia, Projetos, Faturas e metas, Contas, Preços, Revisão semanal e Preferências. Trocar ambiente limpa o registro anterior e troca menu, ações e central de avisos; links antigos continuam CRM. O gesto característico do Personal é o ritual da fatura no painel verde já usado nos próximos passos do CRM.
Em celular: navegação rolável no topo, rail inferior, cards empilhados e quadros/tabelas com rolagem própria. O pipeline mantém suas quatro colunas em uma mesma faixa horizontal. O calendário exibe os sete dias na largura disponível e o painel abaixo mantém o texto completo dos compromissos. Não ocultar rolagem de formulários para fazer tabelas caberem.

## Padrões reutilizados
- Modal.tsx: Radix, foco preso, Escape, título e restauração de foco.
- DataState.tsx: carregamento, erro com tentativa e vazio com orientação.
- BeeLoader.tsx: inicialização com a arte intacta de `public/bee-mark.png` e flor SVG independente. Voo fechado de 5,2s em wrapper HTML; aguarda health, imagem e verificação da sessão antes do pouso único de aproximadamente 1,2s. Pétalas da frente coincidem com as posteriores e ocultam a abelha por clipping, sem fade do mascote. Consome a paleta compartilhada; movimento reduzido tem explicação e ativação explícita opcional do voo.
- useRemote.ts: consultas canceláveis, respostas antigas descartadas e atualização após mutações.
- theme.css: paleta semântica, estados, elevação, scrollbar, raios e adaptadores Tailwind `@theme inline`. Nenhum componente declara sua própria paleta.
- workspace.css: forms, cabeçalhos, cards, tabelas, quadros, filtros, notificações, conversas e impressão.
- Lucide para ícones. Sem uma biblioteca genérica nova.

## Contratos de interação
Quadro/checklist alteram o mesmo registro; seletor fornece alternativa ao arraste. Concluir preserva coluna anterior. Cancelar conversão não envia mutação. Confirmação de contrato é o único momento que cria cobranças e marca ganho. Erros de banco nunca viram dados fictícios.
Feedback de erro em português. Desabilitar ações enquanto salva. Foco visível. Respeitar prefers-reduced-motion. CSV não contém fórmulas executáveis e JSON não contém segredos.

## Estados e acessibilidade visual

- `color-scheme: dark` no documento, inputs, selects e pickers nativos. Popup e calendário nativo continuam sob propriedade do navegador/sistema; não criar um seletor paralelo.
- Botão principal usa texto escuro e estados amarelos hover/pressed. Secundários usam superfícies e bordas; perigo usa texto dessaturado e contexto explícito.
- Foco amarelo visível com offset, inclusive em links, campos e botões somente com ícone. Campo tem borda mais forte que separadores decorativos. Placeholder não substitui rótulo.
- Scrollbars globais visíveis com tokens de trilha/thumb/hover/active e fallback para forced-colors; nenhuma área depende de uma classe opt-in para receber o tema.
- Modais escuros com overlay neutro e Radix existente. `Escape`, foco preso e restauração de foco preservados.
- Progresso e séries principais dos gráficos usam amarelo; projeção usa `--chart-muted`, distinguida também por legenda. Concluídos conservam legibilidade e usam texto/risco, sem opacidade excessiva.
- Extrato escuro na tela. Somente `@media print` usa papel branco/texto escuro para impressão/PDF legível.
- Meta `color-scheme`, `theme-color`, manifesto e background da PWA usam a direção escura; barra de status iOS usa `black-translucent`.

## Evidências visuais

[Guia, capturas e validações do Dark Mode](docs/DARK-MODE.md). Capturas usam apenas registros sintéticos. O teste visual percorre todas as telas, os dois ambientes, login, formulários e estados em desktop/mobile; não comprova entrega física de push ou integração externa.

## Preservação
Regras financeiras, conversas e autenticação publicada permanecem existentes. Acesso sem login somente na prévia local autorizada. As telas inspiradas no Tandem/Fernly usam a mesma linguagem visual do Abelha.
