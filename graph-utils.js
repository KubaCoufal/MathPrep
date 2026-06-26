// Graph data structures, generation, and SVG rendering

function generateRandomGraph(n, edgeProb) {
    const adj = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
            if (Math.random() < edgeProb) { adj[i][j] = 1; adj[j][i] = 1; }
    return adj;
}

function generateConnectedGraph(n, edgeProb) {
    let adj;
    for (let attempt = 0; attempt < 50; attempt++) {
        adj = generateRandomGraph(n, edgeProb);
        if (isConnected(adj, n)) return adj;
    }
    adj = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n - 1; i++) { adj[i][i + 1] = 1; adj[i + 1][i] = 1; }
    for (let i = 0; i < n; i++)
        for (let j = i + 2; j < n; j++)
            if (Math.random() < edgeProb) { adj[i][j] = 1; adj[j][i] = 1; }
    return adj;
}

function isConnected(adj, n) {
    const visited = Array(n).fill(false);
    const q = [0];
    visited[0] = true;
    let count = 1;
    while (q.length) {
        const u = q.shift();
        for (let v = 0; v < n; v++)
            if (adj[u][v] && !visited[v]) { visited[v] = true; q.push(v); count++; }
    }
    return count === n;
}

function neighbors(adj, u) {
    const r = [];
    for (let v = 0; v < adj.length; v++) if (adj[u][v]) r.push(v);
    return r;
}

function degree(adj, u) { return neighbors(adj, u).length; }

function graphEdges(adj) {
    const edges = [];
    for (let i = 0; i < adj.length; i++)
        for (let j = i + 1; j < adj.length; j++)
            if (adj[i][j]) edges.push([i, j]);
    return edges;
}

function layoutCircle(n, cx, cy, r) {
    const pos = [];
    for (let i = 0; i < n; i++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        pos.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return pos;
}

function renderGraphSVG(adj, pos, opts = {}) {
    const n = adj.length;
    const w = opts.width || 320;
    const h = opts.height || 320;
    const nodeR = opts.nodeRadius || 18;
    const nodeColors = opts.nodeColors || {};
    const nodeLabels = opts.nodeLabels || {};
    const edgeLabels = opts.edgeLabels || {};
    const highlightEdges = opts.highlightEdges || [];
    const clickable = opts.clickable || false;
    const clickFn = opts.clickFn || 'onGraphNodeClick';
    const directed = opts.directed || false;
    const edgeWeights = opts.edgeWeights || null;

    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin:0 auto;">`;

    if (directed) {
        svg += `<defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="#60a5fa"/></marker></defs>`;
    }

    for (let i = 0; i < n; i++) {
        for (let j = directed ? 0 : i + 1; j < n; j++) {
            if (i === j) continue;
            if (!adj[i][j]) continue;
            if (!directed && j < i) continue;
            const [x1, y1] = pos[i];
            const [x2, y2] = pos[j];

            const isHL = highlightEdges.some(([a, b]) => (a === i && b === j) || (!directed && a === j && b === i));
            const color = isHL ? '#4ade80' : '#475569';
            const sw = isHL ? 3 : 2;

            if (directed) {
                const dx = x2 - x1, dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / len, uy = dy / len;
                const sx = x1 + ux * nodeR, sy = y1 + uy * nodeR;
                const ex = x2 - ux * (nodeR + 8), ey = y2 - uy * (nodeR + 8);
                svg += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="${sw}" marker-end="url(#arrow)"/>`;
            } else {
                svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}"/>`;
            }

            const ek = `${i}-${j}`;
            if (edgeWeights && edgeWeights[ek] !== undefined) {
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                svg += `<text x="${mx}" y="${my - 6}" text-anchor="middle" fill="#fbbf24" font-size="13" font-weight="600">${edgeWeights[ek]}</text>`;
            }
        }
    }

    for (let i = 0; i < n; i++) {
        const [x, y] = pos[i];
        const fill = nodeColors[i] || '#1e293b';
        const stroke = nodeColors[i] ? '#0f172a' : '#60a5fa';
        const cursor = clickable ? 'pointer' : 'default';
        const click = clickable ? ` onclick="${clickFn}(${i})"` : '';
        svg += `<circle cx="${x}" cy="${y}" r="${nodeR}" fill="${fill}" stroke="${stroke}" stroke-width="2" style="cursor:${cursor}"${click}/>`;
        const label = nodeLabels[i] !== undefined ? nodeLabels[i] : i;
        svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="600" style="pointer-events:none">${label}</text>`;
    }

    svg += '</svg>';
    return svg;
}

// BFS traversal returning order
function bfsOrder(adj, start) {
    const n = adj.length;
    const visited = Array(n).fill(false);
    const order = [];
    const q = [start];
    visited[start] = true;
    while (q.length) {
        const u = q.shift();
        order.push(u);
        const nbrs = neighbors(adj, u).sort((a, b) => a - b);
        for (const v of nbrs) if (!visited[v]) { visited[v] = true; q.push(v); }
    }
    return order;
}

// DFS traversal returning order
function dfsOrder(adj, start) {
    const n = adj.length;
    const visited = Array(n).fill(false);
    const order = [];
    function dfs(u) {
        visited[u] = true;
        order.push(u);
        const nbrs = neighbors(adj, u).sort((a, b) => a - b);
        for (const v of nbrs) if (!visited[v]) dfs(v);
    }
    dfs(start);
    return order;
}

// Brute-force independence number (max independent set)
function independenceNumber(adj) {
    const n = adj.length;
    let best = 0;
    for (let mask = 0; mask < (1 << n); mask++) {
        const S = [];
        for (let i = 0; i < n; i++) if (mask & (1 << i)) S.push(i);
        let indep = true;
        for (let a = 0; a < S.length && indep; a++)
            for (let b = a + 1; b < S.length && indep; b++)
                if (adj[S[a]][S[b]]) indep = false;
        if (indep && S.length > best) best = S.length;
    }
    return best;
}

// Brute-force clique number
function cliqueNumber(adj) {
    const n = adj.length;
    let best = 0;
    for (let mask = 0; mask < (1 << n); mask++) {
        const S = [];
        for (let i = 0; i < n; i++) if (mask & (1 << i)) S.push(i);
        let isClique = true;
        for (let a = 0; a < S.length && isClique; a++)
            for (let b = a + 1; b < S.length && isClique; b++)
                if (!adj[S[a]][S[b]]) isClique = false;
        if (isClique && S.length > best) best = S.length;
    }
    return best;
}

// Minimum vertex cover (König via complement of max independent set)
function vertexCoverNumber(adj) {
    return adj.length - independenceNumber(adj);
}

// Brute-force chromatic number (greedy check all orderings would be too slow; use k-coloring check)
function chromaticNumber(adj) {
    const n = adj.length;
    for (let k = 1; k <= n; k++) {
        if (canColor(adj, n, k)) return k;
    }
    return n;
}

function canColor(adj, n, k) {
    const color = Array(n).fill(0);
    function bt(v) {
        if (v === n) return true;
        for (let c = 0; c < k; c++) {
            let ok = true;
            for (let u = 0; u < v && ok; u++)
                if (adj[v][u] && color[u] === c) ok = false;
            if (ok) { color[v] = c; if (bt(v + 1)) return true; }
        }
        return false;
    }
    return bt(0);
}

// Minimum dominating set size
function dominationNumber(adj) {
    const n = adj.length;
    for (let size = 1; size <= n; size++) {
        if (hasDominatingSet(adj, n, size)) return size;
    }
    return n;
}

function hasDominatingSet(adj, n, size) {
    function check(S) {
        for (let v = 0; v < n; v++) {
            if (S.has(v)) continue;
            let dominated = false;
            for (const u of S) if (adj[v][u]) { dominated = true; break; }
            if (!dominated) return false;
        }
        return true;
    }
    function bt(start, remaining, S) {
        if (remaining === 0) return check(S);
        for (let i = start; i < n; i++) {
            S.add(i);
            if (bt(i + 1, remaining - 1, S)) return true;
            S.delete(i);
        }
        return false;
    }
    return bt(0, size, new Set());
}

// Edge connectivity (min edge cut via simple approach for small graphs)
function edgeConnectivity(adj) {
    const n = adj.length;
    if (n <= 1) return 0;
    if (!isConnected(adj, n)) return 0;
    let minCut = Infinity;
    for (let t = 1; t < n; t++) {
        const flow = maxFlowBFS(adj, n, 0, t);
        if (flow < minCut) minCut = flow;
    }
    return minCut;
}

function maxFlowBFS(adj, n, s, t) {
    const cap = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            if (adj[i][j]) cap[i][j] = 1;

    let totalFlow = 0;
    while (true) {
        const parent = Array(n).fill(-1);
        parent[s] = s;
        const q = [s];
        while (q.length && parent[t] === -1) {
            const u = q.shift();
            for (let v = 0; v < n; v++) {
                if (parent[v] === -1 && cap[u][v] > 0) {
                    parent[v] = u;
                    q.push(v);
                }
            }
        }
        if (parent[t] === -1) break;
        let pf = Infinity;
        for (let v = t; v !== s; v = parent[v]) pf = Math.min(pf, cap[parent[v]][v]);
        for (let v = t; v !== s; v = parent[v]) { cap[parent[v]][v] -= pf; cap[v][parent[v]] += pf; }
        totalFlow += pf;
    }
    return totalFlow;
}

// Vertex connectivity (min vertex cut)
function vertexConnectivity(adj) {
    const n = adj.length;
    if (n <= 1) return 0;
    if (!isConnected(adj, n)) return 0;
    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
            if (!adj[i][j]) {
                const vc = minVertexCut(adj, n, i, j);
                return vc;
            }
    return n - 1;
}

function minVertexCut(adj, n, s, t) {
    const N = 2 * n;
    const cap = Array.from({ length: N }, () => Array(N).fill(0));
    for (let v = 0; v < n; v++) {
        if (v === s || v === t) cap[2 * v][2 * v + 1] = Infinity;
        else cap[2 * v][2 * v + 1] = 1;
    }
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            if (adj[i][j]) cap[2 * i + 1][2 * j] = Infinity;

    let totalFlow = 0;
    while (true) {
        const parent = Array(N).fill(-1);
        parent[2 * s] = 2 * s;
        const q = [2 * s];
        const target = 2 * t + 1;
        while (q.length && parent[target] === -1) {
            const u = q.shift();
            for (let v = 0; v < N; v++) {
                if (parent[v] === -1 && cap[u][v] > 0) {
                    parent[v] = u;
                    q.push(v);
                }
            }
        }
        if (parent[target] === -1) break;
        let pf = Infinity;
        for (let v = target; v !== 2 * s; v = parent[v]) pf = Math.min(pf, cap[parent[v]][v]);
        for (let v = target; v !== 2 * s; v = parent[v]) { cap[parent[v]][v] -= pf; cap[v][parent[v]] += pf; }
        totalFlow += pf;
    }
    return totalFlow;
}

// Generate directed network with integer capacities for max-flow problems
function generateFlowNetwork(n, maxCap) {
    const adj = Array.from({ length: n }, () => Array(n).fill(0));
    const cap = {};
    for (let i = 0; i < n - 1; i++) {
        const next = i + 1 < n - 1 ? i + 1 : n - 1;
        const c = randInt(1, maxCap);
        adj[i][next] = 1;
        cap[`${i}-${next}`] = c;
    }
    const extraEdges = randInt(1, Math.floor(n * 1.2));
    for (let e = 0; e < extraEdges; e++) {
        const u = randInt(0, n - 2);
        const v = randInt(u + 1, n - 1);
        if (!adj[u][v]) {
            adj[u][v] = 1;
            cap[`${u}-${v}`] = randInt(1, maxCap);
        }
    }
    return { adj, cap };
}

// Max flow with augmenting path tracking
function maxFlowFull(adj, n, cap, s, t) {
    const resCap = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
            const ek = `${i}-${j}`;
            if (cap[ek]) resCap[i][j] = cap[ek];
        }

    let totalFlow = 0;
    const paths = [];
    while (true) {
        const parent = Array(n).fill(-1);
        parent[s] = s;
        const q = [s];
        while (q.length && parent[t] === -1) {
            const u = q.shift();
            for (let v = 0; v < n; v++) {
                if (parent[v] === -1 && resCap[u][v] > 0) {
                    parent[v] = u;
                    q.push(v);
                }
            }
        }
        if (parent[t] === -1) break;
        let pf = Infinity;
        const path = [];
        for (let v = t; v !== s; v = parent[v]) {
            path.unshift(v);
            pf = Math.min(pf, resCap[parent[v]][v]);
        }
        path.unshift(s);
        for (let v = t; v !== s; v = parent[v]) {
            resCap[parent[v]][v] -= pf;
            resCap[v][parent[v]] += pf;
        }
        totalFlow += pf;
        paths.push({ path, flow: pf });
    }

    const minCutS = new Set();
    const visited = Array(n).fill(false);
    const q2 = [s];
    visited[s] = true;
    while (q2.length) {
        const u = q2.shift();
        minCutS.add(u);
        for (let v = 0; v < n; v++)
            if (!visited[v] && resCap[u][v] > 0) { visited[v] = true; q2.push(v); }
    }

    return { totalFlow, paths, minCutS };
}
