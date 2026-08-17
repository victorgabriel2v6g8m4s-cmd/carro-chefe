# QR Lab

Editor frontend de QR Codes do Carro Chefe em `apps/qr_manipulator`.

## Recursos

- geração integral no navegador, sem upload obrigatório;
- URL, texto, WhatsApp e Wi-Fi;
- módulos quadrados, arredondados ou em pontos;
- olhos quadrados, arredondados ou circulares;
- cores, margem, correção de erro e resolução de exportação;
- background com opacidade e proteção de contraste;
- imagem central, escala e remoção simples de fundo por amostragem das bordas;
- presets dos arquivos reciclados de `background/` e `center/`;
- tracking por `cc_qr`, `cc_campaign` e `cc_variant` para URLs;
- exportação PNG, projeto JSON reeditável e manifesto de tracking;
- persistência local automática no navegador.

## Executar

Na raiz: `npm run dev:qr`. Para build: `npm run build:qr`.

O app usa React/Vite já presentes no monorepo e não adiciona dependências. O antigo `index.js` permanece como referência legada.

## Limites atuais

O encoder embutido suporta versões 1 a 10 do QR em byte mode. Uma URL que exceda essa capacidade precisa ser encurtada. A reedição fiel usa `*.qr-project.json`; um PNG isolado não preserva os parâmetros do design.

Consulte `TRACKING.md` para o contrato com o Centro Operacional.
