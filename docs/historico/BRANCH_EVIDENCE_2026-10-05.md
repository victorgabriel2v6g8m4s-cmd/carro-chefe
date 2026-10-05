# Consolidação de branches — evidências históricas

Data de consolidação: 2026-10-05.

Esta branch (`history/evidence`) é o ponto único de retenção de históricos substituídos, gates concluídos e linhas antigas de trabalho. O objetivo é permitir a remoção das refs antigas sem perder alcançabilidade dos commits.

## Branches mantidas fora do arquivo

| Branch | Head na consolidação | Motivo |
|---|---|---|
| `main` | `c60fd6772cde4216a100d244739addda31965185` | linha canônica Carro Chefe |
| `cooklily/canonical` | `7989bdd86f0e645237b5bce51422ada9839509bd` | linha canônica CookLily |
| `feat/lily-payment-choice-discounts` | `22b3372c049285b913ec1493da6e50627923a433` | trabalho ativo, PR #128/#129 |
| `feature/blender-agent-bridge` | `931bf67980e9f13059487703ab518f1d847b48ec` | trabalho ativo, PR #101 |
| `history/evidence` | esta linha | única branch de evidências históricas |

## Heads arquivados

Os commits abaixo são anexados como ancestrais da linha `history/evidence`; a árvore corrente da branch continua baseada na organização canônica do repositório.

| Branch histórica | Head preservado |
|---|---|
| `chore/repository-organization-map` | `fc63007bc65054397a5273e0c766d51349ac5fb3` |
| `3d-merge` | `4a0c95efe69c4fb81249614f92a74b5069a64d1c` |
| `chore/template-declaracao-vinculo` | `0b3f6bb526deb19ff8ba2ec75271797ad2e03017` |
| `dependabot/github_actions/github-actions-4b2c77c676` | `8634c5d0b93809aa67be045c4d55ea56b035c927` |
| `dependabot/npm_and_yarn/development-dependencies-83bb08f1e0` | `da1ff18fbdc24a7a5f259229a7075c7fd3845296` |
| `dependabot/npm_and_yarn/ip-address-10.7.2` | `35b13af1a4b9b5e0019836a8081c96d4e83abf54` |
| `dependabot/npm_and_yarn/production-dependencies-57ca911ec7` | `7f102c72befa5878e7a22236a72847b37542ecf1` |
| `docs/atalhos-edicao-imagem` | `dd6c5cd2855808b3b1eb8cfdbe32c1c2f351ad1d` |
| `docs/social-trends-campo-grande-2026-09-24` | `a331f935b195a85fc9af68634465da14e3a036b6` |
| `excel/bebidas-fort-2026-09-17` | `0f2adf2d6f270272b1e99ecbfe42615fc90cef71` |
| `excel/bebidas-fort-2026-09-17-recovered` | `fb2aae5df10735c0101a637662019e271447a772` |
| `feat/excel-recipe-v3b-charts-drawings` | `b7b5d7a211fa997a3b24791ff7bd0379933f2c5b` |
| `feat/excel-recipe-v3b-drawings` | `52c8f3660437491abdaa14530216546042ec0f04` |
| `feat/excel-recipe-v3b-drawings-charts` | `0fcad804b2003baed75b5e4209afb44944bb3881` |
| `feat/lily-entrega-06-pedidos` | `b122a06c7014f44751436a462a495c8b349c20ee` |
| `feat/lily-entrega-07-pagamentos` | `7d4fc5f2e07520d1b8a7bfd4dab0a219cb7fca05` |
| `feat/lily-entrega-08-torre-controle-pedidos` | `62b0c6eca315c718c512b35a6274ba01f701c270` |
| `feat/lily-entrega-09-analytics-first-party` | `c52a0fcda0d016f282ad513b4b91b0098fc0a75c` |
| `feat/lily-entrega-10a-observabilidade-backup` | `3ba8c615c64b736692d7e925d51d9659225f876d` |
| `feat/lily-entrega-10b-a11y-performance` | `d895e51ba764382238b4227e27e2e5c8816be34e` |
| `feat/lily-entrega-11e-reatribuicao-historico-guest` | `ddda7af8648bf9bf69ab80f3ee2224e5a7d6dd77` |
| `feat/lily-entrega-11f-guest-tracking` | `7fedecc344ee466035266b8fd1eb7ec8a50c6097` |
| `feat/lily-entrega-11f-guest-tracking-v2` | `0d4f8a6f60821dfa09d9a94a2470e5f2ffb22af1` |
| `feat/lily-entrega-11g-eta-mapas` | `5dbd04adfa1effbf996ca667df0b14a51ffbf2bd` |
| `feat/lily-entrega-11g-eta-mapas-v2` | `58759148c410fe08584f9ff9895fd64cbeb02ca3` |
| `feat/lily-entrega-11h-whatsapp-etapas` | `24913c695acabed46125166683f7ddb2c2fe89a9` |
| `feat/lily-entrega-11i-pix-auto-reconciliation` | `5758eaf634988bb8cb86b5c37fdf8be6aa3fd402` |
| `feat/lily-entrega-11j-sla-alertas-operacionais` | `b5413d4bc9d0c6cd63f9661f285968f10dc22747` |
| `feat/lily-entrega-11k-impressao-cozinha` | `80da3aa2e9321b106f44a99bfed3236344a7dd77` |
| `feat/lily-entrega-12-alergenicos` | `da643f2d5e3fc07a3764ebfb8eb2d08f3e7a1e0a` |
| `feat/lily-homologacao-05-06` | `db6e877d201b1eb18e8c4588990f370264d60bc4` |
| `feat/xlsm-snapshot-export` | `1aefeb7480a12034cefca50bba12362ff94f53fa` |
| `fix/deployer-reexec-lock-inheritance` | `e63fdb19588b00d630e00c10efb8038b35fca308` |
| `gate/lily-catalogo-final-v1` | `fd885a2d23aa0e3e8a2e5c8a842921463a44a729` |
| `gate/lily-combo-carousel-v1` | `32f5bdf2266c3c33fc98cc47497af231aa87e760` |
| `gate/lily-combo-carousel-v2` | `f0eb8e526df59794a32fbdbc722b8bbdbde4d8b9` |
| `gate/lily-entrega-07-v1` | `5485eb1f2ff99f6ec62d7f861fa4db8b545eeeb6` |
| `gate/lily-homologacao-05-06` | `37f29d6d338e360f5e2e4f9f8d242fd31d66ea81` |
| `gate/lily-homologacao-05-06-v2` | `916062a91119e92dfae2897e9aa8da5e487abd14` |
| `gate/lily-homologacao-05-06-v3` | `10c34bf54a66910a16a76b2be7ae27e93e969411` |
| `gate/lily-homologacao-05-06-v4` | `821e232cc9b685c3d3a061455f69a83d0027673b` |
| `gate/lily-homologacao-05-06-v5` | `5ec4d15c4d3c814a02bbdfce1679425efdc0619e` |
| `gate/lily-homologacao-05-06-v6` | `4363b1c07a8b7e146b52be7c927083d3f4a26987` |
| `gate/lily-promocoes-produto-v1` | `dd9a10090f6d2ab2be8e1de1fe2ec3b482cfc407` |
| `lily-acai` | `26cb6511500775a91549cd18454aa315be631983` |
| `marketing/pre-lancamento-banner-site` | `334ae003a6c03ba89a64f40a70a7535d6c768bbb` |
| `qr-app` | `203eee05708dad3c57ed6b760d6c1f788524d54c` |

## Regra daqui para frente

- trabalho ativo continua em branch temporária + PR;
- ao concluir ou substituir uma branch, seu head deve ficar alcançável por `main`, `cooklily/canonical` ou `history/evidence` antes de remover a ref;
- não criar novas branches de arquivo morto por assunto;
- gates concluídos devem ser fechados e suas refs removidas depois da preservação da evidência;
- este inventário registra o ponto de consolidação; novos arquivos históricos podem usar novos documentos dentro de `docs/historico/`, sem criar outra branch de arquivo.
