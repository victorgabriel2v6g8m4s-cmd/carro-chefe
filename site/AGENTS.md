# Regras do site público

Estas instruções complementam o `AGENTS.md` da raiz para `site/`.

- O site apresenta a marca e envia o cliente ao fluxo transacional do ERP; não implemente checkout paralelo.
- Preserve a direção colonial/rústica dos ativos existentes e use `docs/MARCA.md`.
- `/welcome` precisa funcionar sem 3D e respeitar redução de movimento.
- `/cardapio` usa embed somente após homologação contratual/técnica; implemente redirect como fallback.
- O botão de pedido deve permanecer facilmente alcançável no celular.
- Metas mínimas: acessibilidade por teclado, texto alternativo, contraste, estados de erro, carregamento progressivo e medição sem PII.
- Não invente preços, horários, endereço, promoções ou disponibilidade.
- Não copie dados do ERP para uma segunda fonte manual.

