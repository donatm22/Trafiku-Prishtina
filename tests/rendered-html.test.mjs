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
