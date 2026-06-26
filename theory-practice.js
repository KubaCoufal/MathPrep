// SAT, Complexity Classification, Polynomial Reductions, ILP Formulations, Correlation & Mutual Information

let theoryCorrect = 0, theoryTotal = 0, theoryStreak = 0;
let theoryStartTime = null;
let theoryCurrentType = 'sat';
let theoryExpected = null;
let theoryProblemData = null;

// ============ SAT ============

function genSATClauses(nVars, nClauses, forceSat) {
    const vars = [];
    for (let i = 1; i <= nVars; i++) vars.push(i);

    if (forceSat) {
        const assignment = {};
        for (let i = 1; i <= nVars; i++) assignment[i] = Math.random() < 0.5;

        const clauses = [];
        for (let c = 0; c < nClauses; c++) {
            const size = randInt(2, 3);
            const picked = [];
            const used = new Set();
            while (picked.length < size) {
                const v = vars[randInt(0, vars.length - 1)];
                if (used.has(v)) continue;
                used.add(v);
                picked.push(Math.random() < 0.5 ? v : -v);
            }
            const satisfied = picked.some(lit => lit > 0 ? assignment[lit] : !assignment[-lit]);
            if (!satisfied) {
                const v = picked[randInt(0, picked.length - 1)];
                const idx = picked.indexOf(v);
                picked[idx] = assignment[Math.abs(v)] ? Math.abs(v) : -Math.abs(v);
            }
            clauses.push(picked);
        }
        return { clauses, satisfiable: true, assignment };
    } else {
        const clauses = [];
        for (let c = 0; c < nClauses; c++) {
            const size = randInt(2, 3);
            const picked = [];
            const used = new Set();
            while (picked.length < size) {
                const v = vars[randInt(0, vars.length - 1)];
                if (used.has(v)) continue;
                used.add(v);
                picked.push(Math.random() < 0.5 ? v : -v);
            }
            clauses.push(picked);
        }
        const sat = checkSAT(nVars, clauses);
        return { clauses, satisfiable: sat.satisfiable, assignment: sat.assignment };
    }
}

function checkSAT(nVars, clauses) {
    for (let mask = 0; mask < (1 << nVars); mask++) {
        const asgn = {};
        for (let i = 1; i <= nVars; i++) asgn[i] = !!(mask & (1 << (i - 1)));
        let allSat = true;
        for (const clause of clauses) {
            let clauseSat = false;
            for (const lit of clause) {
                if (lit > 0 ? asgn[lit] : !asgn[-lit]) { clauseSat = true; break; }
            }
            if (!clauseSat) { allSat = false; break; }
        }
        if (allSat) return { satisfiable: true, assignment: asgn };
    }
    return { satisfiable: false, assignment: null };
}

function formatClause(clause) {
    return '(' + clause.map(lit => lit > 0 ? `x${lit}` : `¬x${Math.abs(lit)}`).join(' ∨ ') + ')';
}

function formatCNF(clauses) {
    return clauses.map(formatClause).join(' ∧ ');
}

function generateSATProblem() {
    const nVars = randInt(3, 4);
    const nClauses = randInt(3, 5);
    const forceSat = Math.random() < 0.6;

    let data;
    if (forceSat) {
        data = genSATClauses(nVars, nClauses, true);
    } else {
        data = genSATClauses(nVars, nClauses, false);
        if (!data.satisfiable && Math.random() < 0.3) {
            data = genSATClauses(nVars, nClauses, true);
        }
    }

    theoryExpected = data;
    theoryStartTime = Date.now();

    const cnfStr = formatCNF(data.clauses);
    let solText;
    if (data.satisfiable) {
        const asgn = Object.entries(data.assignment).map(([v, val]) => `x${v} = ${val ? '1' : '0'}`).join(', ');
        solText = `SATISFIABLE\nAssignment: ${asgn}`;
    } else {
        solText = `UNSATISFIABLE\nNo assignment satisfies all clauses.`;
    }
    theoryProblemData = { solution: solText };

    const area = document.getElementById('theory-problem-area');

    let inputsHTML = `
        <div class="input-row-multi" style="margin-bottom:0.5rem">
            <span class="eq-label">Satisfiable?</span>
            <select id="sat-answer" class="opt-select">
                <option value="yes">Yes (SAT)</option>
                <option value="no">No (UNSAT)</option>
            </select>
        </div>
        <div id="sat-assignment-area" style="margin-bottom:1rem">
            <div class="input-row-multi">`;
    for (let i = 1; i <= nVars; i++) {
        inputsHTML += `<div class="eq-input-pair">
            <span class="eq-label">x${i} =</span>
            <select id="sat-x${i}" class="opt-select" style="width:60px">
                <option value="1">1</option>
                <option value="0">0</option>
            </select>
        </div>`;
    }
    inputsHTML += `</div></div>
        <button class="check-btn" onclick="checkSATProblem()">Check</button>`;

    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left;line-height:1.8">
            <strong>Determine satisfiability:</strong><br>
            <span style="font-size:1.05rem">${cnfStr}</span>
        </div>
        ${inputsHTML}
        <div class="feedback" id="theory-feedback"></div>
        <button class="next-btn" id="theory-next" onclick="generateSATProblem()" style="display:none">Next →</button>`;
}

function checkSATProblem() {
    const fb = document.getElementById('theory-feedback');
    const elapsed = ((Date.now() - theoryStartTime) / 1000).toFixed(1);
    theoryTotal++;

    const userSat = document.getElementById('sat-answer').value === 'yes';
    let correct;

    if (theoryExpected.satisfiable) {
        if (!userSat) {
            correct = false;
        } else {
            const nVars = Object.keys(theoryExpected.assignment).length;
            const userAsgn = {};
            for (let i = 1; i <= nVars; i++) {
                userAsgn[i] = document.getElementById(`sat-x${i}`).value === '1';
            }
            let allSat = true;
            for (const clause of theoryExpected.clauses) {
                let clauseSat = false;
                for (const lit of clause) {
                    if (lit > 0 ? userAsgn[lit] : !userAsgn[-lit]) { clauseSat = true; break; }
                }
                if (!clauseSat) { allSat = false; break; }
            }
            correct = allSat;
        }
    } else {
        correct = !userSat;
    }

    if (correct) {
        theoryCorrect++;
        theoryStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        theoryStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Solution:</h4><pre>${theoryProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult('SAT', correct, parseFloat(elapsed));
    updateTheoryStats(elapsed);
}

// ============ Complexity Classification ============

const complexityProblems = [
    { problem: 'Sorting an array', answer: 'P', explanation: 'O(n log n) comparison sort algorithms exist.' },
    { problem: 'Finding shortest path in a graph (Dijkstra)', answer: 'P', explanation: 'Dijkstra runs in O((V+E) log V).' },
    { problem: 'Matrix multiplication', answer: 'P', explanation: 'O(n³) standard algorithm (O(n^2.37) best known).' },
    { problem: 'Maximum matching in bipartite graph', answer: 'P', explanation: 'Hungarian algorithm runs in polynomial time.' },
    { problem: 'Minimum spanning tree', answer: 'P', explanation: 'Kruskal/Prim run in O(E log V).' },
    { problem: 'Maximum flow in a network', answer: 'P', explanation: 'Ford-Fulkerson, Edmonds-Karp run in polynomial time.' },
    { problem: '2-SAT', answer: 'P', explanation: 'Solvable in linear time via SCC of implication graph.' },
    { problem: 'Linear programming', answer: 'P', explanation: 'Interior point methods run in polynomial time.' },
    { problem: 'Euler path/circuit existence', answer: 'P', explanation: 'Check degree conditions in O(V+E).' },
    { problem: 'Topological sorting', answer: 'P', explanation: 'DFS-based algorithm runs in O(V+E).' },
    { problem: '2-coloring a graph', answer: 'P', explanation: 'Equivalent to bipartiteness check via BFS, O(V+E).' },
    { problem: 'Primality testing', answer: 'P', explanation: 'AKS algorithm runs in polynomial time.' },
    { problem: 'Finding maximum independent set', answer: 'NPC', explanation: 'NP-complete. Reduction from 3-SAT.' },
    { problem: 'Graph coloring (k≥3 colors)', answer: 'NPC', explanation: 'NP-complete for k≥3. Reduction from 3-SAT.' },
    { problem: 'Travelling Salesman Problem (decision)', answer: 'NPC', explanation: 'NP-complete. Reduction from Hamiltonian cycle.' },
    { problem: 'Hamiltonian path/cycle', answer: 'NPC', explanation: 'NP-complete. Classic NP-complete problem.' },
    { problem: '3-SAT', answer: 'NPC', explanation: 'NP-complete. Cook-Levin theorem (SAT → 3-SAT).' },
    { problem: 'Vertex cover (decision)', answer: 'NPC', explanation: 'NP-complete. Reduction from 3-SAT.' },
    { problem: 'Set cover', answer: 'NPC', explanation: 'NP-complete. Reduction from vertex cover.' },
    { problem: 'Clique (decision)', answer: 'NPC', explanation: 'NP-complete. Complement of independent set.' },
    { problem: 'Subset sum', answer: 'NPC', explanation: 'NP-complete. Reduction from 3-SAT / knapsack.' },
    { problem: 'Knapsack (0/1, decision)', answer: 'NPC', explanation: 'NP-complete. Weakly NP-complete (pseudo-poly solution).' },
    { problem: 'Integer linear programming', answer: 'NPC', explanation: 'NP-complete. Can encode any NP problem.' },
    { problem: 'Graph isomorphism', answer: 'unknown', explanation: 'Neither known to be in P nor NP-complete. (Babai: quasipolynomial)' },
    { problem: 'Minimum dominating set', answer: 'NPC', explanation: 'NP-complete. Reduction from vertex cover.' },
    { problem: 'Partition problem', answer: 'NPC', explanation: 'NP-complete. Special case of subset sum.' },
    { problem: 'Maximum cut', answer: 'NPC', explanation: 'NP-complete. Reduction from NAE-3-SAT.' },
];

function generateComplexityProblem() {
    theoryStartTime = Date.now();
    const prob = complexityProblems[randInt(0, complexityProblems.length - 1)];
    theoryExpected = prob.answer;
    theoryProblemData = { solution: prob.explanation };

    const area = document.getElementById('theory-problem-area');
    area.innerHTML = `
        <div class="problem" style="font-size:1.15rem;display:block;text-align:left;line-height:1.8">
            <strong>Classify the complexity:</strong><br><br>
            <em>${prob.problem}</em>
        </div>
        <div class="input-row-multi">
            <select id="complexity-answer" class="opt-select">
                <option value="P">P (polynomial)</option>
                <option value="NPC">NP-complete</option>
                <option value="unknown">Unknown / Neither</option>
            </select>
            <button class="check-btn" onclick="checkComplexityProblem()">Check</button>
        </div>
        <div class="feedback" id="theory-feedback"></div>
        <button class="next-btn" id="theory-next" onclick="generateComplexityProblem()" style="display:none">Next →</button>`;
}

function checkComplexityProblem() {
    const fb = document.getElementById('theory-feedback');
    const elapsed = ((Date.now() - theoryStartTime) / 1000).toFixed(1);
    theoryTotal++;

    const userAns = document.getElementById('complexity-answer').value;
    const correct = userAns === theoryExpected;

    if (correct) {
        theoryCorrect++;
        theoryStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        theoryStreak = 0;
        fb.innerHTML = `<span>Wrong (${theoryExpected})</span><div class="solution-detail"><h4>Explanation:</h4><pre>${theoryProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult('Complexity Classification', correct, parseFloat(elapsed));
    updateTheoryStats(elapsed);
}

// ============ Polynomial Reductions ============

const reductionProblems = [
    { from: '3-SAT', to: 'Independent Set', direction: '3-SAT ≤p Independent Set',
      explanation: 'Each clause → triangle of nodes, edges between contradictory literals. IS of size k ↔ k clauses satisfied.' },
    { from: 'Independent Set', to: 'Vertex Cover', direction: 'Independent Set ≤p Vertex Cover',
      explanation: 'S is independent set ↔ V\\S is vertex cover. Complement relationship.' },
    { from: 'Independent Set', to: 'Clique', direction: 'Independent Set ≤p Clique',
      explanation: 'Independent set in G ↔ clique in complement graph Ḡ.' },
    { from: 'Vertex Cover', to: 'Set Cover', direction: 'Vertex Cover ≤p Set Cover',
      explanation: 'Each vertex → set of its incident edges. Universe = all edges.' },
    { from: '3-SAT', to: 'Hamiltonian Path', direction: '3-SAT ≤p Hamiltonian Path',
      explanation: 'Gadget construction: variable gadgets (zig-zag paths) + clause gadgets.' },
    { from: 'Hamiltonian Path', to: 'TSP', direction: 'Hamiltonian Path ≤p TSP',
      explanation: 'Set edge weights: 1 if edge exists, 2 otherwise. TSP tour ≤ n ↔ Hamiltonian cycle exists.' },
    { from: '3-SAT', to: '3-Coloring', direction: '3-SAT ≤p 3-Coloring',
      explanation: 'Use truth/false/base palette nodes + gadgets per variable and clause.' },
    { from: 'Vertex Cover', to: 'Dominating Set', direction: 'Vertex Cover ≤p Dominating Set',
      explanation: 'Add new vertex for each edge, connected to both endpoints. VC of size k → DS of size k.' },
    { from: 'SAT', to: '3-SAT', direction: 'SAT ≤p 3-SAT',
      explanation: 'Split long clauses using auxiliary variables. Linear blowup.' },
    { from: '3-SAT', to: 'Subset Sum', direction: '3-SAT ≤p Subset Sum',
      explanation: 'Encode variables and clauses as digits in base-10 numbers.' },
];

function generateReductionProblem() {
    theoryStartTime = Date.now();
    const prob = reductionProblems[randInt(0, reductionProblems.length - 1)];
    const questionType = randInt(1, 3);

    let questionText, options, answer, solText;

    if (questionType === 1) {
        questionText = `Which problem can be polynomially reduced TO <strong>${prob.to}</strong>?`;
        const wrongOptions = reductionProblems
            .filter(r => r.to !== prob.to && r.from !== prob.from)
            .map(r => r.from);
        const uniqueWrong = [...new Set(wrongOptions)].slice(0, 3);
        options = [prob.from, ...uniqueWrong].sort(() => Math.random() - 0.5);
        answer = prob.from;
        solText = `${prob.direction}\n${prob.explanation}`;
    } else if (questionType === 2) {
        questionText = `<strong>${prob.from}</strong> can be polynomially reduced to which problem?`;
        const wrongOptions = reductionProblems
            .filter(r => r.from !== prob.from && r.to !== prob.to)
            .map(r => r.to);
        const uniqueWrong = [...new Set(wrongOptions)].slice(0, 3);
        options = [prob.to, ...uniqueWrong].sort(() => Math.random() - 0.5);
        answer = prob.to;
        solText = `${prob.direction}\n${prob.explanation}`;
    } else {
        questionText = `What is the key idea in the reduction <strong>${prob.from} ≤p ${prob.to}</strong>?`;
        options = null;
        answer = null;
        solText = prob.explanation;
    }

    theoryExpected = answer;
    theoryProblemData = { solution: solText };

    const area = document.getElementById('theory-problem-area');
    let inputsHTML;

    if (options) {
        inputsHTML = `<div class="input-row-multi"><select id="reduction-answer" class="opt-select">`;
        for (const opt of options) inputsHTML += `<option value="${opt}">${opt}</option>`;
        inputsHTML += `</select><button class="check-btn" onclick="checkReductionProblem()">Check</button></div>`;
    } else {
        inputsHTML = `<div style="margin:1rem 0"><button class="check-btn" onclick="showReductionAnswer()">Show Answer</button></div>`;
    }

    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left;line-height:1.8">${questionText}</div>
        ${inputsHTML}
        <div class="feedback" id="theory-feedback"></div>
        <button class="next-btn" id="theory-next" onclick="generateReductionProblem()" style="display:none">Next →</button>`;
}

function checkReductionProblem() {
    const fb = document.getElementById('theory-feedback');
    const elapsed = ((Date.now() - theoryStartTime) / 1000).toFixed(1);
    theoryTotal++;

    const userAns = document.getElementById('reduction-answer').value;
    const correct = userAns === theoryExpected;

    if (correct) {
        theoryCorrect++;
        theoryStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        theoryStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Explanation:</h4><pre>${theoryProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult('Polynomial Reductions', correct, parseFloat(elapsed));
    updateTheoryStats(elapsed);
}

function showReductionAnswer() {
    const fb = document.getElementById('theory-feedback');
    fb.innerHTML = `<div class="solution-detail"><h4>Key idea:</h4><pre>${theoryProblemData.solution}</pre></div>`;
    fb.className = 'feedback';
    document.getElementById('theory-next').style.display = 'inline-block';
}

// ============ ILP Formulations ============

const ilpProblems = [
    {
        problem: 'Maximum Independent Set',
        formulation: 'max Σ xᵢ\ns.t. xᵢ + xⱼ ≤ 1 for each edge (i,j)\nxᵢ ∈ {0, 1}',
        variables: 'xᵢ = 1 if vertex i is in the independent set',
        wrong: ['max Σ xᵢ, s.t. xᵢ + xⱼ ≥ 1', 'min Σ xᵢ, s.t. xᵢ + xⱼ ≤ 1', 'max Σ xᵢxⱼ, s.t. xᵢ ∈ {0,1}']
    },
    {
        problem: 'Minimum Vertex Cover',
        formulation: 'min Σ xᵢ\ns.t. xᵢ + xⱼ ≥ 1 for each edge (i,j)\nxᵢ ∈ {0, 1}',
        variables: 'xᵢ = 1 if vertex i is in the cover',
        wrong: ['min Σ xᵢ, s.t. xᵢ + xⱼ ≤ 1', 'max Σ xᵢ, s.t. xᵢ + xⱼ ≥ 1', 'min Σ xᵢ, s.t. xᵢ · xⱼ = 0']
    },
    {
        problem: 'Maximum Clique',
        formulation: 'max Σ xᵢ\ns.t. xᵢ + xⱼ ≤ 1 for each NON-edge (i,j)\nxᵢ ∈ {0, 1}',
        variables: 'xᵢ = 1 if vertex i is in the clique',
        wrong: ['max Σ xᵢ, s.t. xᵢ + xⱼ ≤ 1 for edges', 'max Σ xᵢxⱼ for edges', 'min Σ xᵢ, s.t. xᵢ + xⱼ ≤ 1 for non-edges']
    },
    {
        problem: 'Graph Coloring (k colors)',
        formulation: 'min k\ns.t. Σⱼ xᵢⱼ = 1 ∀i (each vertex gets one color)\nxᵢⱼ + xₗⱼ ≤ 1 for edge (i,l), color j\nxᵢⱼ ∈ {0, 1}',
        variables: 'xᵢⱼ = 1 if vertex i gets color j',
        wrong: ['min Σ xᵢ, s.t. xᵢ ≠ xⱼ for edges', 'max k, s.t. Σⱼ xᵢⱼ = 1', 'min k, s.t. xᵢⱼ + xₗⱼ ≥ 1']
    },
    {
        problem: 'Set Cover',
        formulation: 'min Σ xⱼ\ns.t. Σ{j: eᵢ∈Sⱼ} xⱼ ≥ 1 ∀ elements eᵢ\nxⱼ ∈ {0, 1}',
        variables: 'xⱼ = 1 if set Sⱼ is selected',
        wrong: ['max Σ xⱼ, s.t. each element covered', 'min Σ |Sⱼ|xⱼ, s.t. xⱼ ∈ {0,1}', 'min Σ xⱼ, s.t. Σ xⱼ ≤ 1 per element']
    },
    {
        problem: 'TSP (Travelling Salesman)',
        formulation: 'min Σᵢⱼ cᵢⱼ xᵢⱼ\ns.t. Σⱼ xᵢⱼ = 1 ∀i, Σᵢ xᵢⱼ = 1 ∀j\n+ subtour elimination constraints\nxᵢⱼ ∈ {0, 1}',
        variables: 'xᵢⱼ = 1 if edge (i,j) is in the tour',
        wrong: ['min Σ cᵢⱼxᵢⱼ without subtour elimination', 'max Σ cᵢⱼxᵢⱼ with subtour elimination', 'min Σ xᵢⱼ, s.t. cᵢⱼ ≤ k']
    },
];

function generateILPProblem() {
    theoryStartTime = Date.now();
    const prob = ilpProblems[randInt(0, ilpProblems.length - 1)];
    const correctOption = prob.formulation.split('\n')[0];
    const wrongOpts = prob.wrong.slice(0, 2);
    const options = [correctOption, ...wrongOpts].sort(() => Math.random() - 0.5);

    theoryExpected = correctOption;
    theoryProblemData = { solution: `${prob.formulation}\n\nVariables: ${prob.variables}` };

    const area = document.getElementById('theory-problem-area');
    let optionsHTML = '';
    options.forEach((opt, i) => {
        optionsHTML += `<label style="display:block;margin:0.5rem 0;padding:0.8rem;background:#0f172a;border-radius:8px;cursor:pointer;border:2px solid #334155;transition:border-color 0.2s">
            <input type="radio" name="ilp-opt" value="${i}" style="margin-right:0.5rem"> ${opt}
        </label>`;
    });

    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left;line-height:1.8">
            <strong>ILP Formulation for ${prob.problem}:</strong><br>
            Which objective function is correct?
        </div>
        <div id="ilp-options" style="text-align:left;margin:1rem 0">${optionsHTML}</div>
        <button class="check-btn" onclick="checkILPProblem(${JSON.stringify(options).replace(/"/g, '&quot;')})">Check</button>
        <div class="feedback" id="theory-feedback"></div>
        <button class="next-btn" id="theory-next" onclick="generateILPProblem()" style="display:none">Next →</button>`;
}

function checkILPProblem(options) {
    const fb = document.getElementById('theory-feedback');
    const elapsed = ((Date.now() - theoryStartTime) / 1000).toFixed(1);
    theoryTotal++;

    const selected = document.querySelector('input[name="ilp-opt"]:checked');
    if (!selected) {
        fb.textContent = 'Please select an option.';
        fb.className = 'feedback wrong';
        theoryTotal--;
        return;
    }

    const userAns = options[parseInt(selected.value)];
    const correct = userAns === theoryExpected;

    if (correct) {
        theoryCorrect++;
        theoryStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        theoryStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Correct formulation:</h4><pre>${theoryProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult('ILP Formulations', correct, parseFloat(elapsed));
    updateTheoryStats(elapsed);
}

// ============ Correlation & Mutual Information ============

function generateCorrelationProblem() {
    theoryStartTime = Date.now();
    const n = randInt(4, 6);
    const a = randInt(-2, 2);
    const b = randInt(1, 3) * (Math.random() < 0.5 ? 1 : -1);

    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
        const x = randInt(-5, 5);
        const noise = randInt(-2, 2);
        xs.push(x);
        ys.push(a + b * x + noise);
    }

    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;

    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
        sxx += (xs[i] - mx) * (xs[i] - mx);
        syy += (ys[i] - my) * (ys[i] - my);
        sxy += (xs[i] - mx) * (ys[i] - my);
    }

    const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
    const rRounded = Math.round(r * 100) / 100;

    theoryExpected = rRounded;
    const solText = `x̄ = ${mx.toFixed(2)}, ȳ = ${my.toFixed(2)}\n` +
        `Σ(xᵢ-x̄)² = ${sxx.toFixed(2)}\n` +
        `Σ(yᵢ-ȳ)² = ${syy.toFixed(2)}\n` +
        `Σ(xᵢ-x̄)(yᵢ-ȳ) = ${sxy.toFixed(2)}\n` +
        `r = ${sxy.toFixed(2)} / √(${sxx.toFixed(2)} · ${syy.toFixed(2)}) = ${r.toFixed(4)} ≈ ${rRounded}`;
    theoryProblemData = { solution: solText };

    let tableHTML = '<table class="stats-table" style="margin:1rem auto;max-width:400px"><tr><th>i</th>';
    for (let i = 0; i < n; i++) tableHTML += `<th>${i + 1}</th>`;
    tableHTML += '</tr><tr><td>x</td>';
    for (let i = 0; i < n; i++) tableHTML += `<td>${xs[i]}</td>`;
    tableHTML += '</tr><tr><td>y</td>';
    for (let i = 0; i < n; i++) tableHTML += `<td>${ys[i]}</td>`;
    tableHTML += '</tr></table>';

    const area = document.getElementById('theory-problem-area');
    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left;line-height:1.8">
            <strong>Compute the Pearson correlation coefficient r:</strong>
            ${tableHTML}
        </div>
        <div class="input-row-multi">
            <div class="eq-input-pair">
                <span class="eq-label">r =</span>
                <input type="text" id="corr-answer" autocomplete="off" inputmode="decimal" class="eq-ans-input" style="width:120px">
            </div>
            <button class="check-btn" onclick="checkCorrelationProblem()">Check</button>
        </div>
        <div style="font-size:0.85rem;color:#64748b;margin-bottom:1rem">Round to 2 decimal places</div>
        <div class="feedback" id="theory-feedback"></div>
        <button class="next-btn" id="theory-next" onclick="generateCorrelationProblem()" style="display:none">Next →</button>`;

    const fi = area.querySelector('input');
    if (fi) fi.focus();
}

function checkCorrelationProblem() {
    const fb = document.getElementById('theory-feedback');
    const elapsed = ((Date.now() - theoryStartTime) / 1000).toFixed(1);
    theoryTotal++;

    const userAns = parseFloat(document.getElementById('corr-answer').value.trim());
    const correct = Math.abs(userAns - theoryExpected) < 0.03;

    if (correct) {
        theoryCorrect++;
        theoryStreak++;
        fb.textContent = `Correct! r = ${theoryExpected} (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        theoryStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Solution:</h4><pre>${theoryProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult('Correlation Coefficient', correct, parseFloat(elapsed));
    updateTheoryStats(elapsed);
}

// ============ Mutual Information ============

function generateMutualInfoProblem() {
    theoryStartTime = Date.now();
    const xVals = [0, 1];
    const yVals = [0, 1];
    const joint = [[0, 0], [0, 0]];

    const total = randInt(20, 40);
    let remaining = total;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            if (i === 1 && j === 1) { joint[i][j] = remaining; }
            else { joint[i][j] = randInt(1, Math.max(1, Math.floor(remaining / (3 - i * 2 - j)))); remaining -= joint[i][j]; }
        }
    }
    if (remaining <= 0) { joint[1][1] = Math.max(1, remaining); }

    const pJoint = joint.map(row => row.map(v => v / total));
    const pX = [pJoint[0][0] + pJoint[0][1], pJoint[1][0] + pJoint[1][1]];
    const pY = [pJoint[0][0] + pJoint[1][0], pJoint[0][1] + pJoint[1][1]];

    let mi = 0;
    for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
            if (pJoint[i][j] > 0 && pX[i] > 0 && pY[j] > 0)
                mi += pJoint[i][j] * Math.log2(pJoint[i][j] / (pX[i] * pY[j]));

    const miRounded = Math.round(mi * 1000) / 1000;
    theoryExpected = miRounded;

    let solText = 'Joint distribution p(x,y):\n';
    for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
            solText += `p(${i},${j}) = ${joint[i][j]}/${total} = ${pJoint[i][j].toFixed(4)}\n`;
    solText += `\np(X=0) = ${pX[0].toFixed(4)}, p(X=1) = ${pX[1].toFixed(4)}\n`;
    solText += `p(Y=0) = ${pY[0].toFixed(4)}, p(Y=1) = ${pY[1].toFixed(4)}\n`;
    solText += `\nI(X;Y) = Σ p(x,y) log₂(p(x,y) / (p(x)p(y))) = ${mi.toFixed(4)} ≈ ${miRounded}`;
    theoryProblemData = { solution: solText };

    let tableHTML = `<table class="stats-table" style="margin:1rem auto;max-width:300px">
        <tr><th></th><th>Y=0</th><th>Y=1</th></tr>`;
    for (let i = 0; i < 2; i++) {
        tableHTML += `<tr><td><strong>X=${i}</strong></td>`;
        for (let j = 0; j < 2; j++) tableHTML += `<td>${joint[i][j]}</td>`;
        tableHTML += '</tr>';
    }
    tableHTML += `<tr><td colspan="3" style="font-size:0.85rem;color:#64748b">Total: ${total}</td></tr></table>`;

    const area = document.getElementById('theory-problem-area');
    area.innerHTML = `
        <div class="problem" style="font-size:1.1rem;display:block;text-align:left;line-height:1.8">
            <strong>Compute the mutual information I(X;Y) in bits:</strong>
            ${tableHTML}
        </div>
        <div class="input-row-multi">
            <div class="eq-input-pair">
                <span class="eq-label">I(X;Y) =</span>
                <input type="text" id="mi-answer" autocomplete="off" inputmode="decimal" class="eq-ans-input" style="width:120px">
            </div>
            <button class="check-btn" onclick="checkMutualInfoProblem()">Check</button>
        </div>
        <div style="font-size:0.85rem;color:#64748b;margin-bottom:1rem">Round to 3 decimal places</div>
        <div class="feedback" id="theory-feedback"></div>
        <button class="next-btn" id="theory-next" onclick="generateMutualInfoProblem()" style="display:none">Next →</button>`;

    const fi = area.querySelector('input');
    if (fi) fi.focus();
}

function checkMutualInfoProblem() {
    const fb = document.getElementById('theory-feedback');
    const elapsed = ((Date.now() - theoryStartTime) / 1000).toFixed(1);
    theoryTotal++;

    const userAns = parseFloat(document.getElementById('mi-answer').value.trim());
    const correct = Math.abs(userAns - theoryExpected) < 0.01;

    if (correct) {
        theoryCorrect++;
        theoryStreak++;
        fb.textContent = `Correct! I(X;Y) = ${theoryExpected} bits (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        theoryStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Solution:</h4><pre>${theoryProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult('Mutual Information', correct, parseFloat(elapsed));
    updateTheoryStats(elapsed);
}

// ============ UI Helpers ============

function updateTheoryStats(elapsed) {
    document.getElementById('theory-score').textContent = `Score: ${theoryCorrect}/${theoryTotal}`;
    document.getElementById('theory-streak').textContent = `Streak: ${theoryStreak}`;
    document.getElementById('theory-time').textContent = `Time: ${elapsed}s`;
    document.getElementById('theory-next').style.display = 'inline-block';
}

function getTheoryGenFunction(type) {
    if (type === 'sat') return generateSATProblem;
    if (type === 'complexity') return generateComplexityProblem;
    if (type === 'reductions') return generateReductionProblem;
    if (type === 'ilp') return generateILPProblem;
    if (type === 'correlation') return generateCorrelationProblem;
    if (type === 'mutualinfo') return generateMutualInfoProblem;
    return generateSATProblem;
}

function startTheoryPractice(type, title) {
    theoryCurrentType = type;
    theoryCorrect = 0; theoryTotal = 0; theoryStreak = 0;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('theory-section').style.display = 'block';
    document.getElementById('theory-title').textContent = title;
    document.getElementById('theory-score').textContent = 'Score: 0/0';
    document.getElementById('theory-streak').textContent = 'Streak: 0';
    document.getElementById('theory-time').textContent = 'Time: —';

    const genFn = getTheoryGenFunction(type);
    genFn();
}

function generateCurrentTheoryProblem() {
    const genFn = getTheoryGenFunction(theoryCurrentType);
    genFn();
}

function startSAT() { startTheoryPractice('sat', 'SAT Satisfiability'); }
function startComplexity() { startTheoryPractice('complexity', 'Complexity Classification'); }
function startReductions() { startTheoryPractice('reductions', 'Polynomial Reductions'); }
function startILP() { startTheoryPractice('ilp', 'ILP Formulations'); }
function startCorrelation() { startTheoryPractice('correlation', 'Correlation Coefficient'); }
function startMutualInfo() { startTheoryPractice('mutualinfo', 'Mutual Information'); }
