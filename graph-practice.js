// BFS/DFS traversal practice and Graph properties practice

let graphCorrect = 0, graphTotal = 0, graphStreak = 0;
let graphStartTime = null;
let graphCurrentType = 'bfs';
let graphAdj = null, graphPos = null;
let graphExpectedOrder = null;
let graphUserOrder = [];
let graphStartNode = 0;
let graphN = 0;

// ============ BFS / DFS ============

function generateTraversalProblem() {
    graphN = parseInt(document.getElementById('graph-size-select')?.value || '6');
    const edgeProb = graphN <= 5 ? 0.5 : 0.35;
    graphAdj = generateConnectedGraph(graphN, edgeProb);
    graphPos = layoutCircle(graphN, 160, 160, 120);
    graphStartNode = randInt(0, graphN - 1);
    graphUserOrder = [];
    graphStartTime = Date.now();

    if (graphCurrentType === 'bfs') {
        graphExpectedOrder = bfsOrder(graphAdj, graphStartNode);
    } else {
        graphExpectedOrder = dfsOrder(graphAdj, graphStartNode);
    }

    renderTraversalUI();
}

function renderTraversalUI() {
    const area = document.getElementById('graph-problem-area');
    const typeLabel = graphCurrentType === 'bfs' ? 'BFS' : 'DFS';
    const nodeColors = {};
    nodeColors[graphStartNode] = '#3b82f6';
    for (const v of graphUserOrder) nodeColors[v] = '#4ade80';

    const svg = renderGraphSVG(graphAdj, graphPos, {
        clickable: true,
        clickFn: 'onTraversalClick',
        nodeColors
    });

    const orderStr = graphUserOrder.length ? graphUserOrder.join(' → ') : '(click nodes in order)';

    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left">
            <strong>${typeLabel} traversal</strong> starting from node <strong>${graphStartNode}</strong><br>
            <span style="font-size:0.9rem;color:#94a3b8">Click nodes in the order they are visited (alphabetical/numerical tie-breaking)</span>
        </div>
        ${svg}
        <div style="margin:1rem 0;font-size:1.1rem;min-height:1.5rem">
            <strong>Your order:</strong> ${orderStr}
        </div>
        <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
            <button class="check-btn" onclick="checkTraversal()">Check</button>
            <button class="back-btn" onclick="undoTraversalClick()">Undo</button>
            <button class="back-btn" onclick="graphUserOrder=[];renderTraversalUI()">Clear</button>
        </div>
        <div class="feedback" id="graph-feedback"></div>
        <button class="next-btn" id="graph-next" onclick="generateTraversalProblem()" style="display:none">Next →</button>`;
}

function onTraversalClick(v) {
    if (graphUserOrder.includes(v)) return;
    if (graphUserOrder.length === 0 && v !== graphStartNode) return;
    graphUserOrder.push(v);
    renderTraversalUI();
}

function undoTraversalClick() {
    graphUserOrder.pop();
    renderTraversalUI();
}

function checkTraversal() {
    const fb = document.getElementById('graph-feedback');
    const elapsed = ((Date.now() - graphStartTime) / 1000).toFixed(1);
    graphTotal++;

    let correct = graphUserOrder.length === graphExpectedOrder.length;
    if (correct) {
        for (let i = 0; i < graphUserOrder.length; i++)
            if (graphUserOrder[i] !== graphExpectedOrder[i]) { correct = false; break; }
    }

    const topicName = graphCurrentType === 'bfs' ? 'BFS Traversal' : 'DFS Traversal';
    if (correct) {
        graphCorrect++;
        graphStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        graphStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Correct order:</h4><pre>${graphExpectedOrder.join(' → ')}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult(topicName, correct, parseFloat(elapsed));

    document.getElementById('graph-score').textContent = `Score: ${graphCorrect}/${graphTotal}`;
    document.getElementById('graph-streak').textContent = `Streak: ${graphStreak}`;
    document.getElementById('graph-time').textContent = `Time: ${elapsed}s`;
    document.getElementById('graph-next').style.display = 'inline-block';
}

// ============ Graph Properties ============

let gpExpected = null;
let gpProblemData = null;

function generateGraphPropProblem() {
    graphN = parseInt(document.getElementById('graph-size-select')?.value || '6');
    const edgeProb = graphN <= 5 ? 0.5 : 0.35;
    graphAdj = generateConnectedGraph(graphN, edgeProb);
    graphPos = layoutCircle(graphN, 160, 160, 120);
    graphStartTime = Date.now();

    const svg = renderGraphSVG(graphAdj, graphPos);
    const area = document.getElementById('graph-problem-area');

    const propType = graphCurrentType;
    let questionText, answer, solutionText;

    if (propType === 'independence') {
        answer = independenceNumber(graphAdj);
        questionText = 'What is the <strong>independence number</strong> α(G)?';
        solutionText = `α(G) = ${answer}\n(Maximum independent set has ${answer} vertices)`;
    } else if (propType === 'clique') {
        answer = cliqueNumber(graphAdj);
        questionText = 'What is the <strong>clique number</strong> ω(G)?';
        solutionText = `ω(G) = ${answer}\n(Maximum clique has ${answer} vertices)`;
    } else if (propType === 'vertexcover') {
        answer = vertexCoverNumber(graphAdj);
        questionText = 'What is the <strong>minimum vertex cover</strong> number β(G)?';
        solutionText = `β(G) = ${answer}\n(Note: α(G) + β(G) = n = ${graphN})`;
    } else if (propType === 'chromatic') {
        answer = chromaticNumber(graphAdj);
        questionText = 'What is the <strong>chromatic number</strong> χ(G)?';
        solutionText = `χ(G) = ${answer}\n(Minimum colors needed: ${answer})`;
    } else if (propType === 'domination') {
        answer = dominationNumber(graphAdj);
        questionText = 'What is the <strong>domination number</strong> γ(G)?';
        solutionText = `γ(G) = ${answer}\n(Minimum dominating set has ${answer} vertices)`;
    } else if (propType === 'edgeconn') {
        answer = edgeConnectivity(graphAdj);
        questionText = 'What is the <strong>edge connectivity</strong> λ(G)?';
        solutionText = `λ(G) = ${answer}\n(Minimum number of edges to disconnect: ${answer})`;
    } else {
        const vc = vertexConnectivity(graphAdj);
        answer = vc;
        questionText = 'What is the <strong>vertex connectivity</strong> κ(G)?';
        solutionText = `κ(G) = ${answer}\n(Minimum number of vertices to disconnect: ${answer})`;
    }

    gpExpected = answer;
    gpProblemData = { solution: solutionText };

    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left">${questionText}</div>
        ${svg}
        <div class="input-row-multi">
            <div class="eq-input-pair">
                <span class="eq-label">Answer =</span>
                <input type="text" id="gp-answer" autocomplete="off" inputmode="decimal" class="eq-ans-input">
            </div>
            <button class="check-btn" onclick="checkGraphProp()">Check</button>
        </div>
        <div class="feedback" id="graph-feedback"></div>
        <button class="next-btn" id="graph-next" onclick="generateGraphPropProblem()" style="display:none">Next →</button>`;

    const fi = area.querySelector('input');
    if (fi) fi.focus();
}

function checkGraphProp() {
    const fb = document.getElementById('graph-feedback');
    const elapsed = ((Date.now() - graphStartTime) / 1000).toFixed(1);
    const userAns = parseInt(document.getElementById('gp-answer').value.trim());
    graphTotal++;

    const propNames = {
        independence: 'Independence Number', clique: 'Clique Number',
        vertexcover: 'Vertex Cover', chromatic: 'Chromatic Number',
        domination: 'Domination Number', edgeconn: 'Edge Connectivity',
        vertexconn: 'Vertex Connectivity'
    };
    const correct = userAns === gpExpected;

    if (correct) {
        graphCorrect++;
        graphStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        graphStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Solution:</h4><pre>${gpProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult(propNames[graphCurrentType] || graphCurrentType, correct, parseFloat(elapsed));

    document.getElementById('graph-score').textContent = `Score: ${graphCorrect}/${graphTotal}`;
    document.getElementById('graph-streak').textContent = `Streak: ${graphStreak}`;
    document.getElementById('graph-time').textContent = `Time: ${elapsed}s`;
    document.getElementById('graph-next').style.display = 'inline-block';
}

// ============ Max Flow / Min Cut ============

let flowExpected = null;
let flowProblemData = null;

function generateFlowProblem() {
    graphN = parseInt(document.getElementById('graph-size-select')?.value || '5');
    if (graphN < 4) graphN = 4;
    const { adj, cap } = generateFlowNetwork(graphN, 8);
    graphAdj = adj;
    graphPos = layoutCircle(graphN, 160, 160, 120);
    graphStartTime = Date.now();

    const source = 0, sink = graphN - 1;
    const result = maxFlowFull(adj, graphN, cap, source, sink);
    flowExpected = result.totalFlow;

    let solText = `Max flow = ${result.totalFlow}\n\nAugmenting paths:\n`;
    for (const p of result.paths) {
        solText += `${p.path.join(' → ')} (flow: ${p.flow})\n`;
    }
    solText += `\nMin cut S-side: {${[...result.minCutS].join(', ')}}`;
    flowProblemData = { solution: solText };

    const nodeLabels = {};
    nodeLabels[0] = 's';
    nodeLabels[graphN - 1] = 't';
    for (let i = 1; i < graphN - 1; i++) nodeLabels[i] = i;

    const svg = renderGraphSVG(adj, graphPos, {
        directed: true,
        edgeWeights: cap,
        nodeLabels
    });

    const area = document.getElementById('graph-problem-area');
    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left">
            Find the <strong>maximum flow</strong> from <strong>s</strong> to <strong>t</strong>
        </div>
        ${svg}
        <div class="input-row-multi">
            <div class="eq-input-pair">
                <span class="eq-label">Max flow =</span>
                <input type="text" id="flow-answer" autocomplete="off" inputmode="decimal" class="eq-ans-input">
            </div>
            <button class="check-btn" onclick="checkFlowProblem()">Check</button>
        </div>
        <div class="feedback" id="graph-feedback"></div>
        <button class="next-btn" id="graph-next" onclick="generateFlowProblem()" style="display:none">Next →</button>`;

    const fi = area.querySelector('input');
    if (fi) fi.focus();
}

function checkFlowProblem() {
    const fb = document.getElementById('graph-feedback');
    const elapsed = ((Date.now() - graphStartTime) / 1000).toFixed(1);
    const userAns = parseInt(document.getElementById('flow-answer').value.trim());
    graphTotal++;

    const correct = userAns === flowExpected;
    if (correct) {
        graphCorrect++;
        graphStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        graphStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Solution:</h4><pre>${flowProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult('Max Flow', correct, parseFloat(elapsed));

    document.getElementById('graph-score').textContent = `Score: ${graphCorrect}/${graphTotal}`;
    document.getElementById('graph-streak').textContent = `Streak: ${graphStreak}`;
    document.getElementById('graph-time').textContent = `Time: ${elapsed}s`;
    document.getElementById('graph-next').style.display = 'inline-block';
}

// ============ Start Functions ============

function startGraphPractice(type, title) {
    graphCurrentType = type;
    graphCorrect = 0; graphTotal = 0; graphStreak = 0;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('graph-section').style.display = 'block';
    document.getElementById('graph-title').textContent = title;
    document.getElementById('graph-score').textContent = 'Score: 0/0';
    document.getElementById('graph-streak').textContent = 'Streak: 0';
    document.getElementById('graph-time').textContent = 'Time: —';

    const genFn = getGraphGenFunction(type);
    genFn();
}

function getGraphGenFunction(type) {
    if (type === 'bfs' || type === 'dfs') return generateTraversalProblem;
    if (type === 'maxflow') return generateFlowProblem;
    return generateGraphPropProblem;
}

function startBFS() { startGraphPractice('bfs', 'BFS Traversal'); }
function startDFS() { startGraphPractice('dfs', 'DFS Traversal'); }
function startIndependence() { startGraphPractice('independence', 'Independence Number'); }
function startClique() { startGraphPractice('clique', 'Clique Number'); }
function startVertexCover() { startGraphPractice('vertexcover', 'Vertex Cover'); }
function startChromatic() { startGraphPractice('chromatic', 'Chromatic Number'); }
function startDomination() { startGraphPractice('domination', 'Domination Number'); }
function startEdgeConn() { startGraphPractice('edgeconn', 'Edge Connectivity'); }
function startVertexConn() { startGraphPractice('vertexconn', 'Vertex Connectivity'); }
function startMaxFlow() { startGraphPractice('maxflow', 'Max Flow / Min Cut'); }

function generateCurrentGraphProblem() {
    const genFn = getGraphGenFunction(graphCurrentType);
    genFn();
}
