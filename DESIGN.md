# Design do Abelha — carteira pessoal

Referência aprovada: Rapport. Este documento substitui a antiga referência Linear escura, conforme briefing e escopo em docs/.

## Produto e identidade
CRM pessoal em pt-BR, valores em reais, fuso America/Sao_Paulo. Preservar a marca da abelha e o amarelo. Nada de equipes, metas de vendedores ou decoração empresarial.

## Cores e superfícies
Fonte de verdade: frontend/src/workspace.css, carregado após o CSS histórico por main.tsx.
- Fundo: #EBE8E1, com campos suaves de amarelo quente e verde dessaturado.
- Texto: #17191A; secundário #62635E.
- Ação principal: amarelo #F4D22F com texto quase preto.
- Superfície: branco translúcido rgba(255,255,255,.62), borda clara, sombra suave.
- Destaque de próximos passos: verde profundo #315C50, texto claro.
- Raio principal: 26px; cards internos 20px; campos 13px; ações e filtros em cápsulas.
- Cor nunca substitui texto de situação ou de erro.

## Tipografia e densidade
Urbanist com fallback system-ui. Títulos 30–43px, peso 600, tracking discreto negativo. Texto operacional de 13–14px; metadados de 11–12px. Evitar o texto de 8px do CSS histórico. Números claros e ações com rótulo útil.

## Navegação e composição
Navegação superior: Visão geral, Clientes, Entregas, Pipeline, Financeiro, Agenda, Conversas e Relatórios. Rail de ações: busca, novo contato, agenda, exportações e calculadora externa. Notificações no cabeçalho. URL guarda área e registro selecionado para links de busca/notificações.
Em celular: navegação rolável no topo, rail inferior, cards empilhados e quadros com rolagem própria. Não ocultar rolagem de formulários para fazer tabelas caberem.

## Padrões reutilizados
- Modal.tsx: Radix, foco preso, Escape, título e restauração de foco.
- DataState.tsx: carregamento, erro com tentativa e vazio com orientação.
- useRemote.ts: consultas canceláveis, respostas antigas descartadas e atualização após mutações.
- workspace.css: tokens, forms, cabeçalhos, cards, tabelas, quadros, filtros, notificações e impressão.
- Lucide para ícones. Sem uma biblioteca genérica nova.

## Contratos de interação
Quadro/checklist alteram o mesmo registro; seletor fornece alternativa ao arraste. Concluir preserva coluna anterior. Cancelar conversão não envia mutação. Confirmação de contrato é o único momento que cria cobranças e marca ganho. Erros de banco nunca viram dados fictícios.
Feedback de erro em português. Desabilitar ações enquanto salva. Foco visível. Respeitar prefers-reduced-motion. CSV não contém fórmulas executáveis e JSON não contém segredos.

## Preservação
Regras financeiras, conversas e autenticação publicada permanecem existentes. Acesso sem login somente na prévia local autorizada. As telas inspiradas no Tandem/Fernly usam a mesma linguagem visual do Abelha.