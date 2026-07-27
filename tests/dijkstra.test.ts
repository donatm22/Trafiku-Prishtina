import assert from "node:assert/strict";
import test from "node:test";
import { dijkstraShortestPath, type WeightedGraph } from "../lib/dijkstra.ts";

test("finds the lowest-weight path through a directed graph", () => {
  const graph: WeightedGraph = new Map([
    ["A", [{ to: "B", weight: 5 }, { to: "C", weight: 1 }]],
    ["B", [{ to: "D", weight: 1 }]],
    ["C", [{ to: "B", weight: 1 }, { to: "D", weight: 10 }]],
    ["D", []],
  ]);

  assert.deepEqual(dijkstraShortestPath(graph, "A", "D"), {
    path: ["A", "C", "B", "D"],
    distance: 3,
  });
});

test("returns null when the destination is unreachable", () => {
  const graph: WeightedGraph = new Map([
    ["A", [{ to: "B", weight: 2 }]],
    ["B", []],
    ["C", []],
  ]);

  assert.equal(dijkstraShortestPath(graph, "A", "C"), null);
});

test("rejects negative edge weights", () => {
  const graph: WeightedGraph = new Map([
    ["A", [{ to: "B", weight: -1 }]],
    ["B", []],
  ]);

  assert.throws(
    () => dijkstraShortestPath(graph, "A", "B"),
    /finite and non-negative/,
  );
});
