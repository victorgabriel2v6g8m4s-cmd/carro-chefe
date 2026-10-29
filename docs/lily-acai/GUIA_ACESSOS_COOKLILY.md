# Guia de acessos CookLily para operadores e agentes

Este guia descreve como entrar na VPS, autenticar um agente no painel, criar conta de teste e atribuir papéis. Use somente as chaves e contas dedicadas já previstas pelos scripts. **Nunca cole chave privada, senha, TOTP, cookie, token ou arquivo `.env` no Git, em prompt, screenshot ou log.**

## 1. Acesso SSH à VPS

O acesso à VPS é independente do acesso ao painel CookLily. No Hostinger, consulte os dados SSH mostrados para o servidor: endereço/IP, usuário e porta. Não tente deduzi-los a partir do domínio.

No Windows, use a chave privada SSH que já foi instalada/autorizada no servidor:

```powershell
ssh -i "$env:USERPROFILE\.ssh\<arquivo-da-chave>" -o IdentitiesOnly=yes -p <porta> <usuario>@<ip-ou-host>
```

Na primeira conexão, compare o fingerprint exibido pelo terminal com o fingerprint SSH mostrado pela Hostinger antes de aceitar. Se a chave já estiver no `ssh-agent` e configurada em `~/.ssh/config`, use `ssh <alias-configurado>`. Não coloque a chave privada em argumentos, variáveis versionadas ou neste repositório.

## 2. Entrar no painel com uma identidade de agente/LLM

O agente usa uma conta administrativa CookLily dedicada, identificada como agente. Isso concede os mesmos recursos de painel daquele papel, mas não concede shell na VPS. O login de agente usa desafio OpenSSH e sessão curta; não usa a senha ou o MFA de um humano.

### Preparação local, uma única vez

No computador do agente, crie uma chave própria Ed25519 (não reutilize a chave SSH da VPS) e mantenha a chave privada protegida por frase secreta e pelo `ssh-agent`:

```powershell
ssh-keygen -t ed25519 -a 64 -f "$env:USERPROFILE\.ssh\cooklily_agent_ed25519" -C "cooklily-agent"
ssh-add "$env:USERPROFILE\.ssh\cooklily_agent_ed25519"
Get-Content "$env:USERPROFILE\.ssh\cooklily_agent_ed25519.pub" | Set-Clipboard
```

Copie apenas a chave pública para o operador da VPS por canal administrativo aprovado. O registro recebe o telefone da conta administrativa dedicada, chave pública e rótulo; não recebe senha nem chave privada:

```bash
sudo lily-agent-key register <telefone-da-conta-admin-do-agente> "ssh-ed25519 AAAA..." "CookLily agente"
sudo lily-agent-key status <telefone-da-conta-admin-do-agente>
```

O comando de status deve confirmar papel `admin`, conta ativa, identidade `agent` e chave ativa. Para revogar e encerrar sessões:

```bash
sudo lily-agent-key revoke <telefone-da-conta-admin-do-agente>
```

### Login de rotina

Na raiz do checkout, carregue a chave no agente SSH e execute:

```powershell
ssh-add "$env:USERPROFILE\.ssh\cooklily_agent_ed25519"
$env:COOKLILY_AGENT_BROWSER = "codex"
node tools/lily-agent-auth.mjs login
```

Abra o endereço temporário informado **na aba integrada do navegador do Codex**. O ticket é de uso único, válido por 60 segundos, e é removido do histórico pela página de handoff. A sessão expira em duas horas. A CLI não deve imprimir nem persistir ticket.

Configuração opcional, somente na sessão local do shell:

- `COOKLILY_AGENT_SSH_KEY`: caminho alternativo da chave privada, se não usar `~/.ssh/cooklily_agent_ed25519`.
- `COOKLILY_AGENT_ORIGIN`: origem HTTPS alternativa; padrão `https://carrochefe.com`.
- `COOKLILY_AGENT_BROWSER=codex`: entrega para o navegador integrado do Codex.
- `COOKLILY_AGENT_ALLOW_INSECURE_LOCAL=1`: apenas para desenvolvimento local em localhost; nunca em produção.

Essas variáveis não contêm segredos. Não grave valores locais em `.env` versionado.

## 3. Login humano no painel CookLily

Abra `https://carrochefe.com/lilyacai/entrar` e autentique com a conta humana própria. Admins humanos usam a senha e o MFA configurados para sua conta. A conta de agente não aceita login por senha. O painel exige o papel apropriado no servidor; esconder rotas no frontend não concede nem remove permissões.

## 4. Criar uma conta de teste

1. Crie a conta normalmente em `https://carrochefe.com/lilyacai/cadastro` e confirme o acesso ao número conforme o fluxo de cadastro disponível.
2. Entre no painel com uma conta admin CookLily.
3. Abra **Painel → Equipe** (`/lilyacai/painel/equipe`) e localize a conta pelo telefone/nome.
4. Marque **Conta de teste**. A ação só é aceita para papel `customer`; confirme que a etiqueta aparece na linha da conta.
5. Para removê-la do modo de teste, desmarque a mesma opção.

Contas de teste seguem o nível de acesso do papel da conta. A flag não concede acesso staff/admin. Elas ficam fora do ranking público e de interações de usuários comuns; admins e a própria conta de teste podem ver o ranking interno, com posições recalculadas sem lacunas para o público.

## 5. Configurar o nível de acesso

O papel de acesso e a flag de teste são controles separados:

| Papel | Uso | Como atribuir |
|---|---|---|
| `customer` | Cliente; pode ser marcado como conta de teste | Cadastro normal; flag de teste em Painel → Equipe |
| `staff` | Operação do painel conforme permissões da equipe | Admin em Painel → Equipe ou CLI na VPS |
| `courier` | Fluxos de entregador | Admin em Painel → Equipe ou CLI na VPS |
| `admin` | Administração completa CookLily | Operador autorizado pela CLI na VPS; não atribuir a contas de teste de cliente |

Para promover uma conta existente pela VPS, use o telefone em formato nacional ou internacional; o script normaliza o valor, exige conta ativa, não cria usuários e não faz downgrade de admin:

```bash
sudo lily-promote-user <telefone> staff
sudo lily-promote-user <telefone> courier
sudo lily-promote-user <telefone> admin
```

Sem papel explícito, o script promove para `staff`. A promoção revoga as sessões existentes, audita a mudança e pode exigir atualização de senha/MFA. A administração da equipe também pode alterar papéis permitidos no painel; backend valida papel, estado, auto-bloqueio e existência de outro admin ativo.

## 6. Banco e ambiente da VPS

Os scripts administrativos leem o ambiente protegido indicado por `CARRO_CHEFE_ENV_FILE` (padrão `/etc/carro-chefe/carro-chefe.env`) e usam `LILY_DATABASE_URL` para localizar o SQLite CookLily. Não copie esse arquivo para o checkout e não mostre seu conteúdo ao agente. O caminho e o banco devem permanecer os configurados pelo deploy.

## 7. Diagnóstico seguro

- Para verificar o agente, use `sudo lily-agent-key status <telefone>`; compartilhe somente identidade, papel, estado da chave e fingerprint se necessário.
- Para verificar o papel, consulte a linha da conta em Painel → Equipe ou a saída final de `lily-promote-user`.
- Nunca execute `cat`/`type` do arquivo de ambiente para diagnóstico em chat ou log.
- Não compartilhe captura que contenha telefone completo, chave, cookie, QR/TOTP ou ticket.
- Mudanças de papel são auditadas. Use a revogação de chave para remover acesso do agente; suspender usuário revoga sessões conforme os controles do servidor.

## Referências de implementação

- [Autenticação administrativa de agente](./AUTENTICACAO_AGENTE_ADMIN.md)
- [Deploy CookLily na VPS](./DEPLOY_VPS.md)
- Scripts: `tools/lily-agent-auth.mjs`, `deploy/scripts/lily-agent-key` e `deploy/scripts/lily-promote-user`.
- Painel de equipe: `apps/lily_acai/src/features/admin/AdminTeamPage.tsx`.
