# CookLily template editor and phone input UX

- status: completed
- owner: AG-DEV
- branch: `codex/cooklily-template-editor`, `codex/cooklily-simulator-greeting`
- base_branch: `cooklily/canonical`
- base_sha_verified: `15591416ae096bb4990779a5bcb36441604f242a` (canonical after PR #249)
- head_sha_verified: `15591416ae096bb4990779a5bcb36441604f242a`
- pull_requests: PR #247 merged; PR #248 closed as superseded; PR #249 merged (https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/249)
- last_verified_at: 2026-10-29 15:45 UTC
- interruption_state: none

## Entrega

Painel CookLily para criar e editar templates WhatsApp, testar no chat local com árvore de mensagens e estimativa configurável de custo por categoria/origem/janela/câmbio; correções de UX nos campos de nome e telefone.

## Concluído e persistido

- PR #247 integrado à `cooklily/canonical`; migrations aditivas `20261029130000_lily_whatsapp_template_variable_names` e `20261029190000_lily_whatsapp_simulator` implantadas.
- Editor com categorias utility/marketing/authentication, componentes de template, variáveis nomeadas atômicas com inserir por toque/arraste, copiar/recortar/colar e formatação do texto WhatsApp.
- Simulador local permite escolher templates salvos, renderiza texto, links, botões/respostas rápidas, cabeçalho/rodapé e prévias de mídia; árvore define gatilhos, respostas e próximos nós.
- Cotação configurável por categoria, início da conversa e janela de 24 horas, franquia de serviço e câmbio USD/BRL. Fluxos e preços persistem ao salvar; mensagens simuladas ficam no navegador.
- PR #249 removeu saudação inicial `undefined · agora`, representando-a como mensagem de sistema sem remetente/categoria.
- QA real no navegador integrado Codex em desktop e mobile, URL `https://carrochefe.com/lilyacai/painel/whatsapp`: template `Boas vindas` selecionado e exibido com link Cardápio e botões `Tirar dúvidas`/`Fazer uma crítica`; estimate de 1 mensagem Utility: US$ 0.0068 / R$ 0.0365; greeting sem `undefined`. Nenhum template foi enviado à Meta.
- Deploy final SHA `15591416ae096bb4990779a5bcb36441604f242a` concluído; deploy log `/srv/carro-chefe/data/deploy-logs/deploy-20261029-153011-15591416ae09.log` e evidence associado.

## Gates e testes

- Suíte final de integração/deploy: `73 files, 380 tests passed`; `npm run check` e build completo passaram no deploy oficial.
- CI dos PRs #247 e #249 passou; Quality Node 20/24, Workbook Snapshot, Excel Recipe Linux/Windows, Windows Supervisor e Tool Health.
- `npm run build:lily` passou dentro do budget de artefatos Lily; aviso já existente de chunk JS acima de 500 KiB permanece.
- Health check e smoke test externo passaram após o deploy final.
- Homologação desktop/mobile executada exclusivamente no navegador integrado Codex; layout responsivo, template renderizado e preço atualizado verificados.

## Migrations

- `20261029130000_lily_whatsapp_template_variable_names` aplicada.
- `20261029190000_lily_whatsapp_simulator` aplicada.

## Bloqueios/riscos

- Valores iniciais do cotador são referências editáveis e modelo simplificado; podem variar por país, tiers, volume e mudanças no rate card, e não são fatura Meta.
- Chunk principal existente ainda gera aviso de tamanho; build e deploy passaram.
- Envio/criação/aprovação na Meta não faz parte do painel. Nenhuma mensagem real foi enviada.

## Homologação/dependências externas

- Sessão admin autenticada pelo usuário no navegador integrado Codex. Deploy via SSH agent e deployer `/usr/local/sbin/carro-chefe-deploy`.
- Coexistence não foi ativado. Considerar somente se a operação precisar manter atendimento manual pelo WhatsApp Business App no mesmo número com a Cloud API. API continua sujeita à tarifa normal; eventual BSP pode adicionar assinatura/markup. Confirmar elegibilidade e custos específicos antes de onboarding.

## Próxima ação exata

Nenhuma ação pendente para esta entrega. Em eventual mudança do rate card, atualizar cotações pelo painel; se CookLily decidir usar atendimento manual junto da API, confirmar elegibilidade e custos com a Meta/BSP e planejar ativação separadamente.
