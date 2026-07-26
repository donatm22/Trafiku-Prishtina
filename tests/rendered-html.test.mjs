import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Trafiku Prishtina experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Trafiku Prishtina<\/title>/i);
  assert.match(html, /Shihe trafikun/);
  assert.match(html, /Raporto çfarë po ndodh/);
  assert.match(html, /Raportimet e fundit/);
  assert.match(html, /Kolonë/);
  assert.match(html, /Aksident/);
  assert.match(html, /Rrugë të mbyllura/);
  assert.match(html, /Rreziqe/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
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
