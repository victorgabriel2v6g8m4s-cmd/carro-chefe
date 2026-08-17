# Contrato de rastreamento dos QR Codes

O QR Lab adiciona parâmetros first-party quando o conteúdo é URL:

- `cc_qr`: ID estável da arte/posição do QR Code;
- `cc_campaign`: campanha opcional;
- `cc_variant`: variação opcional de peça, produto, embalagem ou teste.

Exemplo: `https://carrochefe.com/cardapio?cc_qr=QR-20260817-A1B2C3D4&cc_campaign=inauguracao&cc_variant=chefao-cartaz-a`.

## Evento esperado no C.O.

A página de destino deve ler os parâmetros `cc_*` e registrar um evento `qr_scan` sem PII, por exemplo:

```json
{"event":"qr_scan","qrId":"QR-20260817-A1B2C3D4","campaign":"inauguracao","variant":"chefao-cartaz-a","landingPath":"/cardapio"}
```

Timestamp, sessão anônima e demais metadados devem ser atribuídos pelo coletor do C.O., não embutidos no QR.

## URLs externas

Em domínio externo, o ID continua no QR, mas o C.O. não observa o acesso sozinho. Nesses casos, a próxima evolução recomendada é um redirector first-party como `carrochefe.com/r/<id>` que registra o scan e redireciona.

## Manifesto

O `*.qr-manifest.json` associa o ID ao payload final e aos principais atributos de design para futura importação/reconciliação no C.O.
