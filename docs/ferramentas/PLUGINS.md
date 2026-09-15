# Plugins e conectores

Inventário observado em **2026-09-15** para a conta/ambiente atual. Instalação e conexão são estados do usuário, não garantias do repositório; confirme novamente antes de uma tarefa crítica. O diretório de plugins é dinâmico e deve ser pesquisado quando uma integração externa puder evitar trabalho manual.

## Instalados

| Plugin | Capacidades úteis ao Carro Chefe | Processamento | Work | Limitações/acesso | Score típico |
|---|---|---|---|---|---:|
| GitHub | ler/buscar repositório, branches, commits, issues/PRs, CI e publicar alterações permitidas | baixo/médio | baixo/médio | permissões da instalação e proteção de branch; alguns endpoints administrativos não ficam expostos | 96 |
| Gmail | buscar/ler threads, anexos, criar rascunhos, enviar/encaminhar e organizar mensagens | baixo/médio | baixo/médio | depende da conta conectada; ações externas exigem intenção clara e política de dados | 90 |
| Notion | pesquisar workspace, criar/editar documentação e trabalhar com dados/projetos suportados | médio | médio | depende de páginas/permissões compartilhadas; não substitui fonte oficial versionada do Git | 86 |
| Canva | criar/refinar designs, editar texto/mídia, feedback visual, Brand Check, resize e fluxos suportados | médio/alto | médio/alto | conta Canva conectada; Bulk Create pode exigir Enterprise; aprovação de Marca continua necessária | 92 |

## Disponíveis, não instalados

| Plugin | Capacidades | Processamento | Work | Limitações/acesso | Score potencial |
|---|---|---|---|---|---:|
| Google Drive | Drive como entrada para Docs, Sheets e Slides; localizar, ler e editar conteúdo suportado | médio | médio | requer instalação/conexão explícita e permissões nos arquivos | 91 |
| Google Calendar | ler agenda/disponibilidade e criar, mover, cancelar ou responder eventos | baixo/médio | baixo/médio | requer instalação/conexão explícita; cuidado com fuso e ações externas | 88 |

## Marketplace sob demanda

Há outros plugins descobríveis para analytics, mídia paga, reuniões, CRM, produtividade e visualização. Eles **não** entram automaticamente no stack aprovado só por existirem no marketplace. Quando uma tarefa exigir uma capacidade externa não coberta pelos itens acima:

1. pesquise o diretório de plugins pela capacidade/provedor;
2. compare leitura/escrita, permissões, preço/plano, privacidade, confiabilidade e manutenção;
3. prefira integração somente leitura quando escrita não for necessária;
4. registre a proposta em `PENDENCIAS.md` se a instalação/conexão ainda não estiver aprovada;
5. registre em `BLOQUEIOS.md` se a ausência de conexão impedir a tarefa.

## Quando preferir plugin

Prefira plugin a copiar/colar dados quando ele oferece acesso autorizado, atualizado e estruturado ao sistema de origem. Prefira ferramenta própria quando a automação precisa ser determinística, testada em CI, operada sem sessão de usuário ou integrada à produção.

## Segurança

Nunca registre tokens, cookies ou segredos do plugin no repositório. Dados pessoais ou operacionais acessados por conectores seguem minimização, finalidade e controle de acesso do projeto. Instalar/conectar um plugin exige ação explícita do usuário quando o produto solicitar autorização.