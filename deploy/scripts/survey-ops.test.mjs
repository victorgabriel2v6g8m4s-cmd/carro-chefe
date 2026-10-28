import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const helperPath = path.join(root, 'deploy/scripts/enable-lily-survey-notifications-nginx');
const diagnosePath = path.join(root, 'deploy/scripts/diagnose-cooklily-access');
const deployerPath = path.join(root, 'deploy/scripts/carro-chefe-deploy');
const helperSource = readFileSync(helperPath, 'utf8');
const diagnoseSource = readFileSync(diagnosePath, 'utf8');

function pythonBlock(source, expression) {
  const match = source.match(expression);
  assert.ok(match, 'expected Python helper block in shell script');
  return match[1];
}

function runPython(source, args) {
  return spawnSync('python3', ['-c', source, ...args], { encoding: 'utf8' });
}

test('Nginx helper and diagnostic script have valid Bash syntax', () => {
  for (const file of [helperPath, diagnosePath, deployerPath]) {
    execFileSync('bash', ['-n'], { cwd: root, input: readFileSync(file, 'utf8').replace(/\r\n/g, '\n') });
  }
});

test('WhatsApp, survey and notification Nginx routes are inserted before the API deny rule', () => {
  const python = pythonBlock(helperSource, /python3 - "\$\{CONF\}" <<'PY'\r?\n([\s\S]*?)\r?\nPY/);
  const directory = mkdtempSync(path.join(os.tmpdir(), 'lily-nginx-helper-'));
  try {
    const config = path.join(directory, 'site.conf');
    writeFileSync(config, 'server {\n    location ^~ /api/ { return 404; }\n}\n');
    const first = runPython(python, [config]);
    assert.equal(first.status, 0, first.stderr);
    const content = readFileSync(config, 'utf8');
    const cooklilyWebhookAt = content.indexOf('location = /api/v1/integrations/cooklily/whatsapp/webhook');
    const carroChefeWebhookAt = content.indexOf('location = /api/v1/integrations/carro-chefe/whatsapp/webhook');
    const surveyExactAt = content.indexOf('location = /api/v1/lily/surveys');
    const surveyPrefixAt = content.indexOf('location ^~ /api/v1/lily/surveys/');
    const mediaPrefixAt = content.indexOf('location ^~ /api/v1/lily/survey-option-media/');
    const exactAt = content.indexOf('location = /api/v1/lily/notifications');
    const prefixAt = content.indexOf('location ^~ /api/v1/lily/notifications/');
    const denyAt = content.indexOf('location ^~ /api/ { return 404; }');
    assert.ok(cooklilyWebhookAt >= 0 && carroChefeWebhookAt > cooklilyWebhookAt && surveyExactAt > carroChefeWebhookAt && surveyPrefixAt > surveyExactAt && mediaPrefixAt > surveyPrefixAt && exactAt > mediaPrefixAt && prefixAt > exactAt && denyAt > prefixAt);
    assert.equal((content.match(/location = \/api\/v1\/integrations\/cooklily\/whatsapp\/webhook/g) ?? []).length, 1);
    assert.equal((content.match(/location = \/api\/v1\/integrations\/carro-chefe\/whatsapp\/webhook/g) ?? []).length, 1);
    assert.equal((content.match(/location = \/api\/v1\/lily\/surveys\b/g) ?? []).length, 1);
    assert.equal((content.match(/location \^~ \/api\/v1\/lily\/survey-option-media\//g) ?? []).length, 1);
    assert.equal((content.match(/location = \/api\/v1\/lily\/notifications\b/g) ?? []).length, 1);
    assert.equal(runPython(python, [config]).status, 0, 'second application should be idempotent');

    writeFileSync(config, 'server {\n    location = /api/v1/lily/notifications { }\n    location ^~ /api/ { return 404; }\n}\n');
    assert.equal(runPython(python, [config]).status, 2, 'partial route config must fail closed');
    writeFileSync(config, 'server {\n    location ^~ /api/v1/lily/surveys/ { }\n    location ^~ /api/ { return 404; }\n}\n');
    assert.equal(runPython(python, [config]).status, 2, 'partial survey config must fail closed');
    writeFileSync(config, 'server {\n    location = /api/v1/lily/notifications { }\n    location ^~ /api/v1/lily/notifications/ { }\n    location ^~ /api/ { return 404; }\n}\n');
    assert.equal(runPython(python, [config]).status, 0, 'survey routes should be added to an existing notification config');
    const upgraded = readFileSync(config, 'utf8');
    assert.equal((upgraded.match(/location = \/api\/v1\/lily\/notifications\b/g) ?? []).length, 1);
    assert.match(upgraded, /location = \/api\/v1\/lily\/surveys/);
    writeFileSync(config, 'server { }\n');
    assert.equal(runPython(python, [config]).status, 3, 'unknown Nginx layout must fail closed');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('diagnostic access-log filter masks IPs and removes query strings and stale events', () => {
  const python = pythonBlock(diagnoseSource, /python3 - "\$MINUTES" "\$\{access_files\[@\]\}" <<'PY'\r?\n([\s\S]*?)\r?\nPY/);
  const directory = mkdtempSync(path.join(os.tmpdir(), 'lily-access-log-'));
  try {
    const now = new Date();
    const recent = now.toUTCString().replace(/^\w{3}, /, '').replace(/ GMT$/, ' +0000');
    const old = new Date(now.getTime() - 4 * 60 * 60 * 1000).toUTCString().replace(/^\w{3}, /, '').replace(/ GMT$/, ' +0000');
    const toNginxTime = (value) => value.replace(/^(\d{2}) ([A-Za-z]{3}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) \+0000$/, '$1/$2/$3:$4:$5:$6 +0000');
    const log = path.join(directory, 'access.log');
    writeFileSync(log, [
      `203.0.113.84 - - [${toNginxTime(recent)}] "GET /lilyacai/cardapio?token=SECRET HTTP/1.1" 200 585`,
      `198.51.100.27 - - [${toNginxTime(old)}] "GET /lilyacai/cardapio HTTP/1.1" 200 585`,
      `192.0.2.10 - - [${toNginxTime(recent)}] "GET /api/v1/lily/notifications?phone=PRIVATE HTTP/1.1" 404 20`,
      `198.51.100.52 - - [${toNginxTime(recent)}] "GET /api/v1/lily/surveys HTTP/1.1" 404 162`
    ].join('\n'));
    const result = runPython(python, ['20', log]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /203\.0\.113\.0\/24/);
    assert.match(result.stdout, /<query-redacted>/);
    assert.match(result.stdout, /HTTP\/1\.1/);
    assert.doesNotMatch(result.stdout, /SECRET|PRIVATE|203\.0\.113\.84|198\.51\.100\.27|192\.0\.2\.10/);
    assert.doesNotMatch(result.stdout, /4 hours ago/);
    assert.match(result.stdout, /lily\/surveys/);
    assert.equal((result.stdout.match(/HTTP\/1\.1/g) ?? []).length, 3, result.stdout);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('deployment applies the notification route helper before enforcing the Nginx precheck', () => {
  const source = readFileSync(deployerPath, 'utf8');
  assert.ok(source.indexOf('apply_lily_survey_api_nginx_routes') < source.indexOf("PHASE=\"nginx-precheck\""));
  assert.match(source, /location = \/api\/v1\/lily\/surveys/);
  assert.match(source, /location \^~ \/api\/v1\/lily\/surveys\//);
  assert.match(source, /location \^~ \/api\/v1\/lily\/survey-option-media\//);
  assert.match(source, /location = \/api\/v1\/lily\/notifications/);
  assert.match(source, /location \^~ \/api\/v1\/lily\/notifications\//);
  assert.match(source, /location = \/api\/v1\/integrations\/cooklily\/whatsapp\/webhook/);
  assert.match(source, /location = \/api\/v1\/integrations\/carro-chefe\/whatsapp\/webhook/);
  const template = readFileSync(path.join(root, 'deploy/nginx/carrochefe.com.conf.example'), 'utf8');
  assert.match(template, /location = \/api\/v1\/lily\/surveys/);
  assert.match(template, /location \^~ \/api\/v1\/lily\/surveys\//);
  assert.match(template, /location \^~ \/api\/v1\/lily\/survey-option-media\//);
  assert.match(template, /location = \/api\/v1\/integrations\/cooklily\/whatsapp\/webhook/);
  assert.match(template, /location = \/api\/v1\/integrations\/carro-chefe\/whatsapp\/webhook/);
});

test('Lily survey analytics migration applies on a fresh SQLite schema', () => {
  const migration = readFileSync(path.join(root, 'packages/lily-database/prisma/migrations/20261025153000_lily_survey_analytics/migration.sql'), 'utf8');
  const database = new Database(':memory:');
  try {
    database.exec(`CREATE TABLE "LilySurvey" ("id" TEXT NOT NULL PRIMARY KEY);
      CREATE TABLE "LilySurveyParticipation" ("id" TEXT NOT NULL PRIMARY KEY);
      CREATE TABLE "LilyUser" ("id" TEXT NOT NULL PRIMARY KEY);`);
    database.exec(migration);
    const views = database.prepare('PRAGMA table_info("LilySurveyView")').all();
    const metrics = database.prepare('PRAGMA table_info("LilySurveyQuestionMetric")').all();
    const participation = database.prepare('PRAGMA table_info("LilySurveyParticipation")').all();
    assert.ok(views.some((column) => column.name === 'viewId'));
    assert.ok(!views.some((column) => column.name === 'userId'));
    assert.ok(metrics.some((column) => column.name === 'timeTotalMs'));
    assert.ok(participation.some((column) => column.name === 'questionTimesJson'));
    const indexes = database.prepare('PRAGMA index_list("LilySurveyView")').all();
    assert.equal(indexes.filter((index) => index.origin !== 'pk').length, 2);
  } finally {
    database.close();
  }
});

test('CookLily social links, VIP coupons and referral migration applies on a fresh SQLite schema', () => {
  const migration = readFileSync(path.join(root, 'packages/lily-database/prisma/migrations/20261028170000_lily_social_links_vip_coupons/migration.sql'), 'utf8');
  const database = new Database(':memory:');
  try {
    database.exec(`CREATE TABLE "LilyOperationalSettings" ("id" TEXT PRIMARY KEY, "instagramHandle" TEXT NOT NULL, "whatsappPhone" TEXT NOT NULL);
      INSERT INTO "LilyOperationalSettings" ("id", "instagramHandle", "whatsappPhone") VALUES ('default', 'acai._lily', '+5567999289187');
      CREATE TABLE "LilyCoupon" ("id" TEXT PRIMARY KEY, "status" TEXT NOT NULL DEFAULT 'draft');
      CREATE TABLE "LilyUser" ("id" TEXT PRIMARY KEY);`);
    try { database.exec(migration); }
    catch (error) { throw new Error(`Migration CookLily inválida: ${error.message}`); }
    const settings = database.prepare('SELECT "instagramHandle", "socialLinksJson", "referralRewardPoints" FROM "LilyOperationalSettings" WHERE "id" = ?').get('default');
    assert.equal(settings.instagramHandle, 'cook._lily');
    assert.equal(settings.referralRewardPoints, 0);
    const links = JSON.parse(settings.socialLinksJson);
    assert.equal(links[0].url, 'https://instagram.com/cook._lily');
    assert.equal(links[1].url, 'https://wa.me/5567999289187');
    assert.equal(database.prepare('PRAGMA table_info("LilyCoupon")').all().find((column) => column.name === 'vipOnly').dflt_value, 'false');
    assert.ok(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'LilyReferralInvite'").get());
  } finally {
    database.close();
  }
});
