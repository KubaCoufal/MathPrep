let optCorrect = 0, optTotal = 0, optStreak = 0;
let optStartTime = null;
let optCurrentType = 'lp';
let optExpected = null;
let optProblemData = null;

// ============ Linear Programming ============

function fmtConstraint(a, b, c) {
    return formatExpr([[a, 'x'], [b, 'y']]) + ' ≤ ' + c;
}

function genLP() {
    const useTriangle = Math.random() < 0.3;
    let vertices, constraintStrs;

    if (useTriangle) {
        const a = randInt(3, 8), b = randInt(3, 8);
        vertices = [[0, 0], [a, 0], [0, b]];
        constraintStrs = [fmtConstraint(b, a, a * b)];
    } else {
        let a, b, p, q;
        do {
            a = randInt(3, 8);
            b = randInt(3, 8);
            p = randInt(1, a - 1);
            q = randInt(1, b - 1);
        } while (p * b + q * a <= a * b);

        vertices = [[0, 0], [a, 0], [p, q], [0, b]];
        constraintStrs = [
            fmtConstraint(q, a - p, q * a),
            fmtConstraint(b - q, p, p * b)
        ];
    }

    const c1 = randInt(1, 5), c2 = randInt(1, 5);
    const isMax = Math.random() < 0.6;

    const values = vertices.map(([x, y]) => c1 * x + c2 * y);
    let optIdx = 0;
    for (let i = 1; i < values.length; i++) {
        if (isMax ? values[i] > values[optIdx] : values[i] < values[optIdx])
            optIdx = i;
    }

    const [optX, optY] = vertices[optIdx];
    const optVal = values[optIdx];

    const objective = formatExpr([[c1, 'x'], [c2, 'y']]);
    const sense = isMax ? 'Maximize' : 'Minimize';

    let display = `<strong>${sense}</strong> z = ${objective}<br><br>`;
    display += '<strong>Subject to:</strong><br>';
    for (const cs of constraintStrs) display += cs + '<br>';
    display += 'x ≥ 0, y ≥ 0';

    let solution = 'Corner points and z values:\n';
    for (let i = 0; i < vertices.length; i++) {
        const [vx, vy] = vertices[i];
        const mark = i === optIdx ? ' ← optimal' : '';
        solution += `(${vx}, ${vy}): z = ${c1}·${vx} + ${c2}·${vy} = ${values[i]}${mark}\n`;
    }
    solution += `\nOptimal: x* = ${optX}, y* = ${optY}, z* = ${optVal}`;

    return { display, expected: { x: optX, y: optY, z: optVal }, solution };
}

// ============ Unconstrained Optimization ============

function genUnconstrained() {
    const types = ['min', 'max', 'saddle'];
    const type = types[Math.floor(Math.random() * types.length)];

    let a, b, c;
    if (type === 'min') {
        a = randInt(1, 3);
        c = randInt(1, 3);
        const maxB = Math.floor(Math.sqrt(4 * a * c - 1));
        b = maxB > 0 ? randInt(-maxB, maxB) : 0;
    } else if (type === 'max') {
        a = -randInt(1, 3);
        c = -randInt(1, 3);
        const maxB = Math.floor(Math.sqrt(4 * Math.abs(a) * Math.abs(c) - 1));
        b = maxB > 0 ? randInt(-maxB, maxB) : 0;
    } else {
        a = randInt(1, 3);
        c = -randInt(1, 3);
        b = randInt(-2, 2);
    }

    const x0 = randInt(-3, 3);
    const y0 = randInt(-3, 3);
    const d = -(2 * a * x0 + b * y0);
    const e = -(b * x0 + 2 * c * y0);

    const fDisplay = formatExpr([[a, 'x²'], [b, 'xy'], [c, 'y²'], [d, 'x'], [e, 'y']]);
    const detH = 4 * a * c - b * b;
    const classLabel = type === 'min' ? 'Minimum' : (type === 'max' ? 'Maximum' : 'Saddle point');

    const dfdx = formatExpr([[2 * a, 'x'], [b, 'y'], [d, '']]);
    const dfdy = formatExpr([[b, 'x'], [2 * c, 'y'], [e, '']]);

    let classExpl;
    if (detH > 0) classExpl = a > 0 ? 'det > 0 and f_xx > 0 → Minimum' : 'det > 0 and f_xx < 0 → Maximum';
    else classExpl = 'det < 0 → Saddle point';

    const solution =
        `∂f/∂x = ${dfdx} = 0\n` +
        `∂f/∂y = ${dfdy} = 0\n\n` +
        `Solving: x = ${x0}, y = ${y0}\n\n` +
        `Hessian H = [[${2 * a}, ${b}], [${b}, ${2 * c}]]\n` +
        `det(H) = ${4 * a * c} − ${b * b} = ${detH}\n` +
        classExpl;

    return {
        display: `<strong>Find and classify the critical point:</strong><br><br>f(x, y) = ${fDisplay}`,
        expected: { x: x0, y: y0, type },
        solution
    };
}

// ============ Lagrange Multipliers ============

function genLagrange() {
    const variant = Math.random() < 0.5 ? 'dist' : 'product';

    if (variant === 'dist') {
        const aa = randInt(1, 4), bb = randInt(1, 4);
        const s2 = aa * aa + bb * bb;
        const k = randInt(1, 3);
        const cc = s2 * k;
        const xx = aa * k, yy = bb * k;
        const fVal = xx * xx + yy * yy;
        const lamVal = 2 * k;

        const constraintStr = formatExpr([[aa, 'x'], [bb, 'y']]) + ' = ' + cc;

        const solution =
            `Minimize f = x² + y² subject to ${constraintStr}\n\n` +
            `∇f = (2x, 2y) = λ∇g = λ(${aa}, ${bb})\n` +
            `2x = ${aa}λ → x = ${aa}λ/2\n` +
            `2y = ${bb}λ → y = ${bb}λ/2\n\n` +
            `Substituting into constraint:\n` +
            `${aa}(${aa}λ/2) + ${bb}(${bb}λ/2) = ${cc}\n` +
            `${s2}λ/2 = ${cc} → λ = ${lamVal}\n\n` +
            `x = ${xx}, y = ${yy}, f* = ${fVal}`;

        return {
            display: `<strong>Minimize</strong> f(x, y) = x² + y²<br><br><strong>Subject to:</strong> ${constraintStr}`,
            expected: { x: xx, y: yy, lambda: lamVal, f: fVal },
            solution
        };
    } else {
        const half = randInt(2, 6);
        const S = 2 * half;
        const fStar = half * half;

        const solution =
            `Maximize f = xy subject to x + y = ${S}\n\n` +
            `∇f = (y, x) = λ∇g = λ(1, 1)\n` +
            `y = λ, x = λ → x = y\n\n` +
            `Substituting: 2x = ${S} → x = ${half}\n` +
            `x = ${half}, y = ${half}, λ = ${half}\n` +
            `f* = ${half} · ${half} = ${fStar}`;

        return {
            display: `<strong>Maximize</strong> f(x, y) = xy<br><br><strong>Subject to:</strong> x + y = ${S}`,
            expected: { x: half, y: half, lambda: half, f: fStar },
            solution
        };
    }
}

// ============ UI ============

function generateOptProblem() {
    if (optCurrentType === 'lp') optProblemData = genLP();
    else if (optCurrentType === 'unconstrained') optProblemData = genUnconstrained();
    else optProblemData = genLagrange();

    optExpected = optProblemData.expected;
    optStartTime = Date.now();

    const area = document.getElementById('opt-problem-area');
    let inputsHTML = '';

    if (optCurrentType === 'lp') {
        inputsHTML = `<div class="input-row-multi">
            <div class="eq-input-pair"><span class="eq-label">x* =</span>
                <input type="text" id="opt-x" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <div class="eq-input-pair"><span class="eq-label">y* =</span>
                <input type="text" id="opt-y" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <div class="eq-input-pair"><span class="eq-label">z* =</span>
                <input type="text" id="opt-z" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <button class="check-btn" onclick="checkOptProblem()">Check</button>
        </div>`;
    } else if (optCurrentType === 'unconstrained') {
        inputsHTML = `<div class="input-row-multi">
            <div class="eq-input-pair"><span class="eq-label">x =</span>
                <input type="text" id="opt-x" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <div class="eq-input-pair"><span class="eq-label">y =</span>
                <input type="text" id="opt-y" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
        </div>
        <div class="input-row-multi">
            <span class="eq-label">Type:</span>
            <select id="opt-class" class="opt-select">
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
                <option value="saddle">Saddle point</option>
            </select>
            <button class="check-btn" onclick="checkOptProblem()">Check</button>
        </div>`;
    } else {
        inputsHTML = `<div class="input-row-multi">
            <div class="eq-input-pair"><span class="eq-label">x =</span>
                <input type="text" id="opt-x" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <div class="eq-input-pair"><span class="eq-label">y =</span>
                <input type="text" id="opt-y" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
        </div>
        <div class="input-row-multi">
            <div class="eq-input-pair"><span class="eq-label">λ =</span>
                <input type="text" id="opt-lam" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <div class="eq-input-pair"><span class="eq-label">f* =</span>
                <input type="text" id="opt-f" autocomplete="off" inputmode="decimal" class="eq-ans-input"></div>
            <button class="check-btn" onclick="checkOptProblem()">Check</button>
        </div>`;
    }

    area.innerHTML = `<div class="problem" style="font-size:1.15rem;text-align:left;line-height:1.8;display:block">${optProblemData.display}</div>
        ${inputsHTML}
        <div class="feedback" id="opt-feedback"></div>
        <button class="next-btn" id="opt-next" onclick="generateOptProblem()" style="display:none">Next →</button>`;

    const fi = area.querySelector('input');
    if (fi) fi.focus();
}

function checkOptProblem() {
    const fb = document.getElementById('opt-feedback');
    const elapsed = ((Date.now() - optStartTime) / 1000).toFixed(1);
    let correct = false;

    if (optCurrentType === 'lp') {
        const ux = parseFloat(document.getElementById('opt-x').value.trim());
        const uy = parseFloat(document.getElementById('opt-y').value.trim());
        const uz = parseFloat(document.getElementById('opt-z').value.trim());
        correct = approxEq(ux, optExpected.x, 0.01) &&
                  approxEq(uy, optExpected.y, 0.01) &&
                  approxEq(uz, optExpected.z, 0.01);
    } else if (optCurrentType === 'unconstrained') {
        const ux = parseFloat(document.getElementById('opt-x').value.trim());
        const uy = parseFloat(document.getElementById('opt-y').value.trim());
        const utype = document.getElementById('opt-class').value;
        correct = approxEq(ux, optExpected.x, 0.01) &&
                  approxEq(uy, optExpected.y, 0.01) &&
                  utype === optExpected.type;
    } else {
        const ux = parseFloat(document.getElementById('opt-x').value.trim());
        const uy = parseFloat(document.getElementById('opt-y').value.trim());
        const ulam = parseFloat(document.getElementById('opt-lam').value.trim());
        const uf = parseFloat(document.getElementById('opt-f').value.trim());
        correct = approxEq(ux, optExpected.x, 0.01) &&
                  approxEq(uy, optExpected.y, 0.01) &&
                  approxEq(ulam, optExpected.lambda, 0.01) &&
                  approxEq(uf, optExpected.f, 0.5);
    }

    optTotal++;
    const topicNames = { lp: 'Linear Programming', unconstrained: 'Unconstrained Optimization', lagrange: 'Lagrange Multipliers' };
    if (correct) {
        optCorrect++;
        optStreak++;
        fb.textContent = `Correct! (${elapsed}s)`;
        fb.className = 'feedback correct';
    } else {
        optStreak = 0;
        fb.innerHTML = `<span>Wrong</span><div class="solution-detail"><h4>Solution:</h4><pre>${optProblemData.solution}</pre></div>`;
        fb.className = 'feedback wrong';
    }
    recordResult(topicNames[optCurrentType], correct, parseFloat(elapsed));

    document.getElementById('opt-score').textContent = `Score: ${optCorrect}/${optTotal}`;
    document.getElementById('opt-streak').textContent = `Streak: ${optStreak}`;
    document.getElementById('opt-time').textContent = `Time: ${elapsed}s`;
    document.getElementById('opt-next').style.display = 'inline-block';
}

// ============ Start Functions ============

function startOpt(type, title) {
    optCurrentType = type;
    optCorrect = 0; optTotal = 0; optStreak = 0;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('optimization').style.display = 'block';
    document.getElementById('opt-title').textContent = title;
    document.getElementById('opt-score').textContent = 'Score: 0/0';
    document.getElementById('opt-streak').textContent = 'Streak: 0';
    document.getElementById('opt-time').textContent = 'Time: —';
    document.getElementById('opt-settings').innerHTML = '';
    generateOptProblem();
}

function startLP() { startOpt('lp', 'Linear Programming'); }
function startUnconstrainedOpt() { startOpt('unconstrained', 'Unconstrained Optimization'); }
function startLagrange() { startOpt('lagrange', 'Lagrange Multipliers'); }
