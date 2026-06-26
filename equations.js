let eqCorrect = 0, eqTotal = 0, eqStreak = 0;
let eqStartTime = null;
let eqCurrentType = 'simple';
let eqExpected = null;
let eqProblemData = null;

function coeffStr(c, v, isFirst) {
    if (c === 0) return '';
    const abs = Math.abs(c);
    let prefix = isFirst ? (c < 0 ? '−' : '') : (c > 0 ? ' + ' : ' − ');
    let body = v ? (abs === 1 ? v : abs + v) : String(abs);
    return prefix + body;
}

function formatExpr(terms) {
    let result = '', first = true;
    for (const [c, v] of terms) {
        if (c === 0) continue;
        result += coeffStr(c, v, first);
        first = false;
    }
    return result || '0';
}

function formatQuadratic(a, b, c) {
    return formatExpr([[a, 'x²'], [b, 'x'], [c, '']]) + ' = 0';
}

// ============ Simple Equations ============

function genSimpleEq() {
    const type = randInt(1, 3);
    let display, x, solution;

    if (type === 1) {
        const a = randInt(2, 9) * (Math.random() < 0.25 ? -1 : 1);
        x = randInt(-10, 10);
        const b = randInt(-15, 15);
        const c = a * x + b;
        const lhs = formatExpr([[a, 'x'], [b, '']]);
        display = `${lhs} = ${c}`;
        solution = `${lhs} = ${c}\n${coeffStr(a, 'x', true)} = ${c - b}\nx = ${c - b} / ${a} = ${x}`;
    } else if (type === 2) {
        let a = randInt(2, 8);
        let c2 = randInt(1, a - 1);
        x = randInt(-8, 8);
        const b = randInt(-10, 10);
        const d = (a - c2) * x + b;
        const lhs = formatExpr([[a, 'x'], [b, '']]);
        const rhs = formatExpr([[c2, 'x'], [d, '']]);
        display = `${lhs} = ${rhs}`;
        solution = `${lhs} = ${rhs}\n${coeffStr(a - c2, 'x', true)} = ${d - b}\nx = ${d - b} / ${a - c2} = ${x}`;
    } else {
        const a = randInt(2, 5);
        const b = randInt(2, 5) * (Math.random() < 0.3 ? -1 : 1);
        x = randInt(-5, 5);
        const c2 = randInt(-8, 8);
        const total = a * (b * x + c2);
        const displayInner = formatExpr([[b, 'x'], [c2, '']]);
        display = `${a}(${displayInner}) = ${total}`;
        const expanded = a * b;
        const expandedC = a * c2;
        solution = `${display}\n${formatExpr([[expanded, 'x'], [expandedC, '']])} = ${total}\n${coeffStr(expanded, 'x', true)} = ${total - expandedC}\nx = ${(total - expandedC)} / ${expanded} = ${x}`;
    }

    return { display, expected: { x }, solution };
}

// ============ Systems of 2 Equations ============

function genSystem() {
    const x = randInt(-5, 5), y = randInt(-5, 5);
    let a1, b1, a2, b2;
    do {
        a1 = randInt(-4, 4); b1 = randInt(-4, 4);
        a2 = randInt(-4, 4); b2 = randInt(-4, 4);
    } while (a1 * b2 - a2 * b1 === 0 || (a1 === 0 && b1 === 0) || (a2 === 0 && b2 === 0));

    const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
    const eq1 = formatExpr([[a1, 'x'], [b1, 'y']]) + ' = ' + c1;
    const eq2 = formatExpr([[a2, 'x'], [b2, 'y']]) + ' = ' + c2;

    const det = a1 * b2 - a2 * b1;
    const solution =
        `Using Cramer's rule or elimination:\n` +
        `det = ${a1}·${b2} − ${a2}·${b1} = ${det}\n` +
        `x = (${c1}·${b2} − ${c2}·${b1}) / ${det} = ${(c1 * b2 - c2 * b1)} / ${det} = ${x}\n` +
        `y = (${a1}·${c2} − ${a2}·${c1}) / ${det} = ${(a1 * c2 - a2 * c1)} / ${det} = ${y}`;

    return { display: eq1 + '<br>' + eq2, expected: { x, y }, solution };
}

// ============ Quadratic Equations ============

function genQuadratic() {
    const mode = document.getElementById('eq-quad-mode')?.value || 'real';

    if (mode === 'complex') {
        const re = randInt(-4, 4);
        const im = randInt(1, 5);
        const a = 1, b = -2 * re, c = re * re + im * im;
        const disc = b * b - 4 * a * c;
        const solution =
            `${formatQuadratic(a, b, c)}\nΔ = b² − 4ac = ${b * b} − ${4 * a * c} = ${disc} < 0\n` +
            `x = (−b ± √Δ) / 2a = (${-b} ± √${-disc}i) / ${2 * a}\n` +
            `x = ${re} ± ${im}i`;
        return {
            display: formatQuadratic(a, b, c),
            expected: { type: 'complex', re, im },
            solution
        };
    }

    const r1 = randInt(-6, 6), r2 = randInt(-6, 6);
    const a = Math.random() < 0.25 ? randInt(2, 3) : 1;
    const b = -a * (r1 + r2), c = a * r1 * r2;
    const disc = b * b - 4 * a * c;
    const solution =
        `${formatQuadratic(a, b, c)}\nΔ = b² − 4ac = ${b}² − 4·${a}·${c} = ${b * b} − ${4 * a * c} = ${disc}\n` +
        `√Δ = ${Math.sqrt(disc)}\n` +
        `x = (−b ± √Δ) / 2a = (${-b} ± ${Math.sqrt(disc)}) / ${2 * a}\n` +
        `x₁ = ${r1}, x₂ = ${r2}`;

    return {
        display: formatQuadratic(a, b, c),
        expected: { type: 'real', roots: [r1, r2] },
        solution
    };
}

// ============ UI ============

function generateEquation() {
    if (eqCurrentType === 'simple') eqProblemData = genSimpleEq();
    else if (eqCurrentType === 'system') eqProblemData = genSystem();
    else eqProblemData = genQuadratic();

    eqExpected = eqProblemData.expected;
    eqStartTime = Date.now();

    const area = document.getElementById('eq-problem-area');
    let inputsHTML = '';

    if (eqCurrentType === 'simple') {
        inputsHTML = `<div class="input-row">
            <span class="eq-label">x =</span>
            <input type="text" id="eq-x" autocomplete="off" inputmode="decimal" class="eq-ans-input">
            <button class="check-btn" onclick="checkEquation()">Check</button>
        </div>`;
    } else if (eqCurrentType === 'system') {
        inputsHTML = `<div class="input-row-multi">
            <div class="eq-input-pair"><span class="eq-label">x =</span>
                <input type="text" id="eq-x" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <div class="eq-input-pair"><span class="eq-label">y =</span>
                <input type="text" id="eq-y" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <button class="check-btn" onclick="checkEquation()">Check</button>
        </div>`;
    } else {
        const isComplex = eqExpected.type === 'complex';
        if (isComplex) {
            inputsHTML = `<div class="input-row-multi">
                <div class="eq-input-pair"><span class="eq-label">x =</span>
                    <input type="text" id="eq-re" autocomplete="off" class="eq-ans-input eq-small"> <span class="eq-label">±</span>
                    <input type="text" id="eq-im" autocomplete="off" class="eq-ans-input eq-small"><span class="eq-label">i</span></div>
                <button class="check-btn" onclick="checkEquation()">Check</button>
            </div>`;
        } else {
            inputsHTML = `<div class="input-row-multi">
                <div class="eq-input-pair"><span class="eq-label">x₁ =</span>
                    <input type="text" id="eq-x1" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
                <div class="eq-input-pair"><span class="eq-label">x₂ =</span>
                    <input type="text" id="eq-x2" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
                <button class="check-btn" onclick="checkEquation()">Check</button>
            </div>`;
        }
    }

    area.innerHTML = `<div class="problem" id="eq-display">${eqProblemData.display}</div>
        ${inputsHTML}
        <div class="feedback" id="eq-feedback"></div>
        <button class="next-btn" id="eq-next" onclick="generateEquation()" style="display:none">Next →</button>`;

    const fi = area.querySelector('input');
    if (fi) fi.focus();
}

function checkEquation() {
    const fb = document.getElementById('eq-feedback');
    const elapsed = ((Date.now() - eqStartTime) / 1000).toFixed(1);
    let correct = false;

    if (eqCurrentType === 'simple') {
        const ux = parseFloat(document.getElementById('eq-x').value.trim());
        correct = approxEq(ux, eqExpected.x, 0.01);
    } else if (eqCurrentType === 'system') {
        const ux = parseFloat(document.getElementById('eq-x').value.trim());
        const uy = parseFloat(document.getElementById('eq-y').value.trim());
        correct = approxEq(ux, eqExpected.x, 0.01) && approxEq(uy, eqExpected.y, 0.01);
    } else if (eqExpected.type === 'complex') {
        const re = parseFloat(document.getElementById('eq-re').value.trim());
        const im = parseFloat(document.getElementById('eq-im').value.trim());
        correct = approxEq(re, eqExpected.re, 0.01) && approxEq(im, eqExpected.im, 0.01);
    } else {
        const x1 = parseFloat(document.getElementById('eq-x1').value.trim());
        const x2 = parseFloat(document.getElementById('eq-x2').value.trim());
        const [r1, r2] = eqExpected.roots;
        correct = (approxEq(x1, r1, 0.01) && approxEq(x2, r2, 0.01)) ||
                  (approxEq(x1, r2, 0.01) && approxEq(x2, r1, 0.01));
    }

    eqTotal++;
    const topicNames = { simple: 'Simple Equations', system: '2-Variable Systems', quadratic: 'Quadratic Equations' };
    if (correct) {
        eqCorrect++;
        eqStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        eqStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Solution:</h4><pre>${eqProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult(topicNames[eqCurrentType], correct, parseFloat(elapsed));

    document.getElementById('eq-score').textContent = `Score: ${eqCorrect}/${eqTotal}`;
    document.getElementById('eq-streak').textContent = `Streak: ${eqStreak}`;
    document.getElementById('eq-time').textContent = `Time: ${elapsed}s`;
    document.getElementById('eq-next').style.display = 'inline-block';
}

// ============ Start Functions ============

function startEquations(type, title) {
    eqCurrentType = type;
    eqCorrect = 0; eqTotal = 0; eqStreak = 0;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('equations').style.display = 'block';
    document.getElementById('eq-title').textContent = title;
    document.getElementById('eq-score').textContent = 'Score: 0/0';
    document.getElementById('eq-streak').textContent = 'Streak: 0';
    document.getElementById('eq-time').textContent = 'Time: —';

    const settings = document.getElementById('eq-settings');
    if (type === 'quadratic') {
        settings.innerHTML = `<label>Roots: <select id="eq-quad-mode" onchange="generateEquation()">
            <option value="real">Real (integer)</option>
            <option value="complex">Complex</option>
        </select></label>`;
    } else {
        settings.innerHTML = '';
    }

    generateEquation();
}

function startSimpleEq() { startEquations('simple', 'Simple Equations'); }
function startSystem() { startEquations('system', '2-Variable Systems'); }
function startQuadratic() { startEquations('quadratic', 'Quadratic Equations'); }
