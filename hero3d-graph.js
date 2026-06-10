// Graph generation + agent-run logic for the ASCII hero. Pure data/logic.
import * as THREE from "three";

// Layered DAG: nodes are systems/steps, the agent path always spans all layers.
export function buildGraph() {
  const layers = 5;
  const perLayer = 5;
  const nodes = [];
  for (let L = 0; L < layers; L++) {
    for (let k = 0; k < perLayer; k++) {
      nodes.push(new THREE.Vector3(
        (L - (layers - 1) / 2) * 4.8,
        (k - (perLayer - 1) / 2) * 2.4 + (Math.random() - 0.5) * 1.1,
        (Math.random() - 0.5) * 3.2
      ));
    }
  }
  const idx = (L, k) => L * perLayer + k;
  const edges = [];
  const edgeSet = new Set();
  const addEdge = (a, b) => {
    const key = a < b ? a + "-" + b : b + "-" + a;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push([a, b]);
    }
  };

  // The agent's first path is built before the background wiring so its
  // edges always exist.
  const path = [];
  let prev = idx(0, Math.floor(Math.random() * perLayer));
  path.push(prev);
  for (let L = 1; L < layers; L++) {
    const next = idx(L, Math.floor(Math.random() * perLayer));
    addEdge(prev, next);
    path.push(next);
    prev = next;
  }
  for (let L = 0; L < layers - 1; L++) {
    for (let k = 0; k < perLayer; k++) {
      for (let n = 0; n < 2; n++) {
        addEdge(idx(L, k), idx(L + 1, Math.floor(Math.random() * perLayer)));
      }
    }
  }
  return { nodes, edges, path, layers, perLayer };
}

// Picks a fresh random path through existing layer-to-layer edges.
export function pickPath(graph) {
  const byFrom = new Map();
  graph.edges.forEach(([a, b]) => {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (!byFrom.has(lo)) byFrom.set(lo, []);
    byFrom.get(lo).push(hi);
  });
  const starts = [];
  for (let k = 0; k < graph.perLayer; k++) starts.push(k);
  let cur = starts[Math.floor(Math.random() * starts.length)];
  const path = [cur];
  while (byFrom.has(cur)) {
    const nexts = byFrom.get(cur);
    cur = nexts[Math.floor(Math.random() * nexts.length)];
    path.push(cur);
  }
  return path.length >= 2 ? path : graph.path;
}

// Drives a looping workflow execution. Calls hooks as the agent works:
//   setNodeVisited(i, visited) — node state changed
//   pulse.position is updated every frame while a run is active.
export function makeAgentRun(graph, setNodeVisited, pulse, opts) {
  const segTime = (opts && opts.segTime) || 1.15;
  const rest = (opts && opts.rest) || 1.7;
  let path = graph.path;
  let seg = 0;
  let segT = 0;
  let resting = 0;

  return function update(dt) {
    if (resting > 0) {
      resting -= dt;
      if (resting <= 0) {
        path.forEach((n) => setNodeVisited(n, false));
        path = pickPath(graph);
        seg = 0;
        segT = 0;
      }
      return;
    }
    segT += dt / segTime;
    if (segT >= 1) {
      setNodeVisited(path[seg + 1], true);
      seg++;
      segT = 0;
      if (seg >= path.length - 1) {
        resting = rest;
        return;
      }
    }
    const a = graph.nodes[path[seg]];
    const b = graph.nodes[path[seg + 1]];
    pulse.position.lerpVectors(a, b, segT);
    setNodeVisited(path[seg], true);
  };
}
