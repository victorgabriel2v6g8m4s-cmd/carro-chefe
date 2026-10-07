# Checkpoint — upload direto de capa por sabor

- Tarefa: permitir que a equipe CookLily envie a foto de capa diretamente em cada sabor, sem precisar escolher previamente uma mídia existente.
- Responsável: AG-DEV.
- Estado: implementação pronta para gates.
- Branch: `feat/lily-flavor-cover-upload`.
- Base: `cooklily/canonical` após integração do PR #128.

## Decisão de implementação

O upload reaproveita a infraestrutura de mídia já existente da CookLily:

1. a imagem é enviada para `POST /api/v1/lily/admin/media`;
2. a API mantém as validações existentes de JPEG/PNG/WebP e limite de 10 MB;
3. a associação `sabor -> mídia` é registrada em `LilyFlavorCover`;
4. substituir uma capa troca apenas a associação, sem duplicar armazenamento;
5. remover a capa apaga a associação, não a mídia da biblioteca.

## UX

No bloco `Sabores e compatibilidade` do painel de cardápio, cada sabor passa a mostrar:

- preview da capa atual ou estado `Sem capa`;
- botão `Enviar foto de capa` quando não há imagem;
- botão `Substituir foto` quando já existe capa;
- botão `Remover capa`;
- feedback de upload/erro acessível por `role=status`/`role=alert`.

O arquivo é selecionado diretamente do dispositivo; não existe etapa obrigatória de escolher uma opção em dropdown.

## Backend

Rotas novas:

- `GET /api/v1/lily/public/flavor-covers`: capas ativas de sabores publicados;
- `GET /api/v1/lily/admin/flavor-covers`: lista administrativa;
- `PUT /api/v1/lily/admin/flavors/:id/cover`: associa/remove a capa.

A mutação exige sessão staff + CSRF e gera `LilyAdminAudit` com ação `update-cover`.

## Dados

A migration `20261007123000_lily_flavor_cover_media` cria `LilyFlavorCover` com:

- `flavorId` como chave primária/FK para `LilyFlavorComponent`;
- `mediaId` como FK para `LilyMediaAsset`;
- cascata na exclusão do sabor ou da mídia;
- índice por `mediaId`.

A associação é mantida por um módulo estreito usando SQL parametrizado do Prisma, sem introduzir um segundo armazenamento de mídia.

## Testes adicionados

- associação/listagem/remoção da capa;
- recusa de mídia pausada;
- presença do entrypoint administrativo no bundle;
- upload direto usando a API de mídia existente;
- formatos e limite de arquivo refletidos na UI.

## Próxima etapa

- executar CI/CodeQL;
- corrigir somente eventuais falhas desses gates;
- integrar na `cooklily/canonical` apenas com gates verdes;
- deploy/homologação ficam para um bloco posterior.
