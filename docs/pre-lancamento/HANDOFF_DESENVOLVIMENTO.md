# Handoff para desenvolvimento — pré-lançamento do site

## 1. Responsável pela implementação

**AG-DEV**.

Este documento descreve o que deve ser entregue e validado. Não prescreve framework novo, estrutura interna de código ou decisões de implementação que pertencem ao agente de Development.

## 2. Objetivo da entrega

Receber tráfego do banner físico de pré-inauguração em `carrochefe.com`, converter visitantes em inscritos consentidos na **Lista dos Primeiros** e registrar dados suficientes para avaliar a campanha sem coletar PII desnecessária em plataformas analíticas.

## 3. Escopo P0

### Experiência pública

- adaptar a entrada principal para estado de pré-inauguração;
- manter identidade visual do Carro Chefe;
- remover ou despriorizar chamadas de pedido ainda indisponíveis;
- exibir CTA de cadastro acima da dobra em mobile;
- formulário com WhatsApp obrigatório e primeiro nome opcional;
- consentimento de comunicação explícito;
- confirmação clara após persistência do cadastro;
- ação secundária para Instagram após sucesso;
- política de privacidade acessível.

### Persistência

O sistema precisa suportar, conceitualmente:

- telefone normalizado;
- deduplicação;
- nome opcional;
- timestamp do cadastro;
- timestamp e versão do consentimento;
- versão da política;
- origem `cc_qr`, `cc_campaign`, `cc_variant`;
- status do lead.

Não armazenar dados de pagamento nesta camada.

### Atribuição

Ler e preservar:

- `cc_qr`;
- `cc_campaign`;
- `cc_variant`.

Garantir que a origem inicial possa ser associada ao cadastro final.

### Analytics

Instrumentar, no mínimo:

- `qr_scan`;
- `landing_view`;
- `signup_cta_click`;
- `form_start`;
- `signup_submit`;
- `signup_success`;
- `signup_duplicate`;
- `signup_error`;
- `reward_view`;
- `instagram_click`;
- `whatsapp_click`;
- `privacy_open`.

Nenhum evento pode conter nome ou telefone.

### Preferência de analytics

- visitante pode aceitar ou recusar analytics não essenciais;
- rejeição não bloqueia cadastro;
- preferência é respeitada antes de disparar ferramentas não essenciais conforme arquitetura adotada;
- formulário e conteúdo sensível permanecem mascarados em ferramentas de replay.

## 4. Fora do escopo P0

Não bloquear a entrega de hoje por:

- dashboard completo dentro do C.O.;
- BigQuery/warehouse;
- experimentação A/B automatizada;
- integração completa com ERP;
- cálculo de margem atribuída;
- coortes 30/60/90 dias;
- redirector first-party definitivo;
- automação de CRM avançada.

Esses itens pertencem a P1/P2.

## 5. Dependências externas

O AG-DEV não deve inventar respostas para as seguintes pendências:

### Benefício de inauguração

Marketing recomenda comunicar **“benefício/cupom especial de inauguração”**.

Valor, percentual, item gratuito ou regra de resgate dependem de validação de Finanças/Operações.

### Texto jurídico definitivo

A página de privacidade precisa refletir a coleta real, mas o texto final deve ser revisado juridicamente.

### Ativos fotográficos

Só usar fotografia real aprovada. Se não houver, usar composição de identidade visual existente; não gerar comida artificial como substituto silencioso.

### Identificador do banner

Antes da impressão/publicação, confirmar o `cc_qr` definitivo usado na peça.

Referência provisória deste plano:

```text
cc_qr=QR-20260911-AV01
cc_campaign=pre_inauguracao
cc_variant=banner_avenida_a
```

## 6. Estados de interface obrigatórios

O fluxo deve prever:

- carregamento inicial;
- formulário vazio;
- campo inválido;
- envio em andamento;
- sucesso;
- cadastro duplicado tratado sem constranger o usuário;
- falha de rede/API;
- analytics aceito;
- analytics recusado.

Não permitir múltiplos envios acidentais por clique repetido.

## 7. Requisitos de qualidade

### Mobile first

O tráfego principal virá de câmera/QR em celular.

Validar:

- largura pequena;
- teclado de telefone apropriado;
- CTA facilmente tocável;
- carregamento em rede celular;
- ausência de layout shift grave;
- legibilidade em ambiente externo/noturno.

### Acessibilidade

- labels reais de formulário;
- foco visível;
- navegação por teclado;
- contraste suficiente;
- mensagens de erro associadas aos campos;
- respeito a redução de movimento quando houver animação.

### Performance

Não permitir que animações, vídeo ou ativos pesados impeçam o visitante de ver o CTA rapidamente.

A landing deve priorizar conteúdo principal e formulário.

## 8. Segurança e abuso

P0:

- validação server-side ou equivalente da persistência;
- rate limiting compatível com a infraestrutura existente;
- honeypot ou mecanismo simples equivalente, se apropriado;
- normalização de telefone;
- nenhuma credencial no frontend/repositório.

P1 pode adicionar proteção adaptativa/Turnstile caso abuso real justifique.

## 9. Critérios de aceite funcionais

### Cadastro

- telefone válido é persistido;
- nome é opcional;
- cadastro duplicado não cria inflação artificial;
- `signup_success` só dispara após confirmação de persistência;
- falha de cadastro produz estado de erro compreensível;
- origem do QR é preservada.

### Privacidade

- página de privacidade está acessível;
- consentimento de comunicação é explícito;
- analytics pode ser recusado;
- recusar analytics não impede cadastro;
- nenhum PII chega aos eventos analíticos;
- replay/heatmap não captura conteúdo de input legível.

### QR

- URL funciona a partir de QR físico;
- parâmetros `cc_*` são lidos;
- `qr_scan` é distinguível de visita não atribuída;
- teste concluído em Android e iPhone quando disponíveis.

### Conteúdo

- não existe data de inauguração inventada;
- não existe escassez falsa;
- não existe prova social inventada;
- benefício comunicado pode ser honrado;
- não existe CTA principal prometendo pedido antes da abertura.

## 10. Critérios de aceite de analytics

O agente deve conseguir demonstrar uma sessão de teste contendo a sequência:

```text
qr_scan
→ landing_view
→ signup_cta_click
→ form_start
→ signup_submit
→ signup_success
→ reward_view
```

E uma sessão recusando analytics na qual o cadastro continue funcional.

Também testar:

- erro de cadastro;
- duplicata;
- clique Instagram;
- clique WhatsApp;
- abertura de privacidade.

## 11. Evidências esperadas no PR de implementação

O PR futuro do AG-DEV deve informar, no mínimo:

- rotas/arquivos afetados;
- solução de persistência escolhida;
- solução de analytics escolhida;
- como consentimento é respeitado;
- como `cc_*` é preservado;
- screenshots mobile e desktop;
- evidência do fluxo de cadastro;
- evidência de evento sem PII;
- teste do QR físico;
- comandos de testes executados;
- pendências P1/P2 conscientemente adiadas.

## 12. Ordem sugerida de implementação

1. estado de pré-inauguração e copy;
2. formulário e persistência;
3. deduplicação e estados de erro/sucesso;
4. consentimento de comunicação;
5. política de privacidade compatível com a coleta;
6. leitura/persistência dos parâmetros `cc_*`;
7. eventos first-party do funil;
8. GA4/Clarity conforme consentimento;
9. QA mobile/acessibilidade/performance;
10. teste QR físico ponta a ponta;
11. revisão final de PII em URLs/logs/analytics.

## 13. Referências internas obrigatórias

Antes de programar, ler:

- `AGENTS.md`;
- `docs/ARQUITETURA.md`;
- `docs/MARCA.md`;
- `docs/MARKETING_MIDIAS.md`;
- `docs/pre-lancamento/PLANO_ACAO.md`;
- `docs/pre-lancamento/ANALYTICS_PRIVACIDADE.md`;
- `docs/pre-lancamento/QR_ATRIBUICAO.md`;
- `apps/qr_manipulator/TRACKING.md` na branch `qr-app`.

Em caso de conflito, não inventar decisão: registrar a divergência e escalar à Gestão/proprietário.
