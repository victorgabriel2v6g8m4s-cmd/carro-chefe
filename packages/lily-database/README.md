# Banco CookLily

Pacote Prisma/SQLite independente da operação CookLily.

## Isolamento

- variável: `LILY_DATABASE_URL`;
- produção planejada: `file:/srv/carro-chefe/data/lily-acai.db`;
- sem FK/view para o banco Carro Chefe.

## Modelos atuais

- `LilyUser`;
- `LilySession`;
- `LilyConsentRecord`;
- `LilyMarketingLead`.

`LilyMarketingLead` guarda telefone normalizado, consentimento/versionamento e atribuição canônica `la*`. Não exige uma conta CookLily.

## Comandos

```bash
npm run db:generate:lily
npm run db:validate:lily
npm run db:migrate:lily
npm run db:deploy:lily
npm run db:studio:lily
```

Nunca executar reset ou seed de desenvolvimento no banco de produção.
