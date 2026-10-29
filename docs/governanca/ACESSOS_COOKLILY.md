# Acessos CookLily — operação na release canônica

Este runbook existe na `main` para orientar operadores do site CookLily, cuja implementação isolada é mantida em `cooklily/canonical`. Execute os passos somente em uma release que contenha os scripts indicados. A `main` não inclui o runtime nem os scripts CookLily.

**Nunca versionar ou enviar ao chat:** chave privada, senha, TOTP, cookie, token, arquivo de ambiente ou dump do banco. Use somente chave pública para cadastrar um agente.

## Acesso SSH à VPS

Obtenha host/IP, usuário e porta na área SSH da Hostinger. Na primeira conexão, confira o fingerprint informado pela Hostinger:

```powershell
ssh -i "$env:USERPROFILE\.ssh\<arquivo-da-chave>" -o IdentitiesOnly=yes -p <porta> <usuario>@<ip-ou-host>
```

Não deduza usuário, porta ou IP pelo domínio. A chave SSH da VPS é distinta da chave de autenticação do painel CookLily.

## Conta de teste e papéis

1. Crie a conta de cliente pelo cadastro público CookLily.
2. Entre no painel com uma conta admin e abra **Painel → Equipe** (`/lilyacai/painel/equipe`).
3. Localize a conta e marque **Conta de teste**. Só clientes (`customer`) podem receber essa flag; ela não concede acesso administrativo.
4. Para conceder papel operacional a uma conta existente na VPS, use o telefone e o script instalado pela release canônica:

```bash
sudo lily-promote-user <telefone> staff
sudo lily-promote-user <telefone> courier
sudo lily-promote-user <telefone> admin
```

O script exige conta ativa, não cria usuários nem faz downgrade de admin, revoga sessões e audita a promoção. `staff` é o papel padrão quando omitido. Admin deve ser concedido somente a operador autorizado; conta de teste é um atributo separado de cliente.

## Agente/LLM com acesso ao painel

O acesso ao painel de agente é uma identidade admin dedicada CookLily com chave Ed25519 própria, sem senha/MFA humano. Não concede acesso SSH à VPS. Os comandos abaixo existem em `cooklily/canonical` e precisam estar instalados pela release:

```powershell
ssh-keygen -t ed25519 -a 64 -f "$env:USERPROFILE\.ssh\cooklily_agent_ed25519" -C "cooklily-agent"
ssh-add "$env:USERPROFILE\.ssh\cooklily_agent_ed25519"
Get-Content "$env:USERPROFILE\.ssh\cooklily_agent_ed25519.pub" | Set-Clipboard
```

Passe somente a chave `.pub` ao operador da VPS. Ele cadastra a chave na conta admin dedicada:

```bash
sudo lily-agent-key register <telefone-da-conta-admin-do-agente> "ssh-ed25519 AAAA..." "CookLily agente"
sudo lily-agent-key status <telefone-da-conta-admin-do-agente>
```

Login em rotina, a partir do checkout canônico:

```powershell
$env:COOKLILY_AGENT_BROWSER = "codex"
node tools/lily-agent-auth.mjs login
```

Use o navegador integrado do Codex para abrir o handoff. Revogue chave e sessões com `sudo lily-agent-key revoke <telefone-da-conta-admin-do-agente>`. A sessão de painel é curta; não copie ticket, cookie ou assinatura para logs.

## Ambiente protegido

Os scripts usam `/etc/carro-chefe/carro-chefe.env` por padrão ou o caminho fornecido localmente em `CARRO_CHEFE_ENV_FILE`. `LILY_DATABASE_URL` aponta para o banco Lily dedicado. Não leia/imprima o conteúdo do arquivo de ambiente para “descobrir” valores: verifique o estado com `lily-agent-key status`, `lily-promote-user` ou pelo painel.

## Referência canônica

O guia completo e atualizado fica em `docs/lily-acai/GUIA_ACESSOS_COOKLILY.md` na branch `cooklily/canonical`, com o fluxo de login humano, tabela de papéis, conta de teste e diagnóstico seguro.
