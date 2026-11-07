# CookLily — repositório de código ativo

- Atualizado em: 07/11/2026.
- Estado: confirmado; este documento registra a separação atual e aponta a fonte de verdade.
- Fonte: repositório GitHub CookLily, branch `main`, SHA verificado `0bac1414ddc6d84a0fe46953500d9acdbc52a080`.

## Decisão

O projeto CookLily continua e é desenvolvido no repositório exclusivo [victorgabriel2v6g8m4s-cmd/cooklily](https://github.com/victorgabriel2v6g8m4s-cmd/cooklily). A aplicação, API, banco, migrations CookLily, infraestrutura necessária ao runtime, suas regras e o roadmap vigentes são mantidos ali. A branch `main` desse repositório é a fonte de integração atual.

O repositório `carro-chefe` permanece como referência histórica do Carro Chefe e de decisões anteriores sobre a convivência temporária dos projetos. Ele não é a origem do código CookLily, do artefato de release nem da configuração operacional atual da CookLily. Não se deve copiar uma alteração para o repositório ativo sem primeiro reconciliá-la com a versão e as regras atuais da CookLily.

## Evidência da migração de trabalho

- O repositório correto e sua branch `main` foram verificados durante a retomada de 07/11/2026.
- A refatoração das páginas de autenticação foi integrada ao repositório CookLily no PR [#66](https://github.com/victorgabriel2v6g8m4s-cmd/cooklily/pull/66), com merge no SHA `39ebb0b0b0351300cb1d1efa81af0fe02b83aad5`. O checkpoint documental foi integrado pelo PR [#67](https://github.com/victorgabriel2v6g8m4s-cmd/cooklily/pull/67); a `main` verificada para esta atualização é `a9b09ec24710f7b50da9b7475a9ab336c7b125f4`.
- O PR #66 preserva `vipInvite` e `next` ao alternar entre entrar e cadastrar; o módulo de autenticação é lazy-loaded. Os gates remotos de runtime, documentação e CodeQL passaram no head validado daquela PR. O PR #68 registrou o estado da release `.7` em staging e os incidentes corrigidos; está integrado no SHA `0bac1414ddc6d84a0fe46953500d9acdbc52a080`.
- A candidata `.7`, reconstruída do SHA `a9b09ec24710f7b50da9b7475a9ab336c7b125f4`, está instalada no staging CookLily. Health local HTTP 200 e integridade do banco foram verificados. No navegador integrado, a rota de convite preserva `vipInvite` entre cadastro e login; a página guest e a coroa do header foram observadas em desktop e mobile, sem overflow horizontal. A jornada autenticada de cliente não-VIP, consentimento e ativação continua pendente; esses testes parciais não equivalem à homologação completa nem à publicação. O checkpoint/evidência no repositório CookLily é a fonte para detalhes e limites.

## Endereços CookLily vigentes

- Site público: `https://licalily.com/cook/`.
- Teste/homologação: `https://carrochefe.com/lilyacai/`.
- A raiz `https://licalily.com/` é o hub público de descoberta das empresas dos mesmos proprietários. A rota de cosméticos é separada em `/cosmetics`; essa loja ainda não está lançada.
- As decisões antigas deste repositório que descrevem CookLily na raiz de `licalily.com` ou tratam `carrochefe.com/lilyacai` como fonte de código estão superadas. Releases e código devem ser consultados no repositório CookLily, sem presumir que a versão pública e a de teste têm o mesmo estado operacional.

## Como continuar trabalho CookLily

1. Abra o repositório CookLily e leia o `AGENTS.md`, o roadmap, os ADRs e o checkpoint da execução relevante.
2. Confirme branch, SHA e árvore de trabalho antes de editar.
3. Siga as regras CookLily para implementação, testes, migrações, revisão, deploy e homologação.
4. Mantenha no repositório histórico apenas decisões/evidências úteis ao Carro Chefe; corrija links antigos quando forem usados e identificados.

Nenhum dado operacional ou de cliente é transferido pelo fato de os documentos históricos continuarem neste repositório.
