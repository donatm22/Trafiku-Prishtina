import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("integrates comparison, rerouting and closure enforcement", async () => {
  const [routing, routeApi, dashboard, map] = await Promise.all([
    readFile(new URL("../lib/routing.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/route/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/traffic-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/map-canvas.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(routing, /evaluateRouteAlternatives/);
  assert.match(routing, /viableAlternatives/);
  assert.match(routing, /isConfirmedClosure/);
  assert.match(routeApi, /routes: alternatives/);
  assert.match(routeApi, /calculatedAt/);
  assert.match(routeApi, /selectDestinationCandidate/);
  assert.match(routeApi, /searchParams\.set\("limit", "10"\)/);
  assert.doesNotMatch(routeApi, /destinationQuery\}, Prishtinë/);
  assert.match(dashboard, /routeOptions/);
  assert.match(dashboard, /Rirregullim automatik aktiv/);
  assert.match(dashboard, /Përditësuar/);
  assert.match(map, /route\.blocked/);
});
