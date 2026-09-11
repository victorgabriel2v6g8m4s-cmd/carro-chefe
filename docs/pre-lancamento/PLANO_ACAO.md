# Plano de ação — landing de pré-inauguração

## 1. Problema

O site atual foi construído como apresentação institucional e já contém chamadas como “Fazer pedido” e “Quero pedir”. Para o tráfego do banner de pré-inauguração, isso cria uma promessa operacional prematura e dispersa a conversão.

A entrega rápida deve converter a entrada principal em uma experiência focada em uma única ação: **entrar na Lista dos Primeiros**.

## 2. Proposta de experiência

### Hero

Mensagem-base:

> **Pré-inauguração · Campo Grande**
>
> # O Carro Chefe está chegando.
>
> Espeto, brasa e baguete em uma experiência que não passa despercebida.
>
> Entre para a **Lista dos Primeiros** e receba novidades da inauguração, acesso antecipado e um benefício especial de abertura.

CTA principal sugerido:

> **Quero entrar na Lista dos Primeiros**

Texto de confiança:

> Sem spam. Você pode sair da lista quando quiser.

A assinatura **“Sabor que lidera”** permanece como elemento institucional secundário.

### Formulário

Campos:

- WhatsApp: obrigatório;
- primeiro nome: opcional.

Evitar na primeira captura:

- CPF;
- endereço;
- aniversário;
- múltiplos canais obrigatórios;
- preferências extensas.

Objetivo: reduzir fricção e coletar somente o necessário para avisar abertura e benefício.

### Estado de sucesso

Não terminar em um “Obrigado” genérico.

Estado recomendado:

> **Você está dentro.**
>
> Seu lugar na Lista dos Primeiros está confirmado.
>
> 1. Cadastro confirmado ✓
> 2. A abertura será anunciada pelo WhatsApp
> 3. Seu benefício chegará próximo à inauguração

Após a confirmação, oferecer uma ação secundária:

> **Seguir @carrochefe_cg**

O Instagram deve ser pedido **depois** da conversão principal, não concorrer com o formulário no primeiro contato.

## 3. Princípios psicológicos usados

A experiência deve usar mecanismos legítimos de motivação, não dark patterns.

### Curiosidade

Mostrar o suficiente para o visitante entender a proposta — brasa, baguete, espeto, Chefão/Carro-Chefe — sem revelar todos os detalhes da abertura imediatamente.

### Recompensa futura concreta

Prometer um benefício de inauguração somente se ele realmente for entregue.

Recomendação atual: **cupom especial de inauguração**.

O formato econômico exato deve ser decidido por Finanças/Operações antes de comunicação detalhada: desconto fixo, adicional, upgrade, bebida/acompanhamento ou equivalente.

### Recompensa imediata

Após o cadastro, mostrar uma pequena entrega imediata: teaser real de produto, bastidor aprovado, status visual de participação ou conteúdo equivalente.

### Progresso percebido

A tela de sucesso deve mostrar que o visitante já cumpriu a primeira etapa e explicar o que acontece depois.

### Prova social

Só exibir volume de inscritos depois que houver número real e auditável.

### Escassez

Só usar prazo ou limite de quantidade quando forem verdadeiros e operacionalmente necessários.

## 4. Arquitetura de conteúdo

Para o tráfego do banner:

```text
Hero
→ cadastro
→ teaser de produto
→ proposta da marca
→ Instagram / bastidores
→ CTA de cadastro repetido
→ rodapé / privacidade
```

O cardápio completo não deve ser o protagonista da página enquanto a operação ainda não está aberta.

## 5. Identidade visual

Reaproveitar a identidade já documentada:

- fundo obsidiana/preto;
- madeira escura;
- bronze/ouro fosco;
- pergaminho;
- cor de brasa como destaque;
- jipe com chapéu de chef;
- tipografia display somente em títulos especiais;
- sans funcional em interface e campos.

Evitar aparência genérica de startup e não gerar fotografia artificial de comida para preencher falta de ativo aprovado.

Se não houver foto real aprovada, preferir composição de marca + textura + tipografia + elementos de brasa.

## 6. Fases de entrega

### P0 — antes do banner receber tráfego

Obrigatório:

1. entrada coerente com pré-inauguração;
2. CTA principal de cadastro;
3. formulário funcional;
4. persistência do lead;
5. deduplicação básica por telefone normalizado;
6. consentimento explícito para comunicações;
7. tela de sucesso;
8. QR identificável;
9. política de privacidade compatível com a coleta;
10. preferência de analytics;
11. eventos mínimos do funil;
12. teste em celular e rede móvel;
13. Instagram e WhatsApp corretos;
14. ausência de chamada de pedido indisponível.

### P1 — qualidade e otimização

1. dashboard consolidado na Central Operacional;
2. análise por seção da landing;
3. heatmaps e session replay com consentimento;
4. comparação por variante de QR/banner;
5. prevenção de abuso mais robusta;
6. código individual de benefício;
7. experimentos A/B controlados.

### P2 — arquitetura ideal

1. redirector first-party `carrochefe.com/r/<id>`;
2. registro central de QRs e peças;
3. integração da origem com pedido pago no ERP;
4. atribuição até margem;
5. coortes de recompra 30/60/90 dias;
6. camada analítica consolidada/warehouse;
7. estados de campanha `PRE_LAUNCH`, `OPENING` e `LIVE`.

## 7. Critérios GO / NO-GO

### GO

O banner pode apontar tráfego para a landing quando:

- QR abre em HTTPS;
- destino funciona em rede móvel;
- campanha é identificável;
- cadastro persiste de verdade;
- telefone duplicado não gera múltiplos leads desnecessários;
- confirmação aparece após sucesso;
- recusar analytics não impede cadastro;
- política de privacidade está acessível;
- nenhum PII é enviado a plataformas analíticas;
- Instagram e WhatsApp estão corretos;
- não há data de abertura inventada;
- não há CTA para pedido indisponível;
- fluxo completo foi testado a partir do QR físico.

### NO-GO

Bloquear lançamento se:

- o QR não puder ser atribuído;
- o formulário falhar silenciosamente;
- a página coletar telefone sem transparência adequada;
- analytics registrar telefone/nome;
- o usuário for obrigado a aceitar analytics para se cadastrar;
- houver promessa de benefício que não possa ser honrada.

## 8. Métrica principal

A métrica nº 1 do banner é:

```text
Taxa QR → cadastro válido
= cadastros válidos atribuídos / sessões únicas atribuídas ao QR
```

Depois da inauguração, o KPI deve evoluir para:

```text
QR → cadastro → pedido pago → margem → recompra
```

Page views isoladas não devem ser usadas como indicador principal de sucesso.
