# Estúdio de templates WhatsApp da CookLily

## Onde fica

O painel staff/admin está em `/lilyacai/painel/whatsapp`. O estúdio fica no início da página, depois do estado resumido da integração e antes do checklist e da fila de notificações.

## Como usar

1. Escolha categoria Meta (Utilidade, Marketing ou Autenticação), identificador interno e idioma.
2. Monte cabeçalho, mensagem, rodapé e botões. Use variáveis posicionais como `{{1}}` no conteúdo.
3. Para componente especial, abra **Avançado · editar componentes JSON da Meta**, altere o array e use **Validar e aplicar JSON**.
4. Confira a prévia ao lado. Digite uma fala na caixa de cliente; a simulação local aplica o rascunho atual como resposta e substitui as variáveis pelos exemplos editáveis.
5. Salve como rascunho e use **Copiar JSON da Meta** ou **Ver JSON pronto para copiar** para cadastrar manualmente no WhatsApp Manager. A análise/aprovação continua na Meta.

## Componentes visuais

- Categorias: `UTILITY`, `MARKETING`, `AUTHENTICATION`.
- Cabeçalhos: texto, imagem, vídeo, documento e localização.
- Corpo, rodapé e botões: resposta rápida, URL, telefone, copiar código, Flow e OTP.
- O editor avançado permite representar outros componentes Meta em JSON, incluindo estruturas aninhadas como carrossel e oferta por tempo limitado, sujeito à validação final do WhatsApp Manager.

## Separação do envio real

O simulador é estado React local. Não chama a API, não usa telefone, não persiste o texto digitado e não envia mensagem à Meta/WhatsApp. O painel não cria nem submete templates ao WhatsApp Manager. A ação **Ativar nas notificações** é restrita no servidor a modelos de utilidade vinculados a uma etapa operacional, com corpo/rodapé; categorias promocionais, autenticação, mídia e componentes especiais permanecem rascunhos para cadastro manual.

Os componentes completos ficam em `LilyWhatsAppMessageTemplate.componentsJson`, no banco exclusivo Lily. Os campos antigos `bodyTemplate` e `variablesJson` continuam para compatibilidade com notificações transacionais existentes. A migration é aditiva e define `[]` como padrão para registros anteriores.

## Validação

O payload avançado deve conter array de no máximo 10 componentes com um `type` em caixa alta. O servidor limita profundidade, quantidade de propriedades e tamanho JSON. O texto é exibido como texto React, sem HTML injetado.
