# Catálogo operacional de ferramentas

Este diretório é o índice canônico das ferramentas disponíveis para executar trabalho no Carro Chefe. Antes de iniciar uma tarefa, agentes e pessoas devem consultar este catálogo e preferir uma ferramenta existente e adequada a refazer manualmente uma capacidade já disponível.

## Categorias

| Categoria | Documento | O que cobre |
|---|---|---|
| GitHub | [GITHUB.md](./GITHUB.md) | repositório, branches, PRs, CI, segurança e colaboração |
| Agentes | [AGENTES.md](./AGENTES.md) | papéis especializados e limites dos agentes do projeto |
| Skills | [SKILLS.md](./SKILLS.md) | capacidades nativas acionáveis no ambiente de IA |
| Plugins | [PLUGINS.md](./PLUGINS.md) | conectores instalados e integrações opcionais relevantes |
| Ferramentas próprias | [PROPRIAS.md](./PROPRIAS.md) | apps, scripts e utilitários mantidos neste repositório |
| Ferramentas externas | [EXTERNAS.md](./EXTERNAS.md) | software e serviços de terceiros usados pelo projeto |
| Estado automático | [STATUS_AUTOMATICO.md](./STATUS_AUTOMATICO.md) | verificação gerada das ferramentas próprias |
| Pendências | [PENDENCIAS.md](./PENDENCIAS.md) | ferramentas/capacidades necessárias que ainda não existem |
| Bloqueios | [BLOQUEIOS.md](./BLOQUEIOS.md) | impedimentos de acesso, permissão, plataforma, cota ou recurso |

## Protocolo obrigatório: tool-first

Para **cada tarefa**:

1. identifique a entrega e as restrições;
2. consulte este índice, o documento da categoria relevante e `STATUS_AUTOMATICO.md` quando houver ferramenta própria envolvida;
3. compare as opções por capacidade, evidência de funcionamento, custo/consumo, limitações, acesso e risco;
4. selecione a ferramenta ou combinação de ferramentas com melhor adequação — não a de maior score de forma cega;
5. prefira reutilizar a ferramenta escolhida a implementar manualmente a mesma capacidade;
6. se a capacidade necessária não existir, registre o planejamento em `PENDENCIAS.md` antes de improvisar uma solução recorrente;
7. se acesso, permissão, cota, ambiente, dependência, credencial, hardware ou qualquer outro recurso impedir a execução, registre o bloqueio em `BLOQUEIOS.md`, com impacto e ação necessária;
8. ao alterar ferramenta própria, atualize seu registro e execute `npm run tools:status` além dos testes proporcionais da ferramenta.

A seleção nunca amplia permissões do agente. Regras de segurança, especialização, aprovação humana e fontes oficiais continuam prevalecendo.

## Estados padronizados

- **planejada**: necessidade aceita/documentada, sem implementação utilizável;
- **em desenvolvimento**: existe implementação utilizável ou parcial, mas faltam critérios de pronto, testes ou cobertura relevante;
- **completa**: critérios de pronto documentados atendidos; ainda depende de verificação contínua;
- **verificada**: teste automatizado aplicável passou na execução registrada;
- **falhando**: teste automatizado aplicável retornou falha;
- **não testada nesta plataforma**: a ferramenta exige outro SO/ambiente; não significa falha;
- **N/D**: informação não é exposta ou não pode ser medida com confiabilidade.

Maturidade e saúde são dimensões diferentes: uma ferramenta pode ser `completa` e temporariamente `falhando`.

## Modelo de custo

O catálogo usa duas estimativas distintas:

- **Processamento**: `muito baixo`, `baixo`, `médio`, `alto` ou `muito alto`, considerando CPU, memória, I/O, duração típica, rede e quantidade de etapas.
- **Impacto na cota do Work**: `nenhum`, `baixo`, `médio`, `alto` ou `N/D`. É uma heurística interna de comparação, **não** uma unidade oficial de plano. Quando o produto não expõe consumo mensurável por ferramenta, o valor numérico deve permanecer `N/D`.

Não invente preço, tokens, créditos, minutos de Work ou qualquer unidade de cota não fornecida oficialmente pelo runtime/serviço. Custos financeiros de terceiros devem ser registrados apenas quando houver fonte e plano/contrato conhecidos.

## Score de seleção

O score é um indicador de 0 a 100 para triagem, não uma autorização automática. Cada eixo recebe nota de 1 a 5, onde 5 é melhor:

- **Cobertura de capacidade — 30%**: quanto da tarefa a ferramenta resolve com qualidade;
- **Confiabilidade/evidência — 25%**: testes, CI, rastreabilidade e maturidade;
- **Eficiência de processamento — 15%**: menor custo computacional recebe nota maior;
- **Eficiência de Work — 15%**: menor impacto estimado na cota recebe nota maior; `N/D` usa nota neutra 3 e baixa confiança;
- **Fricção/limitações — 15%**: acesso simples, poucas restrições e menor risco recebem nota maior.

Fórmula: `score = round(20 × (0,30C + 0,25R + 0,15P + 0,15W + 0,15L))`.

Scores documentados são referências para casos de uso típicos. O agente deve recalibrar mentalmente a escolha quando a tarefa tiver requisito eliminatório, como Windows obrigatório, dado privado em um conector específico ou necessidade de edição visual.

## Manutenção

- Ferramentas próprias: fonte de inventário e testes em `tools/tool-health/catalog.json` e `tools/tool-health/`.
- Plugins: o estado de instalação depende da conta e muda ao longo do tempo; registre a data da observação e confirme novamente antes de uso crítico.
- Skills/produto de IA: capacidades podem evoluir; descreva funções estáveis e evite prometer cotas não publicadas.
- Ferramentas externas: confirme versão/contrato quando isso puder mudar o resultado.
- Todo item novo precisa de owner, capacidades, limitações, dependências, custo relativo, evidência, status e score.

Última revisão estrutural: 2026-09-15.