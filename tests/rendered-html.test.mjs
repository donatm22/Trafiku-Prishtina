import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("defines the complete Trafiku Prishtina experience", async () => {
  const [page, dashboard, feed, info] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/traffic-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/incident-feed.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/info-sections.tsx", import.meta.url), "utf8"),
  ]);
  const product = [page, dashboard, feed, info].join("\n");

  assert.match(product, /Shihe trafikun/);
  assert.match(product, /Raporto çfarë po ndodh/);
  assert.match(product, /Raportimet e fundit/);
  assert.match(product, /Nuk është më/);
  assert.match(product, /\/clear/);
  assert.match(product, /Kolonë/);
  assert.match(product, /Aksident/);
  assert.match(product, /Rrugë të mbyllura/);
  assert.match(product, /Rreziqe/);
  assert.match(product, /\/api\/reports/);
  assert.doesNotMatch(product, /codex-preview|react-loading-skeleton/i);
});

test("ships production metadata and persistence declarations", async () => {
  const [layout, hosting, manifest] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Trafiku Prishtina/);
  assert.match(layout, /\/og\.png/);
  assert.match(hosting, /"d1": "DB"/);
  assert.doesNotMatch(manifest, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../drizzle/0000_broken_blue_shield.sql", import.meta.url));
});

test("uses Prishtina.online as an optional shared account authority", async () => {
  const [authHelper, accountMenu, loginPage, registerPage, logoutRoute, reportsApi, confirmApi, clearApi, schema] = await Promise.all([
    readFile(new URL("../lib/prishtina-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/account-menu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/register/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reports/[id]/confirm/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reports/[id]/clear/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(authHelper, /https:\/\/prishtina\.online/);
  assert.match(authHelper, /\/api\/sso\/session/);
  assert.match(authHelper, /https:\/\/trafiku\.prishtina\.online/);
  assert.match(accountMenu, /\/api\/auth\/session/);
  assert.match(accountMenu, /\/api\/auth\/logout/);
  assert.match(loginPage, /prishtinaAuthUrl\("login"/);
  assert.match(registerPage, /prishtinaAuthUrl\("register"/);
  assert.match(logoutRoute, /__Secure-prishtina\.session-token/);
  assert.match(logoutRoute, /domain: "\.prishtina\.online"/);
  assert.match(reportsApi, /getPrishtinaUser/);
  assert.doesNotMatch(reportsApi, /status:\s*401/);
  assert.doesNotMatch(confirmApi, /getPrishtinaUser|status:\s*401/);
  assert.match(clearApi, /clearTrafficReport/);
  assert.doesNotMatch(clearApi, /getPrishtinaUser|status:\s*401/);
  assert.match(schema, /reporterEmail: text\("reporter_email"\)/);
  await access(new URL("../drizzle/0001_fine_pyro.sql", import.meta.url));
});
