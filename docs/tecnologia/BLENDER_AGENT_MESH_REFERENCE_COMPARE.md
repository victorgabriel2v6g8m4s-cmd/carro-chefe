# Especificação de feature — comparação de malha 3D com imagem de referência

**Produto:** Blender Agent (`tools/blender_agent`)
**Status:** implementada na branch `feature/blender-agent-bridge`; validação real Windows + Blender e fixture CookLily ainda pendentes
**Responsabilidade sugerida:** AG-DEV
**Data:** 06/10/2026

> Implementação e comandos atuais: [BLENDER_AGENT_MESH_REFERENCE_COMPARE_USAGE.md](./BLENDER_AGENT_MESH_REFERENCE_COMPARE_USAGE.md). Esta especificação permanece como contrato de comportamento e critérios de aceite; presença do código não substitui o preflight, testes e smoke real exigidos abaixo.

## 1. Objetivo

Adicionar ao Blender Agent uma ferramenta reutilizável que gere, em uma ou duas chamadas, uma imagem 2D de comparação entre uma fotografia/referência e um objeto 3D. A ferramenta deve funcionar com objetos de recipes existentes e com objetos presentes na cena aberta do Blender. Ela não deve exigir edição manual da imagem para cada comparação.

A saída deve poder mostrar:

- imagem de referência como fundo;
- projeção da superfície do objeto com opacidade configurável;
- contorno externo da projeção;
- linhas da geometria/topologia;
- alinhamento automático quando os dados permitem;
- ajuste manual por transformação ou pontos de correspondência quando o automático não for confiável;
- evidência e parâmetros suficientes para repetir a composição.

O caso CookLily PET, foto 19 e recipe `lily-pet-empty-square` v0.13.2 deve servir como fixture de regressão visual, sem codificar lógica exclusiva para garrafas.

## 2. Resultado esperado para quem usa

Fluxo comum em duas chamadas:

```powershell
python -m tools.blender_agent.client status
python -m tools.blender_agent.compare_cli compose `
  --reference ".runtime/blender-agent/references/derived/19-ring-base-aligned.png" `
  --recipe ".runtime/blender-agent/recipes/lily-pet-empty-rounded-photo19-v0.13.2.json" `
  --object "LILY_PET_Bottle_Empty_Rounded_v05" `
  --view FRONT `
  --lines true `
  --border true `
  --opacity 50 `
  --align auto `
  --output ".runtime/blender-agent/exports/cooklily-photo19-v0132.png"
```

Para um objeto já aberto no Blender, a fonte deve poder ser a cena ativa, sem exigir que o usuário gere manualmente outro arquivo de recipe:

```powershell
python -m tools.blender_agent.compare_cli compose `
  --reference "mídias/referencias/objeto-frontal.png" `
  --source scene `
  --object "ObjetoAlvo" `
  --view FRONT `
  --lines true `
  --border true `
  --opacity 50 `
  --align auto
```

Fallback com ajuste manual de enquadramento:

```powershell
python -m tools.blender_agent.compare_cli compose `
  --reference "mídias/referencias/objeto-frontal.png" `
  --source scene `
  --object "ObjetoAlvo" `
  --view FRONT `
  --lines true `
  --border true `
  --opacity 50 `
  --align manual `
  --scale 1.035 `
  --offset-x 12 `
  --offset-y -7 `
  --rotate 0.4 `
  --output ".runtime/blender-agent/exports/objeto-comparacao.png"
```

Valores de deslocamento devem ter unidade declarada e previsível (pixels na imagem final); rotação em graus; escala como fator multiplicador. Para maior precisão, oferecer pontos de correspondência imagem↔projeção, descritos na seção 5.

## 3. Decisões de arquitetura

### 3.1 Composição fora do Blender

A criação de pixels (camadas, transparência, linhas e PNG) deve acontecer fora do processo Blender. Isso mantém a composição determinística e evita usar Python arbitrário dentro da cena. O Blender Agent continua responsável por fornecer uma representação autorizada e limitada da geometria da cena.

Uma recipe pode ser lida localmente pelo processo da CLI porque vértices e faces já são dados declarativos versionados. Para objeto de cena, uma action semântica read-only deve devolver um snapshot de geometria com transformações e metadados. A action não executa código recebido, não salva alterações no `.blend` e não muda seleção, modo ou viewport.

### 3.2 Módulos sugeridos

Manter cada responsabilidade isolada:

```text
tools/blender_agent/
├── compare_cli.py          # argumentos, validação de combinação e saída humana/JSON
├── comparison.py           # orquestra fonte, projeção, alinhamento, camadas e receipt
├── comparison_geometry.py  # normalização de vertices/faces/arestas e projeção 3D→2D
├── comparison_alignment.py # fit automático, anchors e transformação manual
├── comparison_render.py    # composição Pillow e renderização das camadas
├── comparison_receipt.py   # metadados, hashes e anexação ao history
└── tests/
    └── test_comparison_*.py
```

Os nomes são proposta de organização; implementação pode ajustar os arquivos existentes após inspecionar as convenções e evitar duplicação. Não concentrar parser, geometria, alinhamento e rasterização em `client.py` ou `image_cli.py`.

### 3.3 Fontes de geometria

Primeira versão deve aceitar:

1. `--recipe <arquivo.json>`: localizar o componente/step pelo `--object`; extrair mesh `vertices`, `faces` e transformações descritas;
2. `--source scene --object <nome>`: solicitar ao bridge um snapshot read-only do objeto nomeado.

O snapshot deve incluir ao menos:

- nome e tipo do objeto;
- vértices no espaço de objeto ou mundo, com convenção declarada;
- faces como índices para os vértices;
- matriz de transformação aplicada ou indicação clara de que as coordenadas já estão em world space;
- bounds, número de vértices/arestas/faces;
- unidade de cena, quando conhecida;
- hashes estáveis de geometria e transformação;
- avisos para modificadores não avaliados, geometria procedural não resolvida ou dados omitidos.

Definir limites configuráveis e com teto rígido para tamanho do payload, contagens de vértices/faces, resolução de imagem e bytes de saída. Se exceder o limite, falhar com mensagem acionável ou usar export temporário controlado dentro de `.runtime/blender-agent`; nunca truncar silenciosamente a malha.

### 3.4 Dependências

Usar Pillow se já estiver disponível no runtime compatível ou instalar como dependência versionada/isolada seguindo a estratégia atual do projeto. Não adicionar dependência implícita ao Python global. Se faltar Pillow, a CLI deve explicar qual ambiente precisa da dependência e terminar antes de escrever saída parcial.

OpenCV ou outra biblioteca de visão computacional deve ser opcional para a etapa de alinhamento automático; a composição manual básica não pode depender dela. A versão mínima deve poder executar `--align manual` com somente a biblioteca raster configurada.

## 4. Interface de linha de comando

Comando sugerido:

```text
python -m tools.blender_agent.compare_cli compose [opções]
```

### 4.1 Fonte e saída

| Opção | Significado |
|---|---|
| `--reference PATH` | Imagem de referência obrigatória. Extensões e raízes permitidas seguem `BLENDER_AGENT_IMAGES.md`. |
| `--source recipe|scene` | Fonte geométrica. Inferível de `--recipe`, mas preferência é aceitar valor explícito para mensagens previsíveis. |
| `--recipe PATH` | Recipe JSON de origem; obrigatório quando `--source recipe`. |
| `--object NAME` | Componente/objeto exato a projetar; obrigatório e sem seleção implícita ambígua. |
| `--output PATH` | PNG destino; padrão em `.runtime/blender-agent/exports/`. |
| `--view FRONT|RIGHT|TOP|CAMERA` | Plano de projeção. `CAMERA` usa matriz/projeção da câmera e deve ser rejeitada se não houver câmera válida. |
| `--resolution WIDTH HEIGHT` | Resolução final; por padrão igual à referência. |

### 4.2 Aparência

| Opção | Significado |
|---|---|
| `--fill true|false` | Liga/desliga preenchimento da projeção. |
| `--opacity 0..100` | Opacidade percentual do preenchimento. Default sugerido: `50`. |
| `--fill-color R,G,B` | Cor do preenchimento RGB; default neutro de alto contraste. |
| `--lines true|false` | Mostra/esconde topologia. O nome `--lines` deve referir-se às arestas reais das faces. |
| `--line-mode all|visible|silhouette` | Todas as arestas projetadas, só arestas visíveis (se a etapa de oclusão suportar) ou apenas silhueta. Default `all`. |
| `--line-color R,G,B` | Cor das linhas internas. |
| `--line-opacity 0..100` | Opacidade independente das linhas internas. |
| `--line-width PIXELS` | Espessura de linha em pixels, com validação contra zero e valores excessivos. |
| `--border true|false` | Liga/desliga contorno externo da projeção. |
| `--border-color R,G,B` | Cor do contorno externo; independente das linhas internas. |
| `--border-width PIXELS` | Espessura do contorno, default maior que `--line-width`. |
| `--background original|transparent|solid` | Preserva referência, usa transparente ou fundo sólido. `original` é o default. |
| `--show-axes true|false` | Opcional: desenha eixos/escala de projeção numa camada de diagnóstico. |

### 4.3 Alinhamento

| Opção | Significado |
|---|---|
| `--align auto|manual|anchors|none` | Estratégia de alinhamento. `auto` sempre deve retornar score/avisos; não deve fingir confiança. |
| `--scale FLOAT` | Fator de escala da projeção; normalmente override manual multiplicativo. |
| `--offset-x PIXELS` | Translação horizontal da geometria projetada. Positivo move à direita. |
| `--offset-y PIXELS` | Translação vertical em coordenadas de imagem. Positivo move para baixo. |
| `--rotate DEGREES` | Rotação 2D após a projeção, em torno do centro da projeção ou de pivot configurado. |
| `--anchor PROJECTED_X,PROJECTED_Y,IMAGE_X,IMAGE_Y` | Repetível; associa um ponto projetado da malha a um pixel da foto. |
| `--reference-mask PATH` | Máscara opcional da região do objeto na foto, para tornar o fit automático robusto. |
| `--align-report PATH` | Salva transformação escolhida, score, método e incerteza. |
| `--strict-alignment` | Interrompe se o automático ficar abaixo do limiar; não gera resultado enganoso. |

Para compatibilidade com o formato demonstrado pelo proprietário, booleanos podem aceitar `--lines true`/`false` e `--border true`/`false`. Recomenda-se também aliases padrão `--lines` e `--no-lines`, `--border` e `--no-border`, ou documentar uma única forma e mantê-la consistente.

### 4.4 Execução e auditoria

| Opção | Significado |
|---|---|
| `--dry-run` | Valida entradas, fonte, projeção e alinhamento sem gravar PNG. |
| `--json` | Emite resposta estruturada para automação; erros devem manter código de saída não zero. |
| `--no-history` | Desabilita registro do evento somente se política permitir; default deve registrar stage/action. |
| `--force` | Permite substituir uma saída existente; sem isso criar nome único ou falhar com mensagem clara. |

Código de saída `0` significa PNG e receipt válidos. Erros de entrada, ponte, alinhamento estrito, dependência ou gravação precisam de códigos não zero e mensagem que aponte correção possível.

## 5. Alinhamento automático e manual

### 5.1 Projeção e convenções

Projetar primeiro a geometria num plano 2D de forma determinística:

- `FRONT`: X horizontal e Z vertical;
- `RIGHT`: Y horizontal e Z vertical;
- `TOP`: X horizontal e Y vertical;
- `CAMERA`: coordenadas projetivas da câmera ativa, incluindo perspectiva, caso suportada.

Inverter o eixo vertical para pixels (`y=0` no topo). Fazer cálculo em coordenadas de ponto flutuante e arredondar somente na rasterização. A transformação de objeto/mundo e unidades deve ser aplicada exatamente uma vez. Recipe e snapshot da cena precisam normalizar para a mesma convenção.

### 5.2 Auto-fit (assistido, com confiança explícita)

Não prometer alinhamento automático perfeito em fotografias arbitrárias. A qualidade depende da vista, perspectiva, contraste e segmentação do objeto.

Prioridade para estimar alinhamento:

1. máscara explícita `--reference-mask`, se fornecida;
2. imagem de referência com alpha/transparência já isolando o objeto;
3. segmentação simples de primeiro plano para fundos uniformes, com score de confiança;
4. bounding box/contorno aproximado quando segmentação é confiável;
5. se falhar ou score for baixo: produzir diagnóstico sem substituir manualmente o ajuste do usuário; com `--strict-alignment`, falhar antes do PNG final.

O algoritmo pode estimar primeiro translação e escala uniforme a partir dos bounds da silhueta. Rotação automática só deve ser ativada quando houver evidência clara ou anchors suficientes; não deformar eixo X/Y independente como default porque isso distorce a forma física do objeto. Retornar valores estimados, score, método, restrições detectadas e sugestão de flags manuais.

### 5.3 Ajuste por coordenadas

O modo `manual` aplica, em ordem documentada e estável:

1. centralizar no pivot configurado;
2. aplicar rotação;
3. aplicar escala uniforme;
4. deslocar em pixels;
5. rasterizar.

`--offset-x` e `--offset-y` referem-se sempre à imagem final. Isso evita confusão com eixos do Blender. A composição deve devolver a transformação final e incluir no receipt a origem de cada valor (`default`, estimativa automática ou override CLI).

### 5.4 Ajuste por anchors

Aceitar pelo menos dois anchors para estimar uma transformação de similaridade 2D (translação, rotação e escala uniforme). Três ou mais permitem detectar outliers por ajuste robusto (por exemplo, RANSAC) se uma biblioteca compatível estiver disponível. Sem dependência robusta, resolver least squares e reportar resíduo por ponto.

Validar:

- coordenadas finitas;
- ao menos dois anchors distintos;
- escala positiva e dentro de faixa segura;
- resíduo máximo/médio;
- anchors dentro de bounds razoáveis da imagem/projeção.

Não aceitar silentemente anchors colineares/incompatíveis se a transformação ficar indeterminada. Erros devem indicar qual ponto ou condição precisa de ajuste.

## 6. Pipeline da feature

```text
parse CLI
  → validar paths/permissões/dependências
  → obter geometria (recipe ou snapshot read-only do Blender)
  → normalizar mesh/transforms/unidades
  → projetar na vista e calcular bounds
  → obter alinhamento (auto, manual, anchors ou none)
  → compor camadas RGBA sobre a referência
  → validar PNG e metadados
  → salvar saída + receipt
  → anexar PNG/receipt à etapa/history quando habilitado
```

Todos os passos devem ser determinísticos para as mesmas entradas, parâmetros e versões de dependências. A operação é observacional: não edita a malha, materials, câmera, transforms, seleção, workspace ou arquivo `.blend`.

## 7. Layers, linhas e contorno

Separar internamente pelo menos estas camadas:

1. fundo;
2. fill da superfície/silhueta;
3. arestas internas;
4. contorno externo;
5. diagnósticos (anchors, axes, bounds), desligados no resultado final.

Deduplicar arestas compartilhadas entre faces antes de desenhar. Criar contorno externo a partir da projeção/união da silhueta, e não colorir todas as bordas de cada face como se fossem contorno. Se o modo `visible` não puder resolver oclusão de forma confiável, rejeitar esse modo ou marcá-lo como aproximado; não rotular `all` como visível.

Ordenação fixa dos layers: background → fill → internal edges → outer border → optional diagnostics. Cores e espessuras devem ser configuráveis sem alterar o cálculo geométrico.

## 8. Formatos de entrada/saída e segurança

- Aceitar formatos de imagem já autorizados por `assets.py`/`BLENDER_AGENT_IMAGES.md`; respeitar raízes do repositório, runtime e `CC_BLENDER_ASSET_ROOT`.
- Resolver caminhos, bloquear traversal fora das raízes autorizadas e nunca sobrescrever referência de origem.
- Gerar saídas padrão somente em `.runtime/blender-agent/exports/`.
- Não gravar dados de geometria inteiros repetidamente em auto-history; registrar resumo, contagens, hashes e caminhos dos anexos.
- Limitar resolução de entrada/saída e tamanho do JSON/mesh para evitar consumo sem controle de memória.
- Rejeitar PNG de saída acima do limite estabelecido antes de anexar ao history.
- Não incluir dados pessoais, segredos ou caminhos além do necessário no receipt compartilhável.
- A action do bridge deve permanecer read-only e loopback-only. Não criar ação `eval`, `exec` ou leitura irrestrita de disco.

## 9. Receipt e reprodutibilidade

Para cada saída, gravar receipt JSON pareado, por exemplo:

```text
.runtime/blender-agent/exports/objeto-comparacao.png
.runtime/blender-agent/exports/objeto-comparacao.receipt.json
```

Receipt deve conter:

- versão do schema/feature e do Blender Agent;
- fonte (`recipe`/`scene`), caminho permitido e nome do objeto;
- hash da recipe ou hash de geometria/transforms;
- hash da imagem de referência e, se houver, da máscara;
- dimensões da entrada e saída;
- vista e convenção de projeção;
- contagens de vertices/faces/arestas e flags de modificadores avaliados;
- alinhamento solicitado e aplicado, método, confiança, parâmetros, anchors e resíduos;
- opções de fill/lines/border, cores, opacity e widths;
- dependências relevantes e suas versões;
- caminho, dimensões e SHA-256 da saída;
- stage/history id e avisos/erros não fatais.

Hashes não substituem as imagens nem indicam aprovação visual do produto. O receipt deve registrar que a imagem é uma visualização comparativa e não uma medição metrológica.

## 10. Integração com o Blender Agent

### CLI

Adicionar um `compare_cli.py` separado e manter o comando de comparação desacoplado dos comandos de textura/referência existentes em `image_cli.py`. Reutilizar validadores de caminho e chamada do bridge onde apropriado, sem duplicar segurança.

### Bridge/RPC

Adicionar uma action read-only tipada, nome provisório `mesh.comparison_snapshot`, exposta por allowlist. Requisitos:

- recebe nome de um único objeto, sistema de coordenadas e política explícita para modifiers;
- apenas dados de tipo MESH na primeira versão;
- não confiar em seleção atual, usar nome exato;
- não modificar estado da cena;
- retornar metadados + mesh dentro dos limites;
- indicar falhas de geometria procedural/modifiers em vez de gerar snapshot incompleto sem aviso;
- action incluída em schema/action docs e auditoria automática.

### MCP

Expor uma tool de alto nível `blender_mesh_reference_compare` apenas se a experiência pedir execução direta pelo agente. Ela deve chamar o mesmo serviço da CLI/pipeline e devolver a imagem como content block de imagem, junto do receipt resumido. Evitar manter implementação paralela no MCP.

## 11. Erros e recuperação

Mensagens de erro devem incluir situação, dado afetado e próxima ação recomendada.

| Situação | Comportamento esperado |
|---|---|
| Blender/bridge indisponível no modo `scene` | Não criar PNG; instruir `client status` e inicialização local. Recipe source continua utilizável sem Blender. |
| Objeto inexistente/ambíguo | Falhar e listar nomes correspondentes, sem escolher outro por conta própria. |
| Tipo não suportado | Informar tipo recebido e suporte inicial para MESH. |
| Caminho bloqueado/inexistente | Usar política comum de paths e informar raiz permitida/como autorizar `CC_BLENDER_ASSET_ROOT`. |
| Sem faces ou índices inválidos | Parar antes de composição e indicar integridade da geometria. |
| Imagem sem máscara e auto-fit inconclusivo | Retornar diagnóstico/score baixo, sugerir anchors/offsets; com strict, saída não é finalizada. |
| Anchor degenerado | Nomear erro de condição, sem usar transformação anterior ou default silenciosamente. |
| Dependência de raster ausente | Instruir instalação no runtime isolado suportado; não usar Python global nem alterar Blender. |
| Tamanho excede limites | Reportar contagem/limite e sugerir reduzir resolução ou preparar export controlado; nunca truncar. |
| Falha ao gravar saída | Escrever temporariamente e renomear atomicamente após validação; limpar apenas o temporário pertencente à execução atual. |
| PNG salvo mas receipt falha | Marcar execução como incompleta e preservar arquivo, reportando caminho e falha de auditoria; não dizer sucesso completo. |

Se comparação acontecer durante operação no Blender, capturar contexto antes e depois e confirmar que workspace, modo, objeto ativo, seleção e transforms não foram alterados.

## 12. Plano de implementação

### Fase A — contrato e base de composição

1. Fechar schema de opções/receipt e erros.
2. Implementar fonte recipe e a rasterização Pillow, sem necessidade de bridge.
3. Adicionar testes unitários de projeção, opacidade, deduplicação de arestas, contorno e saída.
4. Validar fixture de regressão CookLily v0.13.2.

### Fase B — fonte de objeto da cena

1. Implementar e allowlistar `mesh.comparison_snapshot` read-only.
2. Adicionar integração CLI `--source scene` com consulta por nome exato.
3. Validar ausência de mutação no estado Blender e limites de payload.
4. Adicionar testes de action/protocolo e smoke test local no Blender suportado.

### Fase C — alinhamento

1. Implementar transformação `manual` e `none` primeiro.
2. Implementar anchors com resíduos e testes de geometria degenerada.
3. Implementar auto-fit somente para casos com máscara/alpha/silhueta confiáveis.
4. Medir confiança e ativar `--strict-alignment`.
5. Documentar limites com fotos em perspectiva e objetos parcialmente ocluídos.

### Fase D — ergonomia e integração

1. Expor MCP de alto nível reutilizando o pipeline, caso necessário.
2. Anexar saída/receipt ao auto-history.
3. Criar exemplos curtos para recipe e cena ativa.
4. Comparar UI/legibilidade no Windows e confirmar abertura do arquivo final.

## 13. Testes e critérios de aceite

Testes unitários devem cobrir:

- vistas FRONT/RIGHT/TOP e troca de eixo vertical;
- transform de objeto aplicada uma vez e somente uma vez;
- recipe válida/inválida e objeto inexistente;
- bounds degenerados, malha vazia e face com índice inválido;
- deduplicação de arestas em mesh quad/triângulo;
- opacidade 0, 50 e 100;
- liga/desliga independente de linhas e contorno;
- cores, largura, resolução e formatos inválidos;
- align manual com escala/offset/rotação reproduzível;
- anchors válidos, insuficientes, duplicados, não finitos e colineares;
- confiança baixa de auto-fit e modo strict;
- paths permitidos e bloqueados;
- falha de escrita sem corromper arquivo anterior;
- receipt e hashes;
- CLI JSON e códigos de saída.

Smoke/integration tests devem cobrir:

- recipe CookLily v0.13.2 gera PNG alinhado, com fill 50%, linhas e contorno;
- `--source scene` lê objeto por nome e deixa cena/workspace/seleção intactos;
- modo manual consegue corrigir propositalmente um desalinhamento introduzido no fixture;
- receipt contém hashes, origem, transformação e opções usadas;
- histórico recebe anexos sem payload de malha gigante;
- comparação consegue abrir no visualizador e possui as dimensões declaradas.

Critérios para declarar pronto:

1. Uma chamada `compose` gera uma comparação utilizável com defaults seguros, quando entrada alinhada permitir.
2. O usuário consegue corrigir escala, posição e rotação em CLI sem editar geometria.
3. O usuário consegue informar anchors da foto e da projeção para resolver alinhamento com precisão maior.
4. A saída deixa clara a diferença entre auto-fit de baixa confiança e alinhamento aceito.
5. `--opacity 50`, `--lines true` e `--border true` funcionam conforme documentado.
6. A mesma execução é reproduzível a partir do receipt e entradas sem mudar a cena.
7. Dados excedendo limites, paths proibidos e falhas de bridge resultam em erro explicativo e não deixam artefato parcial declarado como concluído.
8. Suite proporcional executada: testes Python da camada, check/build raiz se o diff afetar código, e smoke real no Blender para a action de cena.

## 14. Fora do escopo da primeira versão

- alterar ou aprovar a modelagem com base automática na comparação;
- editar/salvar o `.blend` ou dar snap do objeto à foto;
- reconstrução 3D a partir de múltiplas fotografias;
- inferir perspectiva de câmera arbitrária sem dados da câmera;
- segmentação semântica perfeita de qualquer fotografia;
- linhas ocultas com renderização física, espessura/material e transparência volumétrica;
- avaliação automática de qualidade ou aprovação do proprietário;
- objetos não mesh, Geometry Nodes não avaliados e assets com milhares de componentes sem seleção explícita.

## 15. Limitações a comunicar ao usuário

“Qualquer objeto” significa qualquer objeto suportado que possa ser convertido em uma malha finita e projetada numa vista compatível. Não garante alinhamento automático perfeito em qualquer foto. A ferramenta deve oferecer controle manual preciso e revelar sua incerteza quando a referência tiver perspectiva, oclusão, fundo complexo ou orientação incompatível. A imagem é auxílio visual à edição; medidas dimensionais continuam dependendo de escala conhecida e calibração explícita.

## 16. Arquivos candidatos afetados na implementação

Esta lista é indicativa; confirme os contratos locais antes de alterar:

- `tools/blender_agent/compare_cli.py` (novo);
- `tools/blender_agent/comparison.py` e módulos especializados (novos);
- camada de actions/allowlist e protocolo para `mesh.comparison_snapshot`;
- `tools/blender_agent/mcp_server_v05.py` para tool opcional;
- `tools/blender_agent/tests/` para testes unitários/integration;
- `tools/blender_agent/README.md` e `docs/tecnologia/BLENDER_AGENT_IMAGES.md`;
- `docs/tecnologia/BLENDER_AGENT_CONTEXT.md` para receipt/history, se houver nova convenção.

Antes da implementação de código, executar o policy preflight exigido pela raiz para AG-DEV e a região Blender Agent; revisar se já há utilitários de path, image capture, history e receipt reaproveitáveis. Esta especificação não substitui o preflight nem a validação local da feature.
