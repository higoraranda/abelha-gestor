# Abelha | Calculadora de valores

## Fluxo local
- Proprietário: CRM → Calculadora de valores. O atalho externo da calculadora original segue disponível, sem alterações.
- Convidado: Calculadora de valores na área autenticada própria, sem CRM. A API resolve organização e usuário a partir da sessão, nunca a partir de campos do JSON.
- Crie ou edite modelos diretamente. Para importar, baixe o exemplo fictício ou copie o prompt, use um agente à sua escolha e volte com o JSON. A prévia não grava. Salve explicitamente para criar um novo modelo. Exporte um modelo quando quiser reutilizá-lo; o arquivo contém as regras e os valores configurados, mas não inclui clientes ou credenciais do Abelha.

## Contrato v1
`version` 1, nome (1–80 caracteres), preço de base e mensalidade de base em centavos, desconto em pontos-base e até 30 itens. Cada item tem identificador único, nome, preço em centavos, unidade fixa / unitária / hora e frequência única / mensal. Em uma simulação, quantidade é codificada em milésimos: valor fixo 0 ou 1000, unidades em múltiplos de 1000, horas até três casas decimais. Valores ausentes na simulação contam como zero. Arredonda por linha para o centavo mais próximo, aplica desconto ao subtotal único e mostra recorrência separada. JSON é validado no servidor: não executa código ou fórmulas livres e não cria cobranças, contratos ou propostas externas.

Os modelos são privados por organização e usuário, com limite de 100 por conta e revisão para evitar sobrescrita entre sessões. A calculadora requer login real; a navegação local sem sessão não substitui autenticação.

## Verificação e próximo gate
Suíte local: 70 testes no backend, 46 no frontend, lint, build e verificação de diff aprovados. A fixture HTTP usa proprietário e dois convidados com autenticação real e PGlite descartável: cobre prévia sem persistência, leitura e edição isoladas, revisão obsoleta e acesso anônimo negado. A UI foi compilada, mas o fluxo visual no navegador ainda precisa ser validado. A migration aditiva `20261125_quote_models.sql` usa o par de chaves da migration Personal já existente e depende da fase de contas autenticadas para o uso. Aplicar somente em ambiente autorizado após revisão e confirmação do alvo. Sem commit, stage, push, publicação ou escrita remota.
