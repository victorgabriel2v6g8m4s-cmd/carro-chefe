# Separação de domínios e promoção de releases CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/domain-split-release-track`
- base_branch: `origin/cooklily/canonical`
- base_sha_verified: `348c57e504f0b7652aa6ce72b5575a263a293c85`
- head_sha_verified: trabalho documental ainda não commitado
- pull_requests: nenhum
- last_verified_at: 2026-11-01 America/Sao_Paulo
- interruption_state: none

## Entrega solicitada

Documentar incidente TLS/reputação e a separação CookLily/Carro Chefe; preparar migração de CookLily para repo próprio; reduzir deploy ao runtime CookLily; implementar teste em `carrochefe.com/lilyacai` e promoção administrativa do mesmo artefato para `licalily.com`; homologar o domínio público.

## Estado verificado ao iniciar

- Checkout iniciou detached em `origin/cooklily/canonical` SHA `348c57e504f0b7652aa6ce72b5575a263a293c85`, sem alterações locais.
- `origin/main` SHA `cdf3d91258a4439d22afc0eda508c6ece0d2f325`; branch local `main` está um commit à frente. `origin/cooklily/canonical` está dois commits atrás da branch local `cooklily/canonical`; não publicar refs sem reconciliar.
- A documentação atual de CookLily ainda diz que a parceria pública CookLily × Carro Chefe permanece ativa.
- O deploy documentado ainda usa checkout Git e o serviço `carro-chefe` na VPS, com builds do Carro Chefe e Lily. A documentação afirma ferramentas locais fora do runtime, porém reconhece que o deploy ainda parte de checkout integral. Não há prova de pacote mínimo no VPS.
- O plano atual tem migrations e suites core e Lily em scripts agregados; o isolamento/seletividade de CI/deploy ainda precisa ser auditado no código.
- A investigação TLS de 28–30/10 foi registrada. O caso `dns.adguard.com` foi reproduzido como sinkhole DNS; comunicação ao fornecedor foi enviada conforme checkpoint. A resposta posterior com referência a VirusTotal foi informada pelo proprietário e precisa ser anexada/evidenciada no relatório, se disponível.
- Consulta pública em 01/11: `licalily.com` e `www` resolvem para Cloudflare; `curl -I` retornou HTTP 429 e cabeçalhos Cloudflare/Hostinger. Ainda sem homologação funcional do domínio.
- Nenhuma migração de DNS, criação de repositório, alteração de VPS ou publicação em `licalily.com` ocorreu nesta execução até este checkpoint.

## Concluído e persistido

- [x] Criado rascunho documental para registrar decisão, fatos e plano de releases: `docs/governanca/COOKLILY_DOMINIOS_RELEASES_E_REPUTACAO_2026-11-01.md` (ainda não commitado).

## Em andamento

- Registrar a mudança de decisão em `docs/lily-acai/DECISOES_PENDENCIAS.md` sem apagar o histórico antigo.
- Reproduzir o registro de decisão em branch da `main` e `cooklily/canonical` via fluxo de PR/merge.
- Auditar deploy, artefatos, testes seletivos, migrations e dependências antes de separar código/repositório.

## Gates e testes

- Pesquisa externa e DNS/HTTP(S) consultados; 429 registrado como achado, não como aceitação.
- `git diff --check`: pendente após documentos.
- Testes/build: não aplicáveis a mudanças puramente documentais, mas gates apropriados serão exigidos para alterações do pipeline/runtime conforme `REGRAS.md`.

## Migrations

- Nenhuma alteração de schema.
- Estratégia pendente: migrar apenas banco Lily, backup, compatibilidade e rollback. Nunca migrar o banco Carro Chefe por release CookLily.

## Bloqueios/riscos

- O 429 em `licalily.com` precisa ser identificado e resolvido antes de divulgar.
- A mudança entre domínios pode afetar cookies, OAuth, CORS, CSRF, e-mail, links, Meta webhooks e tokens/callbacks.
- Criar repositório GitHub e alterar DNS/VPS exige acessos efetivos; conferir conexões sem expor segredos.
- Não criar repositório público contendo histórico, uploads, envs ou segredos. Definir visibilidade e licença pelo estado do repo original e regra existente.
- O domínio de homologação permanece compartilhado com o site raiz Carro Chefe; não alterar `/` nem sua configuração de DNS como parte do site teste Lily.

## Dependências de homologação

- Repositório novo CookLily e workflow de build/deploy.
- DNS, certificado, origem/Cloudflare e regra que gera HTTP 429 em `licalily.com`.
- Artefato imutável, release list e painel/admin com autorização.
- Contas de teste e smoke em desktop/mobile sem misturar identidades/bancos.
- Configuração atual dos webhooks Meta, redes sociais e serviços de login/e-mail.

## Próxima ação exata

Concluir a documentação de decisões no checkout CookLily; revisar o diff; preparar PR para `cooklily/canonical`; depois propagar o mesmo registro no fluxo de integração de `main`. Em seguida auditar o script de deploy e os workflows antes de criar ou migrar qualquer repositório.

