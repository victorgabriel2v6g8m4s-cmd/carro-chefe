# Riscos e decisões

## Decisões críticas abertas

| ID | Decisão | Por que bloqueia | Recomendação inicial |
|---|---|---|---|
| `DEC-001` | “Paulistinha” versus “Carro‑Chefe” | cardápio, anúncio e impressão | usar Carro‑Chefe como família; confirmar se Paulistinha permanece |
| `DEC-002` | ERP e adquirente | catálogo, totem, dados e integração | prova de conceito com Chefão antes de contratar |
| `DEC-003` | regras do Chefão | cadastro, custo e produção | definir repetição de espetos e quantidades |
| `DEC-004` | escopo do embed em `/cardapio` | segurança/UX | exigir confirmação técnica; manter redirect como fallback |
| `DEC-005` | local, medidas e infraestrutura | layout, licenças e equipamentos | levantamento presencial documentado |
| `DEC-006` | data e orçamento de abertura | priorização e contratação | decidir após G1 e orçamento preliminar |
| `DEC-007` | marca Catupiry/Seara no texto | compra e comunicação | usar marca só quando o item real e o acordo permitirem |

## Riscos prioritários

| ID | Risco | Prob. | Impacto | Mitigação |
|---|---|---:|---:|---|
| `RISK-001` | ponto/quiosque sem licença ou infraestrutura suficiente | 3 | 5 | validar antes de obra/compra irreversível |
| `RISK-002` | ERP não suportar modificadores/estoque do Chefão | 4 | 5 | prova de conceito transacional e cláusula contratual |
| `RISK-003` | pico de mídia superar capacidade da parrilla | 4 | 5 | ensaio, limite de canal e regra de pausa |
| `RISK-004` | preço sem ficha técnica destruir margem | 4 | 5 | custo por receita e aprovação de Finanças |
| `RISK-005` | fumaça, calor, chuva ou vento comprometer segurança | 3 | 5 | projeto físico e protocolo climático profissional |
| `RISK-006` | embed do ERP bloqueado/inseguro | 3 | 4 | homologar cabeçalhos, sessão e fallback de redirect |
| `RISK-007` | dados incompletos impedirem conciliação e marketing | 4 | 4 | contrato de eventos, teste e auditoria diária |
| `RISK-008` | inconsistência de marca e grafia | 4 | 3 | glossário, aprovação e manual de marca |
| `RISK-009` | QR code impresso falhar ou ficar obsoleto | 3 | 3 | URL própria/redirecionável e teste físico |
| `RISK-010` | fornecedor único causar ruptura | 3 | 4 | alternativa homologada e estoque de segurança calculado |
| `RISK-011` | coleta indevida de dados pessoais | 3 | 5 | minimização, consentimento, acesso e revisão LGPD |
| `RISK-012` | venda de álcool fora das regras aplicáveis | 2 | 5 | validação legal, treinamento e controle de idade |

Probabilidade e impacto são estimativas iniciais de planejamento, não dados observados.

## Processo de decisão

Uma decisão registra: contexto, opções, custos, riscos, evidências, recomendação, responsável, prazo, decisão final e consequências. Decisão vencida volta à pauta diária; não deve ser resolvida silenciosamente por um agente.

## Processo de risco

Cada risco tem proprietário, gatilho observável, mitigação preventiva e contingência. Se ocorrer, vira incidente/tarefa e preserva a relação com o risco original.

