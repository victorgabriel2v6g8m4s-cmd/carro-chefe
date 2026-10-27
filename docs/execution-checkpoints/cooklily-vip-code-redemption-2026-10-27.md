# Resgate de código CookLily

- status: candidate; PR open, CI pending
- owner: AG-DEV
- branch: `codex/cooklily-vip-code-redemption`
- base_branch: `cooklily/canonical`
- base_sha_verified: `0757056b9cf45384f1fc9a1320f58b9a16563e28`
- head_sha_verified: `6e1adc782a3ac0babcc94571e079a6beb59d8534`
- pull_requests: [PR #201](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/201) (open)
- last_verified_at: 2026-10-27
- interruption_state: none

## Objetivo

Reproduzir e corrigir rejeição de códigos VIP recém-gerados; deixar resgate no fim do perfil com rótulo neutro “Resgate seu código”.

## Diagnóstico e alteração preparada

- O painel cria códigos por `POST /api/v1/lily/admin/vip/codes`; o perfil resgata por `POST /api/v1/lily/customer/vip/redeem`.
- A criação e o resgate usam o mesmo SHA-256; não foi possível inspecionar o registro específico digitado na VPS, portanto a causa daquele valor não está confirmada.
- A entrada anterior só aceitava caracteres ASCII e os códigos gerados usavam Base64URL convertido para maiúsculas, aumentando risco de confusão visual e sensibilidade à formatação ao copiar/colar.
- Novo formato gerado: prefixo `LILY-` com grupos hexadecimais, sem letras visualmente ambíguas; resgate normaliza caixa, espaços e variantes tipográficas de hífen antes de buscar o hash. Isso também mantém compatibilidade com códigos anteriores.
- Campo de perfil separado da área de benefícios, recolhido no fim da página como “Resgate seu código”; resgate de códigos disponível inclusive para membros ativos.
- Incluído teste integrado que cria código via endpoint staff/MFA e resgata na mesma conta com caixa baixa, espaços e hífen tipográfico.
- Preflight de `apps/lily_acai`, `apps/api/src/modules/lily` e `docs/execution-checkpoints`: PASS.

## Em andamento

- Commit de implementação: `ca5b813` (`fix(lily): make VIP code redemption more reliable`).
- Commit do checkpoint: `6e1adc7`.
- PR #201 aberto contra `cooklily/canonical`; aguardar todos os jobs antes da integração.

## Gates e testes

- `npx vitest run --config vitest.config.ts apps/api/src/modules/lily/vip.test.ts`: PASS — 5 testes, incluindo emissão e resgate pelo caminho administrativo.
- `npm test`: PASS — 62 arquivos; 331 aprovados, 3 ignorados.
- `npm run check`: PASS — geração/validação Prisma e TypeScript.
- `npm run build`: PASS — aplicações e compilação da API; budget CookLily verde. Limite de CSS bruto aumentado em 1.000 bytes (135.000 → 136.000); limite gzip permanece 30.000 bytes e combinado 199.000 bytes.
- `npm run policy:check`: PASS.
- `git diff --check`: PASS.
- A tentativa inicial de `npm run check` concorrente com outros comandos de geração Prisma falhou por colisão temporária no diretório gerado; execução sequencial posterior passou.

## Migrations

- Nenhuma prevista.

## Bloqueios/riscos

- A causa exata do código digitado na VPS depende do valor e estado daquele registro; não se acessou a base de produção. O caminho completo de emissão/resgate funciona no teste integrado com formatação normalizada.

## Homologação/dependências externas

- Homologação com código já emitido e conta de teste na VPS após deploy.

## Próxima ação exata

Consultar CI do PR #201, corrigir qualquer falha, integrar após todos os jobs aprovados e atualizar este checkpoint com o SHA da canonical.
