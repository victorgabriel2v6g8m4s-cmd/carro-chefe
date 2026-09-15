# AGENTS — Site público

## Região

Experiência pública `carrochefe.com`, incluindo `/welcome` e a ponte segura para `/cardapio`.

## Regras locais

- Preserve `Carro Chefe` para a marca e `Carro‑Chefe` para o produto; não sobrescreva ativos originais.
- Priorize mobile, acessibilidade, Core Web Vitals, imagens otimizadas e movimento reduzido.
- Textos visíveis ficam em i18n/conteúdo centralizado; use tokens oficiais e contraste adequado.
- `/cardapio` só embute o ERP se contrato e headers permitirem; caso contrário usa redirecionamento claro.
- Não implemente checkout, armazene cartão ou envie PII/conteúdo livre a analytics/anúncios.

## Agentes

- `AG-DEV` implementa; Marca e Mídias aprovam derivados; Marketing define mensagem/métrica; Dados valida eventos.

## Fluxo da landing

- `main.tsx`: composição da página, navegação e privacidade.
- `SignupForm.tsx` → API pública `/prelaunch/signup`: estado e envio do cadastro; `signup-phone.ts` valida e formata para UX. A API revalida e o banco garante unicidade.
- `campaign.ts`: atribuição da URL atual, sem herdar campanha de uma visita anterior; `campaign-content.ts` centraliza os textos que distinguem banner e acesso direto.
- `analytics.ts` → API pública `/prelaunch/events`: consentimento opcional, sessão e eventos sem telefone/nome. Eventos em espera preservam a origem no momento da interação; uma nova carga pode gerar outra visualização.
- Imagens públicas otimizadas têm origem registrada ao lado dos derivados. Não confundir visualizações ou sessões observadas com pessoas únicas.

## Pronto

- [ ] Desktop/mobile, teclado, leitor de tela, erro e fallback de integração verificados.
- [ ] Bundle, mídia, analytics minimizado e consentimento avaliados.
- [ ] Testes e build do site passam.
