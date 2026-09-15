# Acesso à Hostinger e atualização da VPS

Data: 14/09/2026. Estado: plano solicitado pelo proprietário, sem alteração de credenciais, infraestrutura ou release em produção nesta execução. Responsável técnico: AG-DEV; autorização de operações: proprietário/Gestão.

## Ponto de partida confirmado

Uma versão da landing já está publicada em `https://carrochefe.com`. O navegador confirmou formulário, consentimento e redes sociais; a configuração pública da API respondeu HTTP 200 com as versões de consentimento. A próxima migração é uma **atualização do site existente**, não a primeira substituição do WordPress.

A versão pública ainda não é a nova apresentação do Chefão desta branch. Não identificamos, apenas pela página pública, o commit publicado, o servidor escolhido, o caminho do banco, o serviço supervisor ou o procedimento usado na migração anterior. Esses dados precisam ser inventariados antes de tocar na release. Não há conexão autenticada Hostinger/SSH configurada e verificada nesta tarefa.

## Três formas complementares de acesso

| Canal | Como usar no trabalho | Pré-requisito | Uso recomendado |
|---|---|---|---|
| hPanel no navegador conectado | Inspecionar a VPS correta, domínio, DNS, recursos e estado dos backups | Sessão autenticada do proprietário no navegador autorizado, identificação da VPS | Descoberta e conferência das configurações do provedor |
| Web Console da Hostinger | Abrir hPanel → VPS → Manage → Web Console e operar o terminal pelo navegador | Sessão autenticada; console da VPS certa | Diagnóstico inicial ou recuperação quando SSH não estiver disponível |
| SSH pelo terminal local | Usar alias da VPS, usuário de deploy e chave local; executar comandos auditáveis de inspeção/release | Host/IP e porta confirmados, fingerprint validada e chave autorizada | Canal principal para arquivos, build, migrações e reinício do serviço |

A Hostinger documenta o [Web Console no hPanel](https://www.hostinger.com/support/how-to-use-the-web-console-in-hostinger/) e a [configuração de chaves SSH para VPS](https://www.hostinger.com/support/4792364-how-to-use-ssh-keys-at-hostinger-vps/). Recomendo SSH para releases repetíveis e o console como alternativa de recuperação; essa escolha é uma proposta para o projeto.

Para automação do provedor, também existem API, CLI e MCP oficiais. A documentação informa que tokens herdam as permissões do usuário e podem expirar; por isso, não assumir que um token da conta principal é restrito a este site. Avaliar apenas os recursos necessários, preferindo consultas inicialmente. CLI/MCP não substituem automaticamente o acesso ao sistema de arquivos e ao banco da VPS. [Referência oficial de API e ferramentas](https://docs.hostinger.com/api-reference/overview).

## Preparação de acesso

1. Identificar a VPS que serve o domínio, usuário de serviço, porta de SSH, diretório da aplicação, caminho persistente do banco, proxy ativo e processo supervisor. Registrar o inventário sem tokens, senhas, chaves privadas ou dados de clientes.
2. Reutilizar acesso existente autorizado. Se não existir, preparar uma chave de deploy dedicada e o conjunto mínimo de permissões, para instalação pelo responsável autorizado. A chave privada fica fora do repositório e não deve ser enviada em mensagem; somente a pública é instalada no destino. Senhas e MFA são preenchidos pelo proprietário no fluxo de login quando necessário.
3. Configurar alias local, por exemplo `carrochefe-prod`, com host/porta reais e verificação da identidade do servidor. Não desabilitar a checagem de host. O nome é uma proposta; o alias ainda não existe como conexão validada nesta tarefa.
4. Limitar escrita à aplicação e arquivos necessários; operações privilegiadas específicas, como validar/recarregar Nginx ou reiniciar o serviço, devem ter autorização explícita. Não conceder administração irrestrita por conveniência.
5. Validar primeiro consultas: identidade do usuário, diretório, versão do Node, espaço em disco, estado do serviço, commit atual, saúde local e metadados do banco. Evitar ler `.env` inteiro ou imprimir logs que contenham contatos.

Para colocar esse acesso em prática, faltam a sessão autenticada/forma de conexão e o inventário acima. A preparação não requer enviar senhas na conversa. A criação de credenciais e concessão de acesso serão uma ação específica, com destinatário, escopo e duração definidos; este plano não cria tais permissões.

## Procedimento proposto para cada atualização

Reutilizar os [templates existentes](../../deploy/README.md), depois de compará-los com a configuração realmente publicada. Não sobrescrever a infraestrutura atual presumindo que corresponde ao exemplo.

1. **Identificar a release:** partir de um commit aprovado da `main`, com CI concluído, resumo das mudanças e possibilidade de retorno à release anterior. Esta entrega não cria migração de schema, mas releases futuras podem criar.
2. **Preparar fora da versão ativa:** diretório de release separado; dependências do lockfile; `check`, testes e build. A configuração real permanece fora do Git. Banco persistente e uploads não ficam dentro do diretório substituível da release.
3. **Proteger os dados existentes:** backup consistente do SQLite, incluindo seu modo WAL, com mecanismo próprio de backup; validar leitura/restauração em cópia isolada. Não copiar apenas o arquivo principal durante escrita nem substituir produção pela base local de QA.
4. **Revisar migrações:** comparar histórico aplicado e pendente; testar numa cópia controlada; avaliar compatibilidade da release anterior com o schema novo. Usar migração de deploy, nunca reset/seed de desenvolvimento sobre clientes reais.
5. **Preparar a troca:** apresentar commit, backup validado, migrações, impacto no serviço e rollback. Como a solicitação atual é de planejamento da Hostinger, executar a troca somente quando a publicação dessa release estiver autorizada.
6. **Ativar e verificar:** selecionar release preparada, reiniciar/recarregar somente o serviço necessário e verificar saúde, assets, HTTPS, entrada direta/campanha, formulário e API. Manter Fastify em loopback atrás do proxy; manter `/gestao` e APIs internas bloqueados até autenticação administrativa homologada.
7. **Comprovar persistência:** usar um contato de teste designado para produção, com finalidade e destino definidos, sem confundi-lo com cliente comercial. Conferir registro, campanha e consentimento no banco por leitura minimizada. Verificar duplicidade e recusa de analytics. Não enviar mensagem externa automaticamente só para validar o formulário.
8. **Registrar e encerrar:** documentar commit ativo, horário, resultados e localização protegida do backup; observar erros após a troca. Se falhar, voltar à release anterior quando compatível. Se o schema mudou de modo incompatível, a recuperação do banco exige procedimento próprio para não perder inscrições posteriores.

Não alterar DNS por rotina se o domínio já aponta para o serviço correto. Mudanças de host, certificado ou proxy só entram quando o inventário mostrar necessidade; preservar MX e outros registros alheios ao site.

## Como tornar o processo repetível

Primeira evolução: um procedimento versionado de inspeção e release, executado via SSH, que recebe o commit aprovado, valida pré-condições e registra resultado sem segredos. Posteriormente, um workflow manual com ambiente de produção protegido, credencial de deploy restrita e logs minimizados. Não habilitar deploy automático em todo merge sem uma decisão específica.

Critério de pronto do acesso: conexão autenticada validada, servidor identificado, versão e banco atuais documentados, leitura de saúde comprovada, permissões revisadas e plano de rollback concreto. Critério de pronto da próxima publicação: nova UI e nova chamada visíveis no domínio, API operacional e persistência de produção comprovada. Isso é independente da conclusão do PR no GitHub.
