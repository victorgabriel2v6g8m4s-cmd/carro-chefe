# Landing, campanha e cadastro — estado em 14/09/2026

Responsável técnico: AG-DEV. Revisão local baseada em `origin/main` (`8600557`), com a apresentação do Chefão recuperada da entrega `a5f966d`. Intenção na Central: `cmu1n722t002uw8tpwafi2n9y`; execução: `cmu1n94yg003cw8tphqdyk3uq`.

## Resultado

A aplicação local apresenta o Chefão inteiro, recortado, sem texto ou logo dentro da foto; utiliza o novo `base_no-background.png` no site, preto predominante e controles arredondados. Cadastro direto, cadastro pela campanha, duplicidade, recusa de analytics e recuperação após falha de rede foram exercitados no navegador com a API real e banco SQLite exclusivo de QA.

**Uma versão do site já foi migrada para `carrochefe.com`.** Na revalidação após a atualização do proprietário, em 14/09/2026, o endereço público da campanha passou a abrir “Carro Chefe — Lista dos Primeiros”, com o título “O Carro Chefe está chegando.”, formulário de WhatsApp, consentimento e redes sociais. O WordPress observado anteriormente é um registro histórico superado. A versão pública ainda é anterior ao novo hero com recorte do Chefão e às correções desta entrega; visualizar o formulário não comprova persistência na base de produção. [Captura atual do domínio](evidencias-2026-09-14/dominio-publico.jpg).

## Com campanha e sem campanha

| Etapa | QR-001 + banner | Acesso direto ou outra campanha |
|---|---|---|
| Primeira tela | Identificação do convite exclusivo acima do Chefão | Pré-inauguração em Campo Grande |
| Convite | Cartão “Achou o QR. Encontrou o acesso à cupons e promoções exclusivas.” | Convite simples para acompanhar a abertura |
| Ação principal | “Quero meu acesso à cupons e promoções exclusivas” | “Me avise quando abrir” |
| Formulário | Acesso à cupons e promoções exclusivas | Novidades da inauguração e promoções |
| Confirmação nova | Confirma recebimento do cadastro exclusivo | Confirma entrada na lista |
| Perguntas frequentes | Explica o benefício da campanha | Explica o que a lista oferece |

Não foram inventados desconto, brinde, prazo, limite de vagas ou data de abertura. O visitante direto continua recebendo uma experiência acolhedora. O visitante do QR percebe um convite especial, condicionado ao cadastro naquela campanha.

A URL atual passou a determinar a experiência: direto → QR → direto funciona na mesma aba. O cache antigo de atribuição deixou de sobrepor a URL. Links internos de privacidade e retorno preservam os parâmetros; `/welcome` mantém a campanha ao redirecionar. Parâmetros inválidos não ativam exclusivo. Uma URL de campanha pode ser compartilhada; `qr_scan` significa entrada com identificador de QR, não prova uma leitura física por câmera.

O cadastro duplicado mantém a origem da primeira inscrição e não promete converter automaticamente um cadastro anterior em exclusivo. Participação de clientes já cadastrados em novas campanhas precisa de regra e modelo próprios, previstos no dashboard.

## Evidências de responsividade e uso

| Largura útil em CSS px | Direto: largura / conteúdo | Campanha: largura / conteúdo |
|---|---|---|
| 320 | 320 / 320 | 320 / 320 |
| 375 | 375 / 375 | 375 / 375 |
| 390 | 390 / 390 | 390 / 390 |
| 768 | 768 / 768 | 768 / 768 |
| 1024 | 1024 / 1024 | 1024 / 1024 |
| 1440 | 1440 / 1440 | 1440 / 1440 |

Nenhum elemento visível de `main` ultrapassou os limites horizontais nessas medições. Não foi apenas uma inspeção de `overflow:hidden`: também foram comparadas as caixas dos elementos. O botão de cadastro tem altura mínima de 56 px e pode crescer para acomodar a nova chamada. [Medições](evidencias-2026-09-14/responsividade.json).

Emulação adicional com viewport 390 × 844, escala 2 e toque habilitado: largura do documento e conteúdo em 390, ponteiro de toque detectado, campo `tel` com `inputmode=tel`. Isso valida o navegador emulado; não substitui homologação em aparelhos físicos, Safari/iOS ou navegador interno do Instagram.

Teclado: Tab e Enter no atalho inicial levam o foco a `cadastro`, com contorno visível. Envio vazio foca o telefone; telefone preenchido sem consentimento foca a caixa de aceite. Sucesso e duplicidade recebem foco e anúncio de status. Links externos abrem seus destinos em outra aba. Não foram enviadas mensagens nem realizados follows.

- [Página direta no celular](evidencias-2026-09-14/direto-mobile.jpg).
- [Campanha no celular](evidencias-2026-09-14/campanha-mobile.jpg).
- [Campanha no computador](evidencias-2026-09-14/campanha-desktop.jpg).

## Cadastro e banco

Ambiente: `http://127.0.0.1:4193`, mesma aplicação/API do repositório; banco isolado `.runtime/landing-qa-20260914.db`, com as migrações versionadas. A base operacional original permaneceu intacta. Os contatos de QA são sintéticos, não são clientes nem ficam disponíveis para envio de mensagens.

| Cenário exercitado | Resultado observado |
|---|---|
| Direto, analytics recusado | Uma inscrição ativa, campanha/QR nulos, consentimento e versões gravados; zero eventos antes de permitir medição |
| QR-001/banner | Inscrição ativa com QR e campanha corretos; confirmação exclusivo na UI |
| Mesmo telefone novamente | Resposta `duplicate`, sem nova linha e sem trocar a origem |
| Telefone vazio ou sem aceite | Erro acessível; envio válido não prossegue |
| Falha de rede simulada | Mensagem humana e “Tentar novamente”; após reconectar, concluiu sem redigitar os dados |
| Clique em WhatsApp e Instagram | Destinos corretos e um evento de cada gravado com campanha banner |
| Recarregar na mesma sessão consentida | Novos `landing_view`, sem duplicar apenas pelo efeito do React |

A fotografia agregada do banco após essas etapas contém **3 inscrições sintéticas: 1 direta e 2 da campanha**, uma tentativa duplicada, 1 clique em WhatsApp, 1 em Instagram e uma sessão com múltiplas cargas. São evidências de funcionamento, **não métricas de desempenho da campanha**. [Agregado sem telefones, nomes ou IDs de sessão](evidencias-2026-09-14/banco-agregado.json). Capturas posteriores podem gerar mais visualizações no banco local; o arquivo registra um ponto do teste.

Testes automatizados de persistência também verificam recusa de telefone inválido/aceite falso, honeypot sem linha real e rejeição de telefone dentro da metadata analítica. As migrações foram aplicadas à fixture com o mesmo procedimento SQL dos testes existentes, pois `prisma migrate deploy` retornou erro genérico do engine neste Windows; isso não valida o comando de implantação neste ambiente.

## Como eu reagiria como cliente desconhecendo a marca

As reações abaixo são uma simulação de jornada, não pesquisa com consumidores reais.

| Momento | Minha reação provável | Positivo | Atrito / melhoria |
|---|---|---|---|
| Vejo o banner na avenida | “Que lanche é esse? Quero ver melhor.” | Foto inteira pode despertar apetite rapidamente | Verificar legibilidade e distância real do QR na peça impressa; não foi teste de câmera em campo |
| Escaneio hoje o domínio público | “A marca está chegando; posso deixar meu número.” | Já existe landing com formulário e identidade da marca | Publicar a apresentação atual do Chefão e homologar persistência na produção |
| Entro na landing corrigida | “É um lanche com espeto dentro da baguete.” | Foto grande, nome e explicação curta | Confirmar aparência da foto tratada com o produto servido |
| Percebo a campanha | “Boa, achei um convite especial.” | exclusivo identificado sem exigir Instagram | Benefício ainda amplo; aprovar oferta concreta e suas regras quando disponíveis |
| Entendo a pré-inauguração | “Ainda não posso pedir; posso receber o aviso.” | Não cria expectativa de pedido imediato | Data, endereço completo e referência de esquina farão falta até confirmação |
| Informo WhatsApp | “Só um dado, consigo fazer rápido.” | Um campo, botão grande, aceite explícito | Leitura do aceite pode ser demorada na rua; manter clareza sem esconder a finalidade |
| Cadastro conclui ou já existe | “Funcionou. Agora espero o aviso.” | Resposta clara, sem exigir outra ação | Falta operação comprovada de boas-vindas e entrega dos benefícios; gravar não significa enviar mensagem |
| Visito o Instagram / retorno | “Quero ver quem prepara e onde vai ser.” | Redes opcionais e acesso direto honesto | Mostrar bastidores reais e medir retorno entre sessões, hoje ainda não identificável |

## Pontos positivos e próximos ajustes

O preto valoriza o lanche e aproxima a página de uma lanchonete; os textos ficam na página, legíveis e acessíveis. Imagem com versão de 800 px reduz transferência no celular. Um único campo, foco gerenciado e recuperação de erro diminuem esforço. A campanha tem contraste claro sem depreciar visitantes diretos.

Ainda há bastante rolagem até o formulário quando se explora toda a página; os atalhos resolvem o acesso rápido. Vale experimentar uma chamada mais curta no cartão exclusivo e comparar conversão consentida, sem alterar a oferta no meio do teste. O logo pequeno perde detalhes do desenho: avaliar futuramente uma versão simplificada aprovada. A cópia fiel do PNG tem 934.623 bytes; produzir um derivado otimizado para web é uma melhoria de carregamento pendente, preservando o original. Core Web Vitals em rede móvel real ainda não foram medidos. A prévia social utiliza recorte transparente; homologar renderização no WhatsApp/Instagram e, se necessário, criar uma capa social com fundo controlado.

Próximos passos, em ordem:

1. Atualizar a versão já publicada no domínio com esta entrega, mediante autorização da release; homologar cadastro na base de produção e verificar restauração/monitoramento. Seguir o [plano de acesso Hostinger/VPS](PLANO_HOSTINGER_VPS.md). Não confundir merge com deploy.
2. Confirmar benefício exclusivo, participação de clientes já inscritos, processo de cancelamento e envio efetivo de boas-vindas/avisos. Completar o aviso de privacidade com os dados oficiais pendentes.
3. Conferir fidelidade da foto, divulgar localização/data quando aprovadas e testar QR impresso e aparelhos físicos.
4. Implementar o [dashboard administrativo de campanhas](DASHBOARD_CAMPANHAS_PROPOSTA.md), começando pelas métricas já coletadas e distinguindo suas limitações.

## Arquitetura e verificação da entrega

`main.tsx` compõe a página; `campaign.ts` resolve a URL e `campaign-content.ts` centraliza as variações de texto. `SignupForm.tsx` controla a inscrição, com validação visual em `signup-phone.ts`; a API valida novamente antes do Prisma/SQLite. `analytics.ts` envia eventos opcionais sem nome/telefone e preserva a origem de eventos em espera até o aceite. Não há nova tabela, checkout, alteração de ERP ou endpoint administrativo nesta entrega.

Arquivos criados: módulos de campanha, analytics, formulário/telefone, testes de regressão/persistência, imagens públicas e documentação/evidências. Modificados: entrada HTML, composição/estilos do site, mapa no `apps/site/AGENTS.md` e manifesto de política correspondente. Nenhum original de marca/foto removido ou sobrescrito; o checkout `qr-app` foi preservado. A integração usa uma branch isolada sobre `main`, com PR e squash.

Validações locais: `npm test` (5 testes legados + 69 Vitest), `npm run check`, `npm run build` e `npm run policy:check`. O build inclui site, gestão, QR Lab e API. A revisão textual solicitada pelo proprietário usa “acesso à cupons e promoções exclusivas” na página e na documentação, com nova verificação de quebra de linha. Detalhes da integração e CI serão registrados no PR desta entrega. O dashboard é especificação futura, não uma tela já implementada.
