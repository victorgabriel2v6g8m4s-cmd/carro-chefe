# CookLily — Entrega 10A — Observabilidade e backup/restore

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-10a-observabilidade-backup`
- base_branch: `cooklily/canonical`
- base_sha_verified: `9262aa60d875f0a9c58d352e9e3d469a20e7419f`
- last_verified_at: 2026-09-29
- previous_delivery: Entrega 09, merge `3ca8b5aa66ad9c1831c65284cf781c5fc7d8eedd`

## Objetivo

Reduzir risco operacional antes da homologação real: melhorar correlação de erros/logs, criar visão operacional staff sem PII e transformar backup em artefato verificável antes de migrations/deploy.

## Escopo

1. redaction explícita de headers sensíveis no logger;
2. `X-Request-Id` em todas as respostas para correlação de suporte;
3. health/overview staff com contadores agregados e sem PII;
4. verificador de backup SQLite por cópia isolada + `PRAGMA integrity_check`;
5. deployer validando os backups recém-criados antes de migrations;
6. testes automatizados e runbook de restauração segura.

## Invariantes

- observabilidade não registra cookie, Authorization, CSRF, guest token ou códigos logísticos;
- endpoint operacional não expõe telefone, endereço, token, mensagem de erro bancária/WhatsApp ou payload bruto;
- verificação de backup nunca abre/escreve o banco live;
- restauração continua manual e deliberada; nenhum script troca banco de produção automaticamente;
- nenhuma política de retenção de PII é inventada sem decisão jurídica;
- recuperação de senha permanece bloqueada até canal seguro de verificação ser definido;
- QA físico/mobile continua pendente para a homologação.
