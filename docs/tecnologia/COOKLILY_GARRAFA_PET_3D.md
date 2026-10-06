# Garrafa PET CookLily — produção 3D

**Atualizado:** 06/10/2026  
**Responsável pela produção:** AG-MIDIAS  
**Status:** revisão geométrica v0.3 executada e disponível para conferência; não aprovada para publicação nem produção gráfica. A execução final teve 21 etapas aprovadas, 0 falhas e 3 capturas de validação.

## Resultado atual — revisão v0.3

A geometria foi atualizada com as medidas informadas pelo proprietário: corpo principal quadrado de 125 mm; ombro de 23 mm; pescoço liso de Ø22 × 7 mm; tampa de 11 mm; lacre separado de 4 mm; altura total nominal de 170 mm. A tampa tem corpo Ø29 mm na base e Ø28 mm no topo, com 29 estrias longitudinais uniformes; cada estria foi interpretada como 1 mm de largura tangencial, sem relevo no topo e chegando a 0,5 mm de relevo radial junto à base. Um anel de base de 1 mm axial e 0,5 mm radial envolve as estrias. Por essa saliência, o diâmetro externo máximo do anel da tampa resulta em 30 mm; confirmar se os Ø28/29 mm medidos já incluem o anel.

A argola do gargalo é um objeto independente de Ø34 mm, posicionada imediatamente abaixo do lacre. Sua altura axial não foi especificada e foi modelada provisoriamente com 1 mm. O corpo permanece oco e sem conteúdo. A etiqueta segue como objeto separado de 40 × 80 mm, vertical, aguardando vínculo com a arte original.

**Render frontal v0.3:** `.runtime/blender-agent/renders/2026-10-06_cooklily-pet-empty_square_v03-front.png`  
**Exportação preliminar v0.3:** `.runtime/blender-agent/exports/2026-10-06_cooklily-pet-empty_square_v03_review.glb`  
**Recipe v0.3:** `.runtime/blender-agent/recipes/lily-pet-empty-square-v0.3.json`  
**Receipt final:** `.runtime/blender-agent/history/20261006T003736Z-Recipe-lily-pet-empty-square-0.3.0/attachments/recipe-lily-pet-empty-square-0.3.0-1791247056559073700-receipt.json` (21 etapas, 0 falhas, 3 capturas; hash da recipe `bfe52e7915b9950a7a1547a0d30ff52596dc4d20a67267f41d55ea5f3d77b7eb`; hash do receipt `df7843221253338cc74bc25a39b913bff58fb5e095380db73722b9378ca43e17`).

Na comparação frontal, a câmera de produto foi recriada com as mesmas configurações registradas: alvo z=85 mm, distância 540 mm, azimute -90°, elevação 5°; o corpo mantém painel frontal plano para a etiqueta. O render ainda mostra material PET opaco e uma etiqueta magenta lisa de revisão, não a arte final. A geometria quadrada e as transições dos relevos devem ser avaliadas também na captura lateral e de três quartos, porque a frente esconde parte dos relevos.

A receita v0.3 representa a sequência das saliências confirmada anteriormente (de cima para baixo: 3 para fora, 4 para dentro, 2 para fora), além da nova cota de 11 mm entre as saliências internas. A medida foi aplicada ao passo vertical do grupo interno; diferenças de forma do molde ainda são aproximações em malha procedural.

## Resultado anterior — v0.1 (supersedido)

Foi criado no Blender um blockout de uma garrafa PET CookLily **sem conteúdo**, com tampa e suporte curvo de etiqueta em objetos independentes. A geometria da garrafa é um casco oco; não foi criado líquido, polpa ou qualquer outro objeto de conteúdo. A receita do Blender Agent executou 14 etapas, passou os critérios automáticos e produziu três capturas de validação. O resultado ainda não é final: a etiqueta está sem a arte real, as dimensões interpretadas precisam de confirmação, e o plástico renderizado aparece opaco.

**Render de revisão:** `.runtime/blender-agent/renders/2026-10-05_cooklily-pet-empty_blockout_v01_review-final.png`  
**Exportação preliminar:** `.runtime/blender-agent/exports/2026-10-05_cooklily-pet-empty_blockout_v01_review.glb`  
**Receita:** `.runtime/blender-agent/recipes/lily-pet-empty-v0.1.json`  
**Receipt da execução:** `.runtime/blender-agent/history/20261005T232724Z-Recipe-lily-pet-empty-0.1.0/attachments/recipe-lily-pet-empty-0.1.0-1791242844224497200-receipt.json`

Esses arquivos permanecem em `.runtime/` e são produtos de trabalho locais. O `.blend` recuperável definitivo é criado no fechamento seguro descrito ao final deste registro.

## Fontes e leitura das referências

As referências abaixo foram fornecidas pelo proprietário em 05/10/2026, na pasta `C:\Users\valdi\OneDrive\Área de Trabalho\c.f_mídias\lilyacai\3D`. Originais não foram alterados. A inspeção visual foi feita antes de modelar. Os hashes SHA-256 estão no [catálogo de referências](../../mídias/produtos/cooklily/3D_REFERENCIAS.json). As fotos mostram a garrafa com conteúdo, então foram usadas apenas para inferir o exterior, nunca para adicionar conteúdo à cena.

| Arquivos | Leitura objetiva | Uso / limitação |
|---|---|---|
| 1, 2, 3, 7, 8, 9 | vistas frontais e oblíquas da garrafa, tampa, ombros, corpo e ranhuras | Perfil externo aproximado; perspectiva, conteúdo e iluminação distorcem a leitura de transparência e medidas. |
| 10, 11, 12, 13 | vistas próximas da tampa, ombro e rótulo | Referência para tampa estriada, pescoço, ombro e posição da etiqueta; a imagem não dá a planificação da arte. |
| 5 | vista superior | Referência para formato circular da tampa; perspectiva inclinada. |
| 14, 16, 18 | vistas inferiores e detalhes da base | Indicam fundo côncavo e apoio periférico; não definem com precisão o número e a forma das pétalas da base PET. |
| dimensões.jpeg | croqui manuscrito com cotas | Fonte de hipóteses dimensionais; partes da escrita estão ilegíveis nesta fotografia. |

Não foi localizada uma arte original aberta da etiqueta nas pastas verificadas do acervo Lily. A fotografia de uma etiqueta curva não permite recuperar a arte com fidelidade. Não foi criada nem baixada uma arte substituta; o objeto de etiqueta é apenas uma faixa roxa lisa independente. A cópia/derivado de referência não substitui a fonte original e direitos de uso da arte precisam permanecer documentados pelo proprietário.

## Dimensões confirmadas e ainda pendentes

**Confirmado pelo proprietário em 06/10/2026:** corpo principal 125 mm; corpo quadrado; etiqueta separada 40 × 80 mm; tampa exterior Ø28 mm no topo e aproximadamente Ø29 mm embaixo; tampa 11 mm de altura; 29 estrias de 1 mm uniformes; pescoço liso Ø22 × 7 mm; argola sob o lacre Ø34 mm; espaçamento de 11 mm entre as saliências para dentro; lacre separado da tampa. A altura total anterior de 170 mm é mantida como referência. A arte indicada serve para 300 ml e 500 ml.

**Implementado v0.3:** seção reta de 125 mm e corpo externo aproximado de 49,6 × 49,75 mm; ombro até z=148 mm (23 mm); pescoço Ø22 mm de z=148 a155 mm; argola separada Ø34 mm de z=154 a155 mm (1 mm axial provisório); lacre de z=155 a159 mm (4 mm); tampa de z=159 a170 mm (11 mm). A banda de base da tampa mede 1 mm axial e se projeta 0,5 mm radialmente; portanto seu diâmetro externo fica em 30 mm quando somada ao corpo da tampa Ø29 mm. O formato das estrias usa 1 mm como largura ao longo da circunferência e distribui 29 centros igualmente em 360°.

**A confirmar, sem bloquear a modelagem:** (1) altura axial real da argola Ø34 mm; (2) se a saliência radial de 0,5 mm da banda da tampa deve elevar o diâmetro total para 30 mm ou se Ø29 mm já é a medida incluindo a banda; (3) se “1 mm cada” nas estrias significa largura tangencial; (4) altura do aro inferior da tampa e perfil de ponta das estrias; (5) geometria exata da base/pétalas e rosca; (6) posição vertical exata da etiqueta. A altura da argola e a interpretação tangencial foram escolhas provisórias documentadas, não medidas confirmadas.

### Hipóteses antigas v0.1 — somente histórico

O croqui original foi inicialmente interpretado como altura principal 123 mm, mas o proprietário corrigiu para 125 mm. A tampa e o lacre eram tratados como uma peça; isso foi corrigido na v0.2. A antiga peça redonda de 50,14 × 50,14 × 149,2 mm não deve mais ser usada.

O adesivo de 40 × 80 mm substitui a faixa placeholder de 115 × 45 mm. A textura da arte indicada ainda não está aplicada; não tratar o material roxo de revisão como arte da marca nem usar para impressão.

## Decisão de modelagem

**Problema:** o primeiro blockout não correspondia à seção quadrada da embalagem, mostrava poucos relevos, não separava o lacre, e usava medidas incorretas para o adesivo.  
**Decisão:** substituir a peça redonda por perfil quadrado oco; 125 mm de corpo principal; nove relevos na ordem informada; tampa e lacre em malhas independentes; carrier de adesivo 40 × 80 mm.  
**Motivo:** correção explícita do proprietário, fotos e croqui.  
**Impacto:** silhueta v0.2 aproxima-se melhor das evidências; shader PET e aplicação da arte continuam sem suporte na recipe atual.  
**Alternativa considerada:** manter a forma redonda do blockout inicial; rejeitada por incompatibilidade com a seção quadrada observada e confirmada.  
**Owner das confirmações dimensionais/arte:** proprietário; modelagem e comparação: AG-MIDIAS; action de imagem-textura, caso necessária no bridge: AG-DEV.  
**Evidência:** recipe, receipt, PNGs e GLB acima; catálogo JSON com hashes.

## O que foi implementado

- Casco oco de PET em malha de revolução com espessura aproximada de 0,5 mm; nenhum conteúdo interno.
- Perfil externo com corpo cilíndrico suavemente ondulado por gomos/ribs procedurais e ombros inclinados.
- Base circular côncava aproximada por perfil radial; não é a geometria real de pétalas do molde.
- Tampa verde independente, cilíndrica, com estrias aproximadas; pescoço/acabamento simplificado.
- Objeto separado `LILY_Label_Separate_Placeholder`, formato curvo ao redor do corpo, roxo liso e sem texto/código inventado.
- Câmera e três vistas de inspeção (frente, lateral, três quartos).
- Exportação preliminar GLB e render PNG de revisão.

Os itens acima descrevem o v0.1. A revisão atual v0.3 substitui a malha do corpo pela `LILY_PET_Bottle_Empty_Square_v03` e contém `LILY_PET_Neck_Flange_34mm`, `LILY_PET_Cap_Green`, `LILY_PET_Tamper_Seal_Separate` e `LILY_Label_Adhesive_40x80`.

## O que foi reutilizado e de onde veio

- Fotos e croqui do proprietário: referências visuais externas ao repositório; originais preservados; hashes no catálogo.
- Blender 5.2 LTS e Blender Agent existente em `tools/blender_agent/`: bridge, ações allowlisted, recipe runner, checkpoints, validação, capturas e export GLB foram reutilizados. Não houve alteração de código nem instalação de dependências nesta etapa.
- Receita nova `lily-pet-empty` v0.1.0. SHA-256 registrado no receipt: `4bda901792e875a93a09b811735ad7af0eba39bccb724f2def6e23e6c6dc3053`.
- Recipe v0.2.0 `lily-pet-empty-square`, criada após correção explícita do proprietário. Hash do receipt: `25c97ffb894aa7a02033e38ed4d600ba0e042570e173cf5e6066a733f2f4676f`. O hash do arquivo recipe mudou ao alinhar o nome do render à data de execução; esse arquivo é o contrato atual.
- Receita v0.2 refeita após ajustar o azimute da câmera, limpar nomes, conformar o adesivo e achatar o painel frontal. O receipt atual é o indicado no início. O material magenta visto no render é somente placeholder e não corresponde à arte CookLily.
- Arte original CookLily em PNG fornecida pelo proprietário; não foi alterada. O bridge não tem suporte a image texture, portanto ela não está vinculada ao material do adesivo na cena.
- Nenhum modelo baixado da internet, tutorial externo ou ativo de terceiros foi incorporado.

## Dependências e capacidade

| Capacidade | Estado observado | Próximo uso |
|---|---|---|
| Blender Agent / bridge local | disponível; execução real de recipe concluída | refinamento geométrico e render. |
| Ações `object.add_mesh`, materiais simples, câmera, render e GLB | disponíveis nesta execução | geometria paramétrica, preview e entrega web. |
| Capturas de validação em FRONT, RIGHT e THREE_QUARTER | três geradas, sem falhas registradas | revisar perfil após corrigir dimensões. |
| Material PET opticamente transparente e parede fina | não validado; material da recipe é cor base Principled simplificada e saiu opaco | desenvolver/testar shader/transmissão e espessura em render, preservando opção leve para web. |
| Carregamento UV/arte em etiqueta | não disponível nas actions atuais do bridge; objeto/carrier está separado em 40 × 80 mm | AG-DEV pode adicionar ação allowlisted de imagem-textura ou a imagem pode ser conectada em UI Blender; usar o PNG original, sem redesenhar. |
| Imagens de referência dentro da cena Blender | não disponível nas actions atuais; comparação visual foi externa ao `.blend` | adicionar ação de imagem de referência ou fazer calibração via UI; reutilizar câmera v0.2 fixa nas revisões. |
| Export GLB | concluído tecnicamente | rever se export inclui apenas produto (a exportação atual usou `selection_only=false`, portanto inclui câmeras e luzes da cena). |

Nenhuma dependência nova foi instalada. A disponibilidade de add-ons para UV, pintura, baking ou simulação não foi necessária para o blockout e ainda não foi auditada como dependência de produção.

## Registro de execução, falhas e correções

1. Preflight de política solicitado no AGENTS.md (`npm run policy:preflight -- --agent AG-MIDIAS --scope mídias`) não passou porque o manifesto/configuração de política está ausente ou desatualizado. Nenhum código foi alterado; a tarefa 3D prosseguiu dentro da especialidade de mídias.
2. Validação da recipe local passou. A execução no Blender Agent terminou `passed`, 14 de 14 etapas, critérios automáticos satisfeitos, 0 etapas com falha e 3 capturas.
3. A primeira iluminação da recipe posicionou a luz muito perto do produto e estourou os materiais. O evento foi corrigido manualmente na cena: fonte reposicionada para uma distância de estúdio e nova imagem de revisão renderizada. A recipe continua guardando o posicionamento inicial e precisa receber esse ajuste antes da próxima execução reproduzível.
4. A nova luz tornou a leitura da silhueta melhor, mas a malha ainda aparece cinza/opaca. Isso é uma limitação de material/iluminação e não comprova comportamento transparente realista de PET.
5. O export GLB atual inclui a câmera de cena, luzes e câmera de inspeção, porque a recipe exportou a cena toda. Antes de entregar a versão web final, exportar somente os objetos de produto ou criar uma coleção de produto e validar os objetos no GLB.
6. A verificação automática foi estrutural/operacional; a aceitação visual final e fidelidade às cotas seguem pendentes do proprietário.
7. Na v0.2, a câmera de render inicialmente apontou para a lateral (azimute 0°). A inspeção do render revelou que o adesivo aparecia de perfil; o azimute foi corrigido para -90° e um novo render frontal foi gerado. O enquadramento frontal correto está no `..._v02-front.png`; a recipe v0.2 deve ser alinhada a esse azimute na próxima revisão reproduzível.
8. A primeira tentativa de validação local da recipe v0.2 apontou ausência de checkpoint antes de ação destrutiva. `checkpoint_before` foi adicionado às remoções e a validação/execução passou. Nenhum dado de modelo foi perdido; um checkpoint anterior já havia sido feito.
9. Uma execução intermediária reteve meshes `.001` sobrepostos. A lista de cena identificou três duplicatas; foi criado checkpoint, removidas as cópias, e o render frontal foi refeito. A execução mais recente da recipe passou com 19 etapas, nenhuma falha e três capturas. A cena final contém uma única instância dos quatro meshes do produto.

## Roadmap da peça

1. **R0 — blockout redondo v0.1 (supersedido):** preservado como histórico local, não usar como modelo atual.
2. **R1 — correção quadrada v0.2 (supersedido):** consolidou 125 mm, ordem 3/4/2, tampa e lacre separados e etiqueta 40 × 80 mm. A tampa foi inicialmente modelada alta demais.
3. **R2 — medidas revisadas v0.3 (executado para revisão):** tampa 11 mm, 29 estrias, pescoço Ø22 × 7 mm, argola Ø34 mm, lacre de 4 mm e distância 11 mm entre saliências internas. Câmera frontal comparável preservada.
4. **R3 — etiqueta fiel (arte recebida, vínculo pendente):** a arte original foi fornecida; aplicar PNG como textura no objeto separado sem alterar o arquivo-fonte. Bloqueio atual: falta ação de image texture no bridge/recipe.
5. **R4 — materiais (pendente):** validar PET transparente vazio, variação de espessura/refração e cor verde da tampa; comparar render de produto com referência fotográfica sob iluminação neutra.
6. **R5 — versões conforme uso (planejado):** super leve para web (malha reduzida, textura otimizada e GLB sem cena); completa leve (gomos/base/tampa e etiqueta fiel); completa (detalhes de gargalo, rosca, anel de segurança e base); ultra somente se campanha/render cinematográfico justificar custo de geometria, textura e tempo.
7. **R6 — validação e liberação (pendente):** revisão visual, conferência de cotas, nomes de objetos, UVs, escala/unidades, arquivo editável e formatos de entrega. Publicação/uso comercial depende de aprovação da Marca e autorização de ativos.

## Perguntas pendentes ao proprietário

1. Qual é a altura axial real da argola do gargalo Ø34 mm? Foi usada provisoriamente 1 mm; esta dúvida não bloqueia a modelagem.
2. A medida Ø29 mm na base da tampa inclui a banda saliente de 0,5 mm? Na interpretação atual, o corpo tem Ø29 mm e a banda atinge Ø30 mm externo.
3. “29 tracinhos de 1 mm” indica largura tangencial de cada estria? Foi assim interpretado; a distribuição ficou uniforme em 360°.
4. A banda inferior da tampa deve ter 1 mm de altura axial? Foi interpretada assim.
5. A geometria exata da base (número/forma de pétalas e concavidade) continua provisória porque as fotos são oblíquas e não permitem medir o fundo perpendicularmente. Nenhuma dessas dúvidas bloqueou a revisão.

As perguntas foram enviadas também como pedido assíncrono ao proprietário para permitir correção sem interromper o blockout. Recortes da folha de medidas estão em `.runtime/blender-agent/references/dim-top-left.png`, `.runtime/blender-agent/references/dim-top-right.png` e `.runtime/blender-agent/references/dim-mid-right.png`; são ampliações de leitura, não derivados para publicação. Uma tentativa de recorte inferior ficou fora da área útil e não é utilizada.

## Execução da revisão v0.3 e limitações observadas

A recipe v0.3 foi validada localmente e executada no Blender 5.2 LTS. O primeiro ciclo terminou com 21 etapas, 0 falhas, cinco componentes obrigatórios encontrados e três capturas (frente, lateral e três quartos). Para preservar 170 mm entre apoio inferior e topo da tampa, a base da malha PET foi levada a z=0; tampa permaneceu de 11 mm. A argola Ø34 e a etiqueta são objetos independentes.

Durante a revisão houve uma tentativa intermediária de recipe que falhou porque a ação de remoção ainda procurava o nome antigo v0.2; a cena v0.3 continuou preservada. A recipe foi corrigida para substituir o objeto v0.3, validada e executada de novo com sucesso. Também foi reduzida a densidade da malha da tampa após exceder o limite de tamanho da recipe; não houve perda de relevo perceptível no render frontal de revisão. Esses erros e correções estão preservados na história local da recipe.

A geometria de pescoço não inclui uma rosca helicoidal detalhada; o diâmetro/ passo da rosca não foi fornecido e o suporte atual é insuficiente para modelá-la com precisão por recipe. O objeto continua sendo um blockout geométrico, não uma peça aprovada para fabricação. O export GLB ainda inclui a cena e pode conter câmera/luzes; não tratar como pacote final de produção.

## Fechamento seguro e próximo passo

O comando padrão indicado pelo proprietário foi executado: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/stop.ps1`. Ele falhou ao serializar as aspas do JSON interno (`{label:shutdown-recovery,mode:checkpoint}`). Em seguida, a sessão foi fechada com sucesso pelo protocolo local `app.quit`, em modo `checkpoint`; não foi usado o X nem `-Force`. Checkpoint v0.3: `.runtime/blender-agent/checkpoints/20261006T003736Z-Recipe-lily-pet-empty-square-0.3.0-2026-10-06_cooklily-pet-v03-safe-close-1791247171798007700.blend`. O encerramento do processo Blender foi verificado. O script `stop.ps1` segue como pendência para AG-DEV; a correção é independente da modelagem e não impediu salvar e fechar com segurança.

Próximo passo: receber as respostas dimensionais listadas acima e ajustar se necessário; depois, quando o suporte de imagem estiver pronto, aplicar a arte original separada, validar transparência/material PET e preparar exportações por nível de detalhe. Owner: AG-MIDIAS; confirmações dimensionais/arte: proprietário; melhoria do bridge/stop.ps1: AG-DEV.
