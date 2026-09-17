# Atribuição omnicanal de cardápio e pedidos

> **Status:** decisão aprovada pelo proprietário em 17/09/2026.
>
> Este documento é o contrato canônico de planejamento para atribuição entre cardápio físico, QR Codes, cardápio digital, montagem de lanche personalizado, totem e pedidos online. A implementação deve preservar as regras de privacidade e não transformar atribuição probabilística em afirmação de identidade.

## 1. Decisão aprovada

O lançamento da operação deve combinar poucos caminhos de compra, mantendo baixa fricção e permitindo medir de onde cada jornada começou.

Está aprovado que:

1. o **cardápio físico inicial será enxuto**, com poucas combinações de lanches e espetos;
2. o cardápio físico terá uma opção de alto destaque para **montar um lanche personalizado**;
3. essa opção apontará para um **QR Code dedicado**, levando a uma página de montagem extremamente simples e rápida;
4. o QR de montagem personalizada deve permitir distinguir acessos iniciados na **lanchonete física** de acessos originados pelos **canais online**;
5. cada mesa terá um **QR Code de cardápio digital** identificável individualmente;
6. o QR da mesa deve registrar que a jornada ocorreu no contexto da loja física e permitir interpretar se a pessoa entrou diretamente pelo digital ou se já existia um pedido naquela mesa;
7. o **totem de autoatendimento** também participará do modelo de atribuição;
8. quando não houver evidência anterior vinculável de QR da mesa ou QR do cardápio físico naquela visita/dia, uma nova jornada no totem será classificada operacionalmente como **entrada direta pelo totem**;
9. o totem **não pode exigir criação de conta nem login** para iniciar ou concluir o pedido;
10. cadastro/login podem ser oferecidos como opção, desde que não bloqueiem nem prejudiquem o fluxo rápido de compra.

A intenção é medir aquisição e comportamento sem sacrificar conversão no ponto de venda.

## 2. Princípios do sistema

### 2.1 Fricção mínima

O cliente deve conseguir abrir cardápio, montar produto e concluir pedido sem cadastro obrigatório.

### 2.2 Tracking first-party

A atribuição principal deve ser controlada pelo Carro Chefe. Ferramentas externas de analytics podem complementar relatórios, mas não devem ser a fonte única da origem do pedido.

### 2.3 Identidade não é requisito para atribuição

Sessões anônimas/pseudônimas podem ser usadas para medir jornada. Conta, telefone ou outro dado identificável só entram quando necessários para uma finalidade legítima e transparente.

### 2.4 Sem fingerprinting invasivo

Não tentar identificar a mesma pessoa entre celular e totem por impressão digital de dispositivo, combinação de IP/User-Agent ou técnicas equivalentes de rastreamento oculto.

### 2.5 Atribuição é uma regra operacional

Uma classificação como `table_qr_digital_first` significa que o sistema não encontrou pedido aberto na mesa naquele momento. Isso **não prova** que a pessoa nunca olhou visualmente para o cardápio físico.

Da mesma forma, `kiosk_direct` significa ausência de uma evidência anterior vinculável à jornada; não deve ser apresentado como certeza biométrica de que aquela pessoa não usou outro dispositivo.

## 3. Canais e classificações

| Código lógico | Canal/situação | Interpretação |
|---|---|---|
| `physical_menu_custom_qr` | QR destacado no cardápio físico para montar lanche | interesse iniciado pelo cardápio físico |
| `table_qr_digital_first` | QR da mesa escaneado sem pedido aberto naquela mesa | entrada digital-first dentro da loja |
| `table_qr_after_order` | QR da mesa escaneado com pedido aberto na mesa | acesso digital posterior a uma jornada já iniciada |
| `table_qr_unknown_state` | QR da mesa escaneado e estado da mesa não pôde ser confirmado | contexto físico conhecido; sequência desconhecida |
| `kiosk_direct` | sessão no totem sem evidência vinculável de QR anterior na visita/dia | entrada operacional direta pelo totem |
| `kiosk_after_qr` | sessão no totem vinculada a QR anterior da mesma visita | migração de QR para totem |
| `online_custom_builder` | montagem personalizada iniciada online sem QR físico | origem online |
| `online_campaign` | acesso online com campanha/QR externo identificável | origem da campanha registrada |
| `unknown` | origem insuficiente ou inconsistente | não inferir origem inexistente |

Esses códigos são de negócio. A implementação pode usar enums equivalentes, mas não deve mudar silenciosamente a semântica.

## 4. QR Codes e manifesto

O contrato existente `cc_qr`, `cc_campaign` e `cc_variant` continua válido. Cada QR físico precisa ter ID estável e registro em um **manifesto de QR**.

O manifesto deve armazenar, no mínimo:

- `qr_id`;
- `surface`: `physical_menu_custom`, `table_menu`, `banner`, outra superfície aprovada;
- `store_id`;
- `table_id`, somente quando aplicável;
- campanha;
- variante, quando existir;
- destino vigente;
- data de ativação;
- status;
- versão da peça física;
- observação operacional.

Não é necessário expor `store_id` e `table_id` diretamente na URL se o backend conseguir resolvê-los com segurança a partir de `cc_qr`.

### 4.1 QR do cardápio físico — montar personalizado

O QR deve apontar diretamente para a experiência de montagem, sem obrigar o cliente a navegar por páginas intermediárias.

Ao abrir:

1. resolver `cc_qr` no manifesto;
2. criar/continuar sessão analítica first-party;
3. registrar `qr_scan`;
4. classificar a entrada como `physical_menu_custom_qr`;
5. abrir o construtor;
6. preservar a atribuição até pedido criado/pago quando houver integração.

### 4.2 QR por mesa

Cada mesa deve possuir um `qr_id` próprio ou outro identificador estável que permita resolver a mesa no manifesto.

No momento do scan:

1. identificar `store_id` e `table_id`;
2. consultar o estado operacional da mesa;
3. se **não houver pedido aberto**, registrar `table_qr_digital_first`;
4. se **houver pedido aberto**, registrar `table_qr_after_order`;
5. se o estado não puder ser consultado, usar `table_qr_unknown_state` e nunca inventar a condição.

A consulta deve usar o estado vigente no momento do scan, com timestamp.

## 5. Construtor de lanche personalizado

A experiência precisa ser desenhada para uso rápido em celular.

Requisitos mínimos:

- carregar rapidamente em rede móvel comum;
- controles grandes e claros;
- etapas curtas;
- preço atualizado durante a montagem quando aplicável;
- regras de incompatibilidade/limite validadas antes da confirmação;
- resumo visual final;
- possibilidade de voltar e editar sem perder seleção;
- nenhuma criação de conta obrigatória;
- evento de abandono mensurável sem registrar conteúdo pessoal livre.

Fluxo recomendado:

```text
entrada
→ escolha da base
→ proteínas/espetos
→ complementos
→ adicionais/removíveis
→ revisão
→ adicionar ao pedido
→ pagamento/canal de conclusão
```

O número real de etapas deve ser reduzido quando a arquitetura de modificadores permitir.

## 6. Sessão, visita e vínculo entre dispositivos

### 6.1 IDs recomendados

Separar conceitos:

- `session_id`: sessão anônima de navegador/dispositivo;
- `visit_id`: visita operacional à loja, quando houver forma legítima de estabelecê-la;
- `kiosk_session_id`: sessão temporária do totem;
- `order_id`: pedido;
- `table_id`: mesa;
- `customer_id`: somente se o cliente optar por identificação e houver base adequada.

### 6.2 Regra crítica de correlação

Sem login, não existe mecanismo confiável para concluir automaticamente que uma sessão de celular e uma sessão no totem pertencem à mesma pessoa.

Um vínculo cross-device só pode ser considerado determinístico quando existir uma ponte concreta, por exemplo:

- o mesmo `order_id`;
- transferência explícita de sessão por código/QR de continuidade;
- mesa + token de visita emitido pelo sistema;
- identificação opcional fornecida pelo próprio cliente;
- outro mecanismo aprovado que não dependa de fingerprinting oculto.

Na ausência de ponte, o sistema pode aplicar a classificação operacional `kiosk_direct`, mas o relatório deve indicar nível de confiança adequado.

## 7. Atribuição do totem

Ao iniciar uma sessão no totem:

1. gerar `kiosk_session_id` sem pedir login;
2. tentar recuperar apenas vínculos first-party permitidos para a visita atual;
3. procurar evidência de QR da mesa ou QR do cardápio físico vinculada à mesma visita;
4. se existir vínculo suficiente, usar `kiosk_after_qr`;
5. se não existir, usar `kiosk_direct`;
6. permitir identificação/cadastro opcional em etapa que não bloqueie a compra;
7. anexar a atribuição ao `order_id` quando o pedido for criado;
8. preservar a origem mesmo que o cliente opte por criar conta posteriormente.

### 7.1 Login/cadastro opcional

A interface pode oferecer benefícios legítimos, como histórico, recompensas ou recuperação de preferências, quando esses recursos existirem de verdade.

Não permitido:

- bloquear cardápio ou checkout até login;
- esconder a opção de continuar sem conta;
- exigir telefone/e-mail apenas para tracking;
- usar recompensa fictícia ou urgência artificial para obter cadastro.

## 8. Modelo de atribuição

Para não misturar aquisição com o local em que o pedido terminou, manter pelo menos dois campos conceituais:

- `acquisition_source`: primeiro ponto de entrada conhecido da jornada relevante;
- `order_entry_source`: canal/superfície usada para iniciar o pedido que será concluído.

Opcionalmente manter:

- `conversion_surface`: onde o pedido foi finalizado/pago;
- `attribution_confidence`: `deterministic`, `strong`, `heuristic`, `unknown`;
- `link_method`: método usado para ligar eventos/sessões.

Exemplo:

```json
{
  "acquisitionSource": "physical_menu_custom_qr",
  "orderEntrySource": "kiosk_after_qr",
  "conversionSurface": "kiosk",
  "attributionConfidence": "deterministic",
  "linkMethod": "visit_token"
}
```

## 9. Precedência e conflitos

Quando houver múltiplas evidências:

1. vínculo explícito com `order_id` ou token de continuidade vence inferências;
2. QR identificado vence origem genérica `direct`;
3. contexto de mesa registrado no momento do scan não deve ser sobrescrito por um estado consultado posteriormente;
4. o canal de conversão não deve apagar o canal de aquisição;
5. uma identificação opcional posterior não deve reescrever silenciosamente a origem histórica;
6. conflito sem solução deve ser marcado como `unknown`/ambíguo, não resolvido por suposição.

## 10. Eventos mínimos

| Evento | Momento |
|---|---|
| `qr_scan` | QR identificado aberto |
| `menu_view` | cardápio digital carregado |
| `custom_builder_start` | cliente começa a montagem personalizada |
| `custom_builder_step` | avanço relevante de etapa, sem PII |
| `custom_builder_complete` | configuração válida concluída |
| `kiosk_session_start` | nova sessão do totem |
| `optional_identity_offer_view` | oferta opcional de identificação exibida |
| `optional_identity_accept` | cliente decide se identificar |
| `order_created` | pedido recebe `order_id` |
| `order_paid` | pagamento confirmado |
| `order_cancelled` | pedido cancelado |
| `attribution_linked` | duas jornadas/sessões são vinculadas por método permitido |
| `attribution_conflict` | evidências incompatíveis detectadas |

Eventos de analytics não devem carregar nome, telefone, endereço ou texto livre do cliente.

## 11. Estrutura de dados conceitual

### `qr_manifest`

```text
qr_id
surface
store_id
table_id?
campaign?
variant?
destination
status
activated_at
retired_at?
```

### `journey_sessions`

```text
session_id
visit_id?
store_id?
table_id?
started_at
last_seen_at
acquisition_source
attribution_confidence
```

### `journey_events`

```text
event_id
session_id
visit_id?
order_id?
qr_id?
event_name
event_at
metadata_sem_pii
```

### `order_attribution`

```text
order_id
acquisition_source
order_entry_source
conversion_surface
qr_id?
store_id?
table_id?
link_method?
attribution_confidence
attributed_at
```

O schema físico definitivo deve ser compatibilizado com ERP, API e C.O. antes de migrations de produção.

## 12. Relatórios para o Centro Operacional

O C.O. deve conseguir responder, por período e loja:

- quantas jornadas começaram no cardápio físico pelo QR de personalização;
- quantas começaram pelo QR de mesa sem pedido aberto;
- quantas abriram o QR de mesa depois de um pedido já existir;
- quantas começaram diretamente no totem;
- quantas migraram de QR para totem;
- quantas começaram online;
- taxa de início → pedido criado;
- taxa de pedido criado → pedido pago;
- ticket médio por origem;
- margem por origem quando ERP/custos permitirem;
- abandono do construtor personalizado;
- conversão de identificação opcional no totem;
- proporção de atribuições determinísticas, heurísticas e desconhecidas.

Relatórios devem distinguir **sessões**, **visitas**, **pedidos** e **clientes identificados**.

## 13. Privacidade e LGPD

Diretrizes obrigatórias:

- minimizar coleta;
- não exigir identificação para tracking operacional;
- separar analytics de cadastro/CRM;
- não colocar PII em URL ou QR Code;
- não enviar PII para ferramentas de analytics;
- não usar fingerprinting oculto como solução para correlação cross-device;
- documentar finalidade e retenção de cada identificador;
- permitir que a operação continue quando analytics não essenciais forem recusados;
- submeter bases legais, retenção e textos públicos à revisão jurídica antes da operação definitiva.

Eventos estritamente necessários para criar, conciliar e atribuir um pedido no sistema first-party devem permanecer separados de vendors de analytics não essenciais.

## 14. Etapas de execução

### Fase 0 — contrato e inventário

- consolidar enums de origem;
- definir manifesto de QR;
- mapear mesas, loja e terminais;
- definir quais eventos são operacionais e quais são analytics;
- definir contrato de dados com ERP e C.O.;
- revisar privacidade.

### Fase 1 — coletor first-party

- criar geração segura de `session_id`;
- implementar ingestão idempotente de eventos;
- implementar manifesto/resolução de `cc_qr`;
- persistir origem sem PII;
- criar testes de duplicidade e concorrência.

### Fase 2 — montagem personalizada

- implementar página mobile-first;
- integrar regras reais de modificadores;
- ativar QR do cardápio físico;
- preservar atribuição até pedido;
- medir início, conclusão e abandono.

### Fase 3 — QR das mesas

- criar QR único por mesa;
- integrar consulta a pedido aberto;
- classificar `digital_first`, `after_order` ou `unknown_state` no momento do scan;
- validar mudança/troca de mesa e pedidos encerrados.

### Fase 4 — totem

- gerar `kiosk_session_id` anônimo;
- integrar atribuição do pedido;
- implementar `kiosk_direct` e `kiosk_after_qr` somente com as evidências disponíveis;
- oferecer identificação opcional sem bloquear checkout;
- garantir funcionamento offline conforme o planejamento do totem.

### Fase 5 — conciliação e C.O.

- anexar atribuição a pedidos pagos;
- criar painéis por origem e superfície;
- separar first-touch, entrada do pedido e conversão;
- evidenciar confiança da atribuição;
- criar alertas de QR inválido, eventos perdidos e conflitos.

### Fase 6 — homologação em loja

Executar testes presenciais com cenários reais antes de considerar o tracking confiável para decisões comerciais.

## 15. Matriz mínima de testes

| Cenário | Resultado esperado |
|---|---|
| QR de personalização no cardápio físico | `physical_menu_custom_qr` |
| QR da mesa sem pedido aberto | `table_qr_digital_first` |
| QR da mesa com pedido aberto | `table_qr_after_order` |
| QR da mesa com ERP indisponível | `table_qr_unknown_state` |
| Totem sem vínculo anterior | `kiosk_direct` |
| Totem com token/vínculo de QR válido | `kiosk_after_qr` |
| Cliente recusa analytics não essenciais | pedido continua normalmente |
| Cliente não cria conta no totem | pedido continua normalmente |
| Cliente cria conta depois de iniciar pedido | origem anterior é preservada |
| Mesmo evento reenviado | não duplica métricas/pedido |
| QR aposentado | comportamento controlado e registrável, sem reutilizar ID |
| conflito de duas origens | registra conflito/ambiguidade; não inventa vencedor |

## 16. Critérios de aceite

A primeira versão só deve ser tratada como pronta quando:

- [ ] cardápio físico enxuto possui CTA destacado para personalização;
- [ ] QR de personalização abre diretamente o construtor;
- [ ] origem física versus online fica distinguível;
- [ ] cada mesa possui QR identificável;
- [ ] estado de pedido da mesa é avaliado no momento do scan;
- [ ] totem funciona sem conta/login obrigatório;
- [ ] pedido do totem recebe atribuição mesmo em sessão anônima;
- [ ] nenhuma correlação cross-device é inventada por fingerprinting;
- [ ] relatórios mostram nível de confiança quando necessário;
- [ ] aquisição, entrada do pedido e superfície de conversão permanecem separadas;
- [ ] eventos são idempotentes;
- [ ] nenhum PII aparece em QR/URL/eventos de analytics;
- [ ] atribuição chega ao pedido pago/ERP quando a integração estiver disponível;
- [ ] C.O. consegue comparar os principais canais;
- [ ] testes presenciais cobrem todos os cenários da matriz mínima.

## 17. Dependências e decisões ainda abertas

A decisão comercial deste documento está aprovada. Permanecem como decisões de implementação, sem alterar a direção aprovada:

- mecanismo exato de continuidade cross-device QR → totem;
- política de expiração de `visit_id` e `session_id`;
- retenção de eventos e logs;
- contrato final de ERP para estado de mesa/pedido;
- benefícios reais associados a cadastro opcional;
- posição visual final dos CTAs no cardápio físico/digital;
- hardware/quantidade final de totens;
- desenho final dos dashboards do C.O.

Enquanto não houver decisão específica, o sistema deve preferir `unknown` a fabricar uma atribuição.

## 18. Relações com outros documentos

- [`../negocio/PRODUTO_CARDAPIO.md`](../negocio/PRODUTO_CARDAPIO.md) — produtos, modificadores e experiência comercial;
- [`TOTEM_AUTOATENDIMENTO.md`](./TOTEM_AUTOATENDIMENTO.md) — hardware, offline-first e contingência do totem;
- [`../pre-lancamento/QR_ATRIBUICAO.md`](../pre-lancamento/QR_ATRIBUICAO.md) — contrato first-party `cc_*` e histórico do QR de campanha;
- [`../pre-lancamento/ANALYTICS_PRIVACIDADE.md`](../pre-lancamento/ANALYTICS_PRIVACIDADE.md) — separação entre analytics e dados identificáveis;
- [`../governanca/RISCOS_DECISOES.md`](../governanca/RISCOS_DECISOES.md) — registro formal de decisões e riscos.
