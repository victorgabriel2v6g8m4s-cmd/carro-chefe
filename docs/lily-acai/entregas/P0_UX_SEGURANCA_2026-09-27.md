# Patch P0 — UX mobile e segurança privilegiada CookLily

**Data:** 27/09/2026  
**Branch:** `cooklily/canonical`  
**Runtime validado:** `0f3e894f4993eea1c07aed881bad4ea4525e1674`  
**PR técnico de gate:** #81 — fechado sem merge após validação.

## Objetivo

Tratar os P0 levantados na homologação:

- header/menu mobile e overflow estrutural;
- hierarquia comercial produtos × combos;
- logout acessível;
- MFA obrigatório para staff/admin.

## UX mobile / overflow

### Alterado

- removido `overflow-x: hidden` global de `html/body/#root`;
- removido `overflow: clip` usado no `main` como mascaramento;
- o viewport do carrossel deixou de usar `width: calc(100% + ...)` + margem negativa;
- o “peek” do próximo combo passa a vir do tamanho do slide, não de uma página artificialmente mais larga;
- modal mobile usa largura do contêiner em vez de `100vw`;
- drawer mobile limita largura por `calc(100% - 20px)`;
- ordem comercial preservada: busca/filtros → hero compacto → escolha da semana → contador/grid → combos.

### Guardas automatizadas

`apps/lily_acai/src/structure.test.ts` falha se:

- o corte horizontal global voltar;
- o `main` voltar a esconder overflow estrutural;
- o carrossel voltar a aumentar a largura da página;
- a navegação desktop deixar de ser escondida no breakpoint mobile;
- o drawer perder backdrop/click-away/Escape;
- combos voltarem a aparecer antes do grid;
- o carrossel perder scroll-snap/peek;
- o logout deixar de existir na UI do perfil.

**Limite:** testes automatizados não substituem QA visual em aparelho real. Os itens mobile ficam como implementados tecnicamente, mas só encerram homologação após teste em 320/360/390/430/768 px.

## Logout

O perfil mantém `Sair da conta`, chamando `POST /api/v1/lily/auth/logout` com CSRF.

Cobertura existente de backend comprova:

- logout sem CSRF é rejeitado;
- logout válido revoga sessão;
- cookie/sessão revogada deixa de autenticar.

A nova guarda estrutural comprova que a ação permanece presente no frontend.

## MFA staff/admin

### Política

- customer não exige MFA;
- staff/admin exige TOTP para qualquer rota administrativa;
- promoção continua exigindo upgrade de senha quando aplicável;
- senha válida sem MFA permite apenas o escopo de conta necessário para configurar/verificar o segundo fator;
- cada nova sessão privilegiada precisa verificar MFA novamente;
- sessão privilegiada continua com TTL reduzido;
- RBAC staff/admin continua separado.

### Persistência

Migration:

`20260927160000_lily_staff_mfa`

Campos:

- `LilyUser.mfaEnabled`;
- `LilyUser.mfaSecretEncrypted`;
- `LilyUser.mfaRecoveryCodesJson`;
- `LilyUser.mfaEnrolledAt`;
- `LilySession.mfaVerifiedAt`.

### Proteção do segredo

O segredo TOTP é cifrado com AES-256-GCM antes de persistir.

Produção exige:

`LILY_MFA_ENCRYPTION_KEY`

A chave deve conter 32 bytes aleatórios em base64url. O deployer falha fechado antes das migrations se ela estiver ausente ou inválida.

A chave:

- não usa `VITE_*`;
- não entra no Git;
- não é enviada ao frontend, exceto o segredo TOTP durante o provisionamento autenticado da própria conta;
- deve permanecer estável enquanto houver segredos TOTP cifrados no banco.

### Provisionamento

1. staff/admin autentica com senha;
2. se necessário, atualiza senha privilegiada;
3. perfil solicita senha atual novamente para iniciar MFA;
4. backend gera segredo TOTP e persiste somente versão cifrada;
5. usuário cadastra a chave no autenticador;
6. código de 6 dígitos confirma o provisionamento;
7. backend marca a sessão atual como MFA verificada;
8. outras sessões da conta são revogadas;
9. oito recovery codes são mostrados uma única vez.

### Recovery codes

- gerados com aleatoriedade criptográfica;
- armazenados somente como SHA-256 vinculado ao usuário;
- cada código funciona uma única vez;
- uso remove o hash correspondente;
- códigos brutos não entram em audit log ou banco.

### Rotas

```text
GET  /api/v1/lily/customer/security/mfa/status
POST /api/v1/lily/customer/security/mfa/setup
POST /api/v1/lily/customer/security/mfa/confirm
POST /api/v1/lily/customer/security/mfa/verify
```

Todas as mutações exigem sessão Lily + CSRF e possuem rate limit dedicado.

### Autorização administrativa

`requireLilyStaff` agora exige, nesta ordem:

1. role staff/admin;
2. upgrade de senha concluído;
3. MFA configurada;
4. MFA verificada na sessão;
5. CSRF quando a mutação exigir.

Erros distinguíveis:

- `LILY_STAFF_PASSWORD_UPGRADE_REQUIRED`;
- `LILY_STAFF_MFA_SETUP_REQUIRED`;
- `LILY_STAFF_MFA_REQUIRED`.

## Testes e gates

Gate do runtime `0f3e894f4993eea1c07aed881bad4ea4525e1674`:

- CI run `36332050698`: **success**;
- CodeQL run `36332050747`: **success**;
- Node 20: **27 arquivos / 131 testes** — success;
- Node 24: **27 arquivos / 131 testes** — success;
- migration Lily em banco vazio — success;
- static checks — success;
- builds de produção — success;
- Tool Health / Linux — success;
- Workbook Snapshot — success;
- Excel Recipe Linux/Windows — success;
- Windows Supervisor — success.

`mfa.test.ts` cobre:

- bloqueio de admin sem MFA;
- senha atual obrigatória no setup;
- segredo persistido cifrado;
- confirmação TOTP;
- emissão de recovery codes;
- nova sessão privilegiada bloqueada até segundo fator;
- recovery code de uso único;
- TOTP após novo login;
- customer sem exigência de MFA.

## Pendências após este patch

### Ainda exigem QA real

- confirmar header/menu em aparelhos reais;
- confirmar ausência de scroll horizontal em todas as telas;
- confirmar swipe/snap do carrossel;
- conferir foco/teclado do drawer;
- validar ergonomia do fluxo MFA em aparelho real.

### Antes de deploy

1. gerar/configurar `LILY_MFA_ENCRYPTION_KEY` na VPS;
2. backup do banco Lily;
3. usar SHA imutável validado;
4. aplicar migration;
5. smoke de customer;
6. promover/homologar uma conta admin controlada;
7. configurar MFA;
8. confirmar que admin sem segundo fator recebe 403;
9. confirmar recovery code;
10. manter pagamentos desabilitados até a homologação comercial correspondente.

Nenhum deploy foi executado por este patch.
