import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps an active route updated from traffic and movement", async () => {
  const dashboard = await readFile(new URL("../app/traffic-dashboard.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /hasTrafficStateChanged/);
  assert.match(dashboard, /autoRerouteRef/);
  assert.match(dashboard, /watchPosition/);
  assert.match(dashboard, /clearWatch/);
  assert.match(dashboard, /shouldRerouteForMovement/);
  assert.match(dashboard, /Rirregullim automatik aktiv/);
  assert.match(dashboard, /Rruga u përditësua sipas trafikut të fundit/);
});
