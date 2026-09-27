# CookLily — pendências de UX, segurança e administração

**Data da consolidação:** 27/09/2026  
**Branch canônica de integração:** `cooklily/canonical`  
**Origem:** QA/homologação manual + revisão do código candidato das Entregas 05–07.

## Regra de fechamento

Uma pendência marcada como **corrigida no candidato** não está encerrada até ser publicada e revalidada em navegador real, principalmente no mobile. O feedback de QA real prevalece sobre documentos antigos que declaravam a correção pronta.

Status usados:

- **ABERTA** — problema ainda existe ou requisito ainda não foi implementado;
- **PARCIAL** — existe mitigação, mas o requisito completo não está atendido;
- **CANDIDATO / REVALIDAR** — o código canônico contém uma correção, mas o comportamento observado em homologação/produção ainda precisa ser revalidado;
- **CONTEÚDO / OPERAÇÃO** — depende de mídia/dados/decisão operacional, não apenas código.

## P0

| ID | Pendência | Estado na consolidação | Critério de aceite |
|---|---|---|---|
| UX-001 | Header mobile exibe navegação desktop junto de carrinho/avatar/hambúrguer. | **IMPLEMENTADO TECNICAMENTE / QA REAL PENDENTE.** Breakpoint mobile esconde desktop-nav e teste estrutural protege a regra. | Em 320–760 px, somente marca, conta, carrinho e hambúrguer ficam no header; nenhuma navegação desktop é renderizada/visível. |
| UX-002 | Menu hambúrguer extrapola lateralmente e corta “WhatsApp”. | **IMPLEMENTADO TECNICAMENTE / QA REAL PENDENTE.** Drawer usa largura limitada ao contêiner/viewport, sem `100vw`, e mantém itens em largura integral. | Nenhum item é cortado em 320 px ou mais; todos os links são tocáveis e legíveis sem scroll horizontal. |
| UX-003 | `overflow-x: hidden` mascara overflow estrutural. | **RESOLVIDA TECNICAMENTE.** Corte global e `overflow: clip` do main foram removidos; carrossel deixou de alargar a página; teste impede regressão. QA real ainda verifica outras telas. | Remover a dependência de corte global, identificar/eliminar o elemento que excede a viewport e manter apenas proteção não destrutiva após prova de ausência de overflow. |
| UX-004 | Combos deveriam ser carrossel horizontal com pista do próximo card. | **IMPLEMENTADO TECNICAMENTE / QA REAL PENDENTE.** ComboCarousel usa scroll-snap e o peek vem do tamanho do slide, sem exceder a página. | Mobile mostra um combo principal + parte do próximo, com gesto horizontal, snap e sem empurrar produtos várias telas para baixo. |
| UX-005 | Prioridade comercial invertida: hero/busca/combos empurram produtos abaixo da dobra. | **RESOLVIDA TECNICAMENTE / QA REAL PENDENTE.** Ordem é busca → hero compacto → escolha da semana → contador/grid → combos e existe teste de ordem. | Primeira navegação mobile chega ao grid rapidamente; combos não bloqueiam a descoberta dos produtos. |
| SEC-001 | Falta logout acessível na interface. | **RESOLVIDA TECNICAMENTE.** “Sair da conta” existe no perfil; teste estrutural protege a UI e auth.test cobre CSRF/revogação. | Usuário autenticado consegue encerrar sessão pela UI em no máximo dois passos, e a sessão deixa de ser válida. |
| SEC-002 | Staff/admin sem MFA. | **RESOLVIDA TECNICAMENTE / DEPLOY E ENROLLMENT PENDENTES.** TOTP obrigatório por sessão, segredo AES-256-GCM, recovery codes hashed/one-time e deploy fail-closed sem chave. | Definir TOTP ou WebAuthn, recuperação segura, provisionamento e armazenamento de segredos; exigir segundo fator para funções privilegiadas. |

## P1

| ID | Pendência | Estado na consolidação | Critério de aceite |
|---|---|---|---|
| UX-006 | Logo/header espremidos. | **CANDIDATO / REVALIDAR.** Header foi reorganizado, e abaixo de 390 px o texto da marca é ocultado. | Marca permanece reconhecível sem colisão com ações em 320/360/390/430/768 px. |
| UX-007 | “C” de visitante parece conta autenticada. | **CANDIDATO / REVALIDAR.** `ProfileBubble(null)` usa ícone neutro. | Guest sempre vê ícone neutro de conta/login, nunca inicial que pareça sessão ativa. |
| UX-008 | Menu mobile deveria ser vertical. | **CANDIDATO / REVALIDAR.** Drawer vertical implementado. | Itens em coluna, largura integral do drawer, sem barra horizontal. |
| UX-009 | Instagram ocupa prioridade excessiva no header mobile. | **CANDIDATO / REVALIDAR.** No mobile a navegação desktop é escondida e redes ficam na seção secundária do drawer. | Header mobile prioriza marca, conta, carrinho e menu; redes ficam dentro do drawer. |
| UX-010 | Ranking deveria ficar no menu mobile. | **CANDIDATO / REVALIDAR.** | Ranking não disputa espaço fixo no header mobile e permanece acessível no drawer. |
| UX-011 | Hero do cardápio grande demais. | **CANDIDATO / REVALIDAR.** Há redução para título de 28–38 px no mobile. | Hero não consome a primeira dobra; intenção de compra permanece prioritária. |
| UX-012 | Menu aberto cobre conteúdo sem backdrop. | **CANDIDATO / REVALIDAR.** Backdrop implementado. | Drawer aberto possui backdrop claro e bloqueia interação acidental com conteúdo abaixo. |
| UX-013 | Menu não fecha clicando fora. | **CANDIDATO / REVALIDAR.** Backdrop chama `closeMenu`. | Clique/toque fora fecha o drawer. |
| UX-014 | Menu não fecha com Escape. | **CANDIDATO / REVALIDAR.** Listener de `Escape` implementado. | Escape fecha o drawer e devolve foco ao botão do menu. |
| A11Y-001 | Falta tratamento de foco/focus trap no menu. | **PARCIAL.** O foco inicial e retorno ao botão existem, mas não há focus trap explícito. | Tab/Shift+Tab não escapam de forma confusa do drawer aberto; foco é restaurado no fechamento. |
| A11Y-002 | Botões mobile de 40×40 px. | **CANDIDATO / REVALIDAR.** Header usa 44×44 px; alguns CTAs de combo ainda usam 40/42 px. | Controles interativos principais têm alvo mínimo 44×44 px, salvo exceção devidamente justificada. |
| UX-015 | “Criar conta” quebra em duas linhas no menu. | **CANDIDATO / REVALIDAR.** Drawer vertical dá largura total ao link. | CTA permanece legível sem quebra inadequada em 320 px. |
| CSS-001 | Regra genérica escondia o primeiro link “Início”. | **CANDIDATO / REVALIDAR.** A regra genérica antiga não está presente na linha canônica. | Nenhum seletor genérico de `nav:first-child` afeta menus independentes. |
| ADM-001 | Staff não via “Painel administrativo” no menu. | **CANDIDATO / REVALIDAR.** Link condicional para staff/admin existe no drawer. | Staff/admin encontra o painel pela navegação sem digitar URL. |
| AUTH-001 | Login administrativo não preservava destino. | **CANDIDATO / REVALIDAR.** Login usa `?next=` validado e páginas administrativas geram destino. | Acesso a `/painel/*` sem sessão -> login -> volta ao destino original. |
| ADM-002 | Instagram, WhatsApp, endereço e fidelidade misturados em “Entrega e retirada”. | **ABERTA.** A tela ainda se chama “Operação e configurações” dentro de `/painel/entrega`. | Criar página **Configurações da loja** para identidade/canais/endereço/fidelidade; manter entrega/retirada só com fulfillment. |
| ADM-003 | Não há gerenciamento de equipe. | **CANDIDATO / REVALIDAR.** Existe `/painel/equipe` admin-only para promoção, papel, suspensão e sessões. | Admin gerencia equipe sem editar SQLite e toda mutação gera auditoria. |
| SEC-003 | `staff` e `admin` sem distinção real. | **CANDIDATO / REVALIDAR.** Entrega 07 separa leitura/operação de mutações financeiras/equipe. | Testes provam menor privilégio: staff não executa ações exclusivas de admin. |
| AUTH-002 | Cadastro não confirma senha. | **CANDIDATO / REVALIDAR.** Campo de confirmação existe. | Cadastro bloqueia senhas divergentes antes do envio. |
| AUTH-003 | Não existe “Esqueci minha senha”. | **ABERTA.** | Definir canal de verificação confiável e implementar recuperação sem permitir takeover por mero conhecimento do telefone. |
| AUTH-004 | Não existe alterar senha. | **CANDIDATO / REVALIDAR.** Perfil oferece troca autenticada de senha. | Cliente e equipe conseguem trocar senha; política de 8/12 caracteres aplicada. |
| SEC-004 | Não existe encerrar outras sessões. | **PARCIAL.** Trocar senha revoga outras sessões, mas não existe controle dedicado de sessões. | Criar ação explícita “Encerrar outras sessões” e, idealmente, listar/revogar sessões privilegiadas individualmente. |

## P2

| ID | Pendência | Estado na consolidação | Critério de aceite |
|---|---|---|---|
| CAT-001 | Filtros não persistem na URL. | **CANDIDATO / REVALIDAR.** Catálogo usa `useSearchParams`. | Refresh, voltar/avançar e link compartilhado preservam filtros. |
| CAT-002 | Busca não é refletida na URL. | **CANDIDATO / REVALIDAR.** | Query de busca é serializada e restaurada pela URL. |
| UX-016 | Navegação não mostra estado ativo claramente. | **PARCIAL / REVALIDAR.** `NavLink` é usado; falta validar contraste/estado visual em todos os contextos. | Página atual possui estado ativo inequívoco e acessível. |
| CAT-003 | “N opções encontradas” aparece depois dos combos. | **CANDIDATO / REVALIDAR.** No canônico o contador está imediatamente antes do grid. | Contador fica colado ao resultado que descreve. |
| CAT-004 | Combos sem seção visual nomeada. | **CANDIDATO / REVALIDAR.** Carrossel tem “Economize combinando” + “Combos”. | Hierarquia comunica claramente que é uma seção comercial de combos. |
| CAT-005 | Cards de combo pesados e sem foto. | **CANDIDATO / REVALIDAR.** `ComboCarousel` usa capa de produto/combinação. | Cards compactos, com fotografia real quando disponível, sem três blocos vinho dominando a página. |
| MIDIA-001 | Capas repetidas/placeholder reduzem apetite. | **CONTEÚDO / OPERAÇÃO — ABERTA.** | Priorizar fotografia real por produto; placeholder deve ser transitório e não dominar a grade. |
| CAT-006 | CTA de combo desproporcionalmente grande. | **CANDIDATO / REVALIDAR.** CTA foi compactado, porém alguns alvos ainda precisam cumprir 44 px. | CTA visualmente proporcional ao conteúdo e com alvo de toque adequado. |
| CAT-007 | Busca + filtros ocupam espaço vertical excessivo. | **CANDIDATO / REVALIDAR.** Barra sticky + filtros recolhíveis implementados. | Busca fica compacta/sticky; filtros expandem somente sob demanda. |
| CAT-008 | Grid em duas colunas fica enterrado atrás dos combos. | **CANDIDATO / REVALIDAR.** Ordem atual coloca grid antes do carrossel. | Em mobile, produtos aparecem antes da seção de combos e duas colunas permanecem utilizáveis. |
| CAT-009 | Link de destaque não abre diretamente o produto/modal. | **ABERTA / REFORMULADA.** O canônico já não usa o hash antigo, porém o CTA da escolha da semana na landing ainda leva genericamente a `/cardapio`. | Definir deep-link estável de produto (slug/query/rota) e abrir/rolar para o produto correto sem depender de hash ignorado. |

## Pendências técnicas paralelas

Além dos 40 achados acima:

1. corrigir e validar novamente o gate da Entrega 07;
2. selecionar/integrar provedor automático de pagamento ou formalizar Pix manual como fase inicial;
3. publicar e homologar a linha canônica na VPS por SHA imutável;
4. separar a página **Configurações da loja** de fulfillment;
5. concluir MFA e recuperação de senha antes de ampliar a equipe;
6. sincronizar workbook financeiro, alergênicos e fotografias restantes;
7. completar Entregas 08–10: operação de pedidos, analytics first-party e hardening.

## Ordem recomendada de execução

1. **Gate técnico da Entrega 07** verde.
2. **P0 mobile + P0 segurança** e QA em 320/360/390/430/768 px.
3. Deploy controlado da linha canônica.
4. Revalidação dos itens marcados **CANDIDATO / REVALIDAR**.
5. P1 administrativos/autenticação.
6. P2 de catálogo/conteúdo.
7. Entregas 08–10.


## Evidência do patch P0

Runtime validado: `0f3e894f4993eea1c07aed881bad4ea4525e1674`.

- CI `36332050698`: success;
- CodeQL `36332050747`: success;
- Node 20: 27 arquivos / 131 testes;
- Node 24: 27 arquivos / 131 testes;
- Tool Health: success.

Relatório técnico: `entregas/P0_UX_SEGURANCA_2026-09-27.md`.

Os P0 de implementação foram tratados. Itens marcados **QA REAL PENDENTE** não devem ser considerados homologados visualmente até teste em aparelhos reais após deploy.
