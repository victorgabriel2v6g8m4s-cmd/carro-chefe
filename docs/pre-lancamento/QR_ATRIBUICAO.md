# QR Code, campanha e atribuição

## 1. Objetivo

Garantir que cada acesso originado de material físico possa ser associado à peça, campanha e variante correta, sem depender somente de métricas agregadas do site.

O projeto já possui, na branch `qr-app`, um contrato first-party para rastreamento de QR Codes. Esta campanha deve reaproveitá-lo.

## 2. Parâmetros canônicos

### `cc_qr`

Identificador estável da peça/posição do QR.

Exemplo:

```text
QR-20260911-AV01
```

### `cc_campaign`

Identificador legível da campanha.

Para esta entrega:

```text
pre_inauguracao
```

### `cc_variant`

Identifica uma variação criativa, local, oferta ou experimento.

Exemplo:

```text
banner_avenida_a
```

## 3. URL P0 recomendada

Enquanto não existir redirector first-party:

```text
https://carrochefe.com/?cc_qr=QR-20260911-AV01&cc_campaign=pre_inauguracao&cc_variant=banner_avenida_a
```

O identificador final do banner deve ser registrado antes da impressão/publicação.

## 4. Evento esperado

Ao receber entrada com parâmetros `cc_*`, o site deve permitir o registro lógico de um evento equivalente a:

```json
{
  "event": "qr_scan",
  "qrId": "QR-20260911-AV01",
  "campaign": "pre_inauguracao",
  "variant": "banner_avenida_a",
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

A origem inicial deve ser preservada mesmo que o usuário navegue por outras seções antes do cadastro.

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

## 7. Registro de peças

No modelo ideal, cada QR deve possuir registro com:

- ID estável;
- campanha;
- variante;
- tipo de mídia;
- localização/posição descritiva sem dados pessoais;
- data de criação;
- status (`draft`, `active`, `retired`);
- destino atual;
- versão do criativo;
- referência ao manifesto gerado pelo QR Lab.

Exemplo conceitual:

```text
ID: QR-20260911-AV01
Campanha: pre_inauguracao
Variante: banner_avenida_a
Mídia: banner_externo
Status: active
Destino: /
```

## 8. Relação com UTMs

UTMs podem coexistir para compatibilidade com ferramentas externas, mas não substituem o contrato `cc_*`.

Se usadas:

```text
utm_source=offline
utm_medium=qr
utm_campaign=pre_inauguracao
utm_content=banner_avenida_a
```

O sistema interno deve continuar tratando `cc_qr` como identificador principal da peça.

## 9. Testes obrigatórios do QR físico

Antes de colocar o banner em circulação:

1. testar com pelo menos um Android;
2. testar com pelo menos um iPhone;
3. testar em rede móvel, não apenas Wi-Fi;
4. testar à distância compatível com o uso real;
5. testar iluminação noturna prevista;
6. confirmar que o QR abre HTTPS sem alerta;
7. confirmar parâmetros `cc_*` no destino;
8. concluir cadastro e verificar atribuição;
9. confirmar que nenhum dado pessoal aparece na URL;
10. guardar registro do ID/variante efetivamente impressos.

## 10. Critérios de aceite

A atribuição está pronta quando:

- toda peça física possui `cc_qr` único;
- campanha e variante são conhecidas;
- `qr_scan` pode ser distinguido de tráfego orgânico;
- origem chega ao cadastro sem PII em analytics;
- relatórios conseguem comparar QRs e variantes;
- a convenção é compatível com `apps/qr_manipulator/TRACKING.md` da branch `qr-app`;
- alterações futuras não exigem redefinir os IDs históricos.

## 11. Anti-padrões

Não:

- imprimir apenas `https://carrochefe.com` sem identificação;
- reutilizar o mesmo `cc_qr` em peças que precisam ser comparadas;
- colocar telefone, nome ou outros dados pessoais no QR;
- mudar o significado de um ID depois de impresso;
- usar número de scans como equivalente a número de pessoas ou vendas;
- declarar venda atribuída sem conciliação futura com pedido pago do ERP.
