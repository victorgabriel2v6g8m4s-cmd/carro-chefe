# QR Code, campanha e atribuição

## 1. Objetivo

Garantir que cada acesso originado de material físico possa ser associado à peça, campanha e variante correta, sem depender somente de métricas agregadas do site.

O projeto já possui, na branch `qr-app`, um contrato first-party para rastreamento de QR Codes. Esta campanha reaproveita esse contrato.

## 2. Identificação oficial desta campanha

O proprietário confirmou em 2026-09-12 que o QR efetivamente usado no banner aponta para:

```text
https://carrochefe.com/?cc_qr=QR-001&cc_campaign=banner
```

Parâmetros oficiais:

```text
cc_qr=QR-001
cc_campaign=banner
cc_variant=null
```

`cc_variant` não está presente no QR homologado. A aplicação deve preservar isso como ausência de variante em vez de inventar um valor.

### `cc_qr`

Identificador estável da peça/posição do QR.

Para o banner atual:

```text
QR-001
```

### `cc_campaign`

Identificador legível da campanha.

Para o banner atual:

```text
banner
```

### `cc_variant`

Identifica uma variação criativa, local, oferta ou experimento quando essa distinção existir.

Nesta peça:

```text
não informado
```

Se uma próxima peça precisar ser comparada por versão criativa/local/oferta, ela deve receber `cc_variant` explícito antes da impressão.

## 3. Benefício confirmado da campanha

O proprietário confirmou que clientes que se cadastrarem por esta campanha terão **acesso à cupons e promoções exclusivas**.

A implementação pode comunicar essa promessa para acessos identificados por:

```text
cc_qr=QR-001
cc_campaign=banner
```

Não foram definidos nesta confirmação:

- percentual de desconto;
- valor monetário do cupom;
- produto gratuito específico;
- data de validade;
- quantidade limitada;
- frequência dos benefícios.

Esses detalhes não devem ser inventados. Cada ação futura precisa ter regra operacional real e comunicável antes de ser prometida.

## 4. Evento esperado

Ao receber a entrada oficial, o site deve permitir o registro lógico de um evento equivalente a:

```json
{
  "event": "qr_scan",
  "qrId": "QR-001",
  "campaign": "banner",
  "variant": null,
  "landingPath": "/"
}
```

Regras:

- sem nome;
- sem telefone;
- sem e-mail;
- sem conteúdo livre;
- timestamp e identificador de sessão devem ser atribuídos pela camada coletora, não codificados no QR.

## 5. Persistência de atribuição

A origem precisa sobreviver pelo menos até `signup_success`.

Quando o visitante se cadastrar, o lead pode guardar:

- `ccQr`;
- `ccCampaign`;
- `ccVariant`;
- `firstSeenAt`.

A origem da entrada atual é preservada ao navegar por seções e links internos com os parâmetros. Desde a revisão de 14/09/2026, uma nova entrada sem campanha é direta, mesmo após visitar uma campanha na mesma aba; a URL atual prevalece sobre atribuição armazenada anteriormente. Isso evita classificar visita direta como campanha.

Para o QR atual, um novo lead criado nessa sessão deve ficar conceitualmente com:

```text
ccQr: QR-001
ccCampaign: banner
ccVariant: null
```

A deduplicação preserva a origem da primeira inscrição bem-sucedida (não existe histórico completo de first-touch de navegação). Portanto, a interface não deve afirmar que um lead duplicado foi originalmente adquirido pela campanha `banner` sem verificar essa origem.

Se futuramente houver necessidade de comparar first-touch e last-touch, isso deve ser adicionado explicitamente; não alterar silenciosamente a semântica dos campos acima.

## 6. Redirector first-party — P2

Evolução desejada:

```text
carrochefe.com/r/<id>
```

Exemplo:

```text
https://carrochefe.com/r/avenida-01
```

Fluxo:

```text
QR
→ /r/avenida-01
→ resolve ID/manifesto
→ registra qr_scan
→ redireciona para landing vigente
```

Benefícios:

- trocar o destino sem reimprimir o banner;
- centralizar regras de atribuição;
- desativar peças antigas;
- reconciliar QR com manifesto do QR Lab;
- testar landing/variante mantendo o material físico;
- evitar URLs longas impressas no QR.

## 7. Registro da peça atual

Registro operacional confirmado:

```text
ID: QR-001
Campanha: banner
Variante: não informada
Mídia: banner vertical externo
Status: homologado para uso
Destino: /
Benefício associado: acesso à cupons e promoções exclusivas
```

O banner de referência fornecido pelo proprietário apresenta a marca Carro Chefe, o Chefão de 30 cm, Instagram `@carrochefe_cg`, WhatsApp oficial e o QR Code da campanha.

## 8. Relação com UTMs

UTMs podem coexistir para compatibilidade com ferramentas externas, mas não substituem o contrato `cc_*`.

A peça atual não precisa receber UTMs retroativamente para funcionar, porque `cc_qr=QR-001` e `cc_campaign=banner` já são suficientes para a atribuição interna P0.

Se novas peças usarem UTMs, o sistema interno deve continuar tratando `cc_qr` como identificador principal da peça.

## 9. Homologação do QR físico

O proprietário confirmou em 2026-09-12 que o QR foi homologado em:

- Android;
- iPhone;
- rede móvel.

Também foi confirmado o destino/identificador efetivamente usado:

```text
https://carrochefe.com/?cc_qr=QR-001&cc_campaign=banner
```

Itens ainda úteis em validações de campo futuras, especialmente se o banner for reposicionado ou reimpresso:

1. distância compatível com o uso real;
2. iluminação noturna prevista;
3. abertura HTTPS sem alerta;
4. conclusão de cadastro com atribuição persistida;
5. ausência de dados pessoais na URL.

## 10. Critérios de aceite

Para a peça atual, estão confirmados:

- `cc_qr` único conhecido: `QR-001`;
- campanha conhecida: `banner`;
- ausência intencional de `cc_variant`;
- QR homologado em Android e iPhone;
- QR homologado em rede móvel;
- destino oficial registrado;
- `qr_scan` distinguível de tráfego orgânico;
- origem compatível com o contrato first-party do projeto.

A implementação deve continuar garantindo:

- origem chegando ao cadastro sem PII em analytics;
- relatórios agrupáveis por QR/campanha;
- IDs históricos sem mudança de significado;
- nenhum vínculo nominal entre replay analítico e telefone.

## 11. Anti-padrões

Não:

- mudar o significado de `QR-001` depois de impresso;
- inventar `cc_variant` para a peça atual;
- reutilizar `QR-001` em uma peça que precise ser distinguida desta;
- colocar telefone, nome ou outros dados pessoais no QR;
- usar número de scans como equivalente a número de pessoas ou vendas;
- declarar venda atribuída sem conciliação futura com pedido pago do ERP;
- prometer percentual, valor de cupom, brinde ou limitação que ainda não tenha regra aprovada.
