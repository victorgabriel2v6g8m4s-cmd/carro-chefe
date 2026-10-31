# Homologação CookLily com courier de teste e pagamentos simulados

- status: completed
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb`
- head_sha_verified: `1040ee8dacc215d29e64161dc8b0f7b95866d06a` (deploy em produção)
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) merged; [#306](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/306) merged; [#307](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/307) merged; [#308](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/308) merged em `1040ee8dacc215d29e64161dc8b0f7b95866d06a`, CI passou
- last_verified_at: 2026-10-31 07:53 UTC (preencher horário de publicação)
- interruption_state: nenhuma; deploy e homologação concluídos

## Concluído e persistido

Objetivo: homologar despacho de couriers de teste com localização sintética restrita e pedido/pagamento sem efeitos externos.

- Autenticação por chave para couriers de teste e localização sintética no ponto de coleta, restrita a courier de teste autenticado por chave; localização é removida ao ficar offline ou expirar.
- Pagamento mock aprovado pelo total calculado no servidor, sem chamada de rede, QR, cobrança, provedor ou envio de WhatsApp.
- Checkout de homologação disponível apenas a staff/admin autorizados.
- PR #305 implementou autenticação/ localização de teste e pagamento mock; #306 corrigiu fluxo de login agente; #307 ajustou orientação/CTA do pagamento mock; #308 removeu reset de formulário após transição que desmonta o elemento.
- Homologação real no IAB: pedido de entrega mock `CL-3534E66B30C2` percorreu aceite/preparo, checklist de liberação, oferta sequencial, recusa do courier 1, aceite do courier 2, chegada à coleta, confirmação da retirada, trajeto, chegada ao cliente, confirmação por código e encerramento da rota. Tracking do cliente mostrou a sequência de estados até entrega concluída.
- A tela de avaliação permitiu selecionar loja, entrega e plataforma ao mesmo tempo. Não foi enviada avaliação para evitar gravar opinião fictícia de teste como avaliação real.
- Couriers 1 e 2 foram confirmados indisponíveis após o fluxo. Courier 1 registra recusa da oferta; courier 2 sem rota ativa.
- PR #308 corrigiu erro de submit causado por `event.currentTarget.reset()` após rerender/unmount. Regressão coberta pelos testes do módulo e pela passagem ponta a ponta com estados subsequentes após atualização.

## Gates e testes

- `npm run policy:preflight -- --agent AG-DEV --scope lily-courier-form-submit`: passou.
- `npm run test:lily-ui`: 25 arquivos, 110 testes passaram.
- `npm run check`: passou.
- `npm run build:lily`: passou; limites JS/CSS e gzip ficaram dentro do orçamento configurado.
- `npm test`: 84 arquivos, 441 passaram, 3 ignorados.
- `npm run build`: passou.
- `git diff --check`: passou.
- CI dos PRs #305, #306, #307 e #308 passou; PR #308 incluído em canonical como `1040ee8dacc215d29e64161dc8b0f7b95866d06a`.

## Migrations e deploy

- Migration de origem de localização sintética aplicada no deploy #305; deploy #308 sem migrations pendentes.
- Deploy de `1040ee8dacc215d29e64161dc8b0f7b95866d06a` concluído às 2026-10-31 07:45 UTC. Log `/srv/carro-chefe/data/deploy-logs/deploy-20261031-074521-1040ee8dacc2.log`; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261031-074521-1040ee8dacc2.evidence`.
- Verificações de runtime, build, health e smoke do deploy passaram.

## Bloqueios/riscos

- Pedido, pagamento, localização de courier e entrega usados foram simulados. Nenhuma cobrança ou notificação externa ocorreu.
- A submissão de avaliação ficou intencionalmente pendente para não contaminar os dados com nota/review fictícia; UX e seleção das três categorias foram homologadas.
- Fluxo validado com localização sintética e método ETA/status; GPS ao vivo segue fora do escopo desta versão.

## Homologação/dependências externas

- IAB Codex em desktop 1280×720 e mobile 390×844. Tela courier conferida visualmente nos dois tamanhos. Em mobile, `innerWidth=390`, `documentElement.scrollWidth=375`, `body.scrollWidth=375`, sem overflow horizontal. Viewport foi restaurado ao final.
- Conta courier 1 mostrou “Ficar disponível”, sem rota; courier 2 também confirmado offline após entrega.
- Capturas e páginas de confirmação permanecem nas abas temporárias do IAB, não versionadas.

## Próxima ação exata

Nenhuma para esta homologação. A versão está concluída em produção; seguir para o próximo item priorizado no roadmap.

