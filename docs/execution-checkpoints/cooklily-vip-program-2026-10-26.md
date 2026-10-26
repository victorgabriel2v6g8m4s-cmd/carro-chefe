# Programa VIP CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-vip-program`
- base_branch: `cooklily/canonical`
- base_sha_verified: `9c0e52275026c0384b38a65174e8ec2c78529b28`
- head_sha_verified: working tree (uncommitted; base `9c0e52275026c0384b38a65174e8ec2c78529b28`)
- pull_requests: none
- last_verified_at: 2026-10-26
- interruption_state: none

## Escopo

Registrar e implementar convite/resgate VIP, associação e ativação após consentimento versionado, página de termos e cancelamento, acesso antecipado a produtos VIP, configuração administrativa de teaser e pontos para candidatura, e vouchers de cupons vinculados a códigos promocionais.

## Decisões registradas

- Códigos são normalizados e armazenados como hash; exibição do código administrativo fica limitada ao momento da criação.
- Resgatar convite concede estado `invited`; somente consentir com os termos vigentes e clicar em inscrever ativa o VIP.
- O aceite inclui analytics próprios e necessários ao programa, com escopo descrito nos termos. Não autoriza analytics de terceiros nem compartilhamento de respostas abertas sem nova finalidade/base legal.
- Cancelar a inscrição encerra benefícios VIP e registra revogação do consentimento. Dados históricos ficam sujeitos à minimização e obrigações legais descritas nos termos.
- VIP obtido por pontos segue o mesmo consentimento e fluxo de ativação; o limite é ajustável no painel.
- Produtos restritos mantêm a imagem, título substituído por interrogações e frase teaser configurável para clientes comuns; usuários VIP veem os dados e podem comprar normalmente. API e cotação validam acesso no servidor.
- Códigos de campanha podem conceder cupons existentes como direitos individuais; limites, validade e status do cupom continuam sob as regras do próprio cupom.

## Estado verificado

- Canonical avançou para `9c0e52275026c0384b38a65174e8ec2c78529b28`; este trabalho parte dessa revisão.
- `npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai,apps/api,packages/lily-database,docs/lily-acai` passou.
- Central operacional em `127.0.0.1:4173` não respondeu ao bootstrap; execução não pôde ser registrada no runtime local.

## Concluído e persistido

- [x] Schema e migration VIP com códigos hash, resgates idempotentes, status da membership, eventos próprios e vouchers vinculados à conta.
- [x] APIs autenticadas para painel, código/benefício, consentimento, inscrição/cancelamento, candidatura por pontos e eventos de lançamentos.
- [x] Projeção do catálogo e cotação/pedido com autorização VIP no servidor; cupons pessoais restritos ao titular.
- [x] UI do perfil/termos, convite dourado com confete, coroa, teaser e selo de produto VIP; painel de configuração e geração de códigos.
- [x] Documentação de políticas, dados, retenção e critérios em `docs/lily-acai/PROGRAMA_VIP.md`.

## Em andamento

- Revisar todos os caminhos, excluir artefatos locais, criar commit e abrir PR draft contra a canonical.

## Gates e testes

- `npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai,apps/api,packages/lily-database,docs/lily-acai`: PASS.
- `npm run check`: PASS (Prisma generate/validate e TypeScript).
- `npm test`: PASS (61 arquivos, 327 aprovados, 3 ignorados).
- `npm run test:lily-ui`: PASS (13 arquivos, 62 testes).
- `npm run build`: PASS após atualizar a baseline ao bundle medido (633940 JS raw, 168490 JS gzip, 130610 CSS raw) e deixar folga pequena no budget (650000 JS raw, 173000 JS gzip, 135000 CSS raw e 199000 gzip combinado); há aviso Vite informativo para chunk principal >500 KiB.
- `npm run policy:check`: PASS.
- `git diff --check`: PASS após as últimas edições.
- Revisão browser mobile Playwright com respostas de API mockadas: cartão VIP bloqueado revela `???`, blur e selo sem ação de compra; perfil VIP mostra coroa; sem erros de console após mocks.

## Migrations

- Migration `20261026180000_lily_vip_program`; schema Prisma válido. Migration aplicada em banco SQLite descartável via SQL/better-sqlite3 após erro vazio do Prisma migrate engine no Windows. Conferir no CI em Linux e no procedimento da VPS antes do deploy.

## Bloqueios/riscos

- Runtime da Central Operacional `127.0.0.1:4173` não respondeu ao bootstrap; sem registro de execução nessa Central.
- Build mostra chunk Vite principal CookLily acima do warning genérico de 500 KiB, embora o budget do projeto esteja verde.
- A canonical ainda não foi publicada nem homologada na VPS.

## Homologação/dependências externas

- Após integração, depende do deploy operacional para validação de login, resgate, consentimento, compra VIP e ocultação de lançamentos.

## Próxima ação exata

- Fazer commit da entrega, abrir PR draft contra `cooklily/canonical`, acompanhar CI, integrar por squash quando os checks passarem e atualizar o checkpoint com SHAs e IDs de PR/CI.
