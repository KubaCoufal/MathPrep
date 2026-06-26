let wizardState = null;
let decompScores = { lu: { c: 0, t: 0 }, qr: { c: 0, t: 0 }, svd: { c: 0, t: 0 } };
let currentDecompType = 'lu';

function mMul(A, B) {
    const m = A.length, n = B[0].length, p = B.length;
    const C = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
            for (let k = 0; k < p; k++)
                C[i][j] += A[i][k] * B[k][j];
    return C;
}

function mTrans(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
}

function vNorm(v) { return Math.sqrt(v.reduce((s, x) => s + x * x, 0)); }
function vDot(a, b) { return a.reduce((s, x, i) => s + x * b[i], 0); }
function vScale(v, s) { return v.map(x => x * s); }
function vSub(a, b) { return a.map((x, i) => x - b[i]); }
function getCol(M, j) { return M.map(row => row[j]); }

function parseNum(s) {
    s = s.trim();
    if (s.includes('/')) {
        const parts = s.split('/');
        const n = parseFloat(parts[0]), d = parseFloat(parts[1]);
        return d === 0 ? NaN : n / d;
    }
    return parseFloat(s);
}

function approxEq(a, b, tol) { return Math.abs(a - b) < (tol || 0.05); }
function fmtNum(x) {
    if (Number.isInteger(x)) return String(x);
    const r = Math.round(x * 1000) / 1000;
    if (Number.isInteger(r)) return String(r);
    return r.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function readScalar(id) {
    const el = document.getElementById(id);
    return el ? parseNum(el.value) : NaN;
}

function readVector(id, n) {
    return Array.from({ length: n }, (_, i) => readScalar(`${id}-${i}`));
}

function readMatrixPF(id, rows, cols, prefill) {
    const M = [];
    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            if (prefill && prefill[i][j] !== null) row.push(prefill[i][j]);
            else row.push(readScalar(`${id}-${i}-${j}`));
        }
        M.push(row);
    }
    return M;
}

function renderMat(m, label) {
    const cols = m[0].length;
    const cells = m.flat().map(v => `<span>${fmtNum(v)}</span>`).join('');
    return `${label ? `<div class="mat-label">${label}</div>` : ''}
        <div class="matrix-display"><div class="matrix-wrapper">
        <span class="matrix-bracket">[</span>
        <div class="matrix-grid" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>
        <span class="matrix-bracket">]</span></div></div>`;
}

function inputScalarHTML(id, label) {
    return `<div class="step-field"><label>${label}</label>
        <input type="text" id="${id}" autocomplete="off" class="scalar-input"></div>`;
}

function inputVectorHTML(id, n, label) {
    let inputs = '';
    for (let i = 0; i < n; i++)
        inputs += `<input type="text" id="${id}-${i}" autocomplete="off" class="vec-input">`;
    return `<div class="step-field"><label>${label}</label><div class="vec-row">${inputs}</div></div>`;
}

function inputMatrixHTML(id, rows, cols, prefill, label) {
    let inputs = '';
    for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
            const pf = prefill ? prefill[i][j] : null;
            if (pf !== null)
                inputs += `<input type="text" value="${fmtNum(pf)}" disabled class="mat-input prefilled">`;
            else
                inputs += `<input type="text" id="${id}-${i}-${j}" autocomplete="off" class="mat-input">`;
        }
    return `<div class="step-field"><label>${label}</label>
        <div class="matrix-input-wrapper"><span class="matrix-bracket">[</span>
        <div class="matrix-input-grid" style="grid-template-columns:repeat(${cols},1fr)">${inputs}</div>
        <span class="matrix-bracket">]</span></div></div>`;
}

function isApproxScalarMult(v1, v2, tol) {
    tol = tol || 0.1;
    let ratio = null;
    for (let i = 0; i < v1.length; i++) {
        if (Math.abs(v2[i]) < 0.001 && Math.abs(v1[i]) < 0.001) continue;
        if (Math.abs(v2[i]) < 0.001 || Math.abs(v1[i]) < 0.001) return false;
        const r = v1[i] / v2[i];
        if (ratio === null) ratio = r;
        else if (Math.abs(r - ratio) > tol) return false;
    }
    return ratio !== null;
}

// ============ Step Wizard Engine ============

function startWizard(type, steps, summaryFn) {
    wizardState = { type, steps, currentStep: 0, summaryFn, stepStart: Date.now() };
    renderCurrentStep();
}

function renderCurrentStep() {
    if (wizardState.currentStep >= wizardState.steps.length) {
        showWizardSummary();
        return;
    }
    const step = wizardState.steps[wizardState.currentStep];
    const area = document.getElementById('decomp-problem-area');
    const n = wizardState.steps.length;
    const cur = wizardState.currentStep + 1;

    area.innerHTML = `<div class="step-progress">Step ${cur} of ${n}</div>
        ${step.content}
        <div class="step-actions"><button class="check-btn" onclick="checkCurrentStep()">Check</button></div>
        <div class="feedback" id="step-feedback"></div>
        <button class="next-btn" id="step-next" onclick="goNextStep()" style="display:none">
            ${cur < n ? 'Next Step →' : 'See Result →'}</button>`;

    const fi = area.querySelector('input:not([disabled])');
    if (fi) fi.focus();
}

function checkCurrentStep() {
    const step = wizardState.steps[wizardState.currentStep];
    const result = step.validate();
    const fb = document.getElementById('step-feedback');

    const elapsed = (Date.now() - wizardState.stepStart) / 1000;
    const topicNames = { lu: 'LU Decomposition', qr: 'QR Decomposition', svd: 'SVD' };
    if (result.correct) {
        decompScores[wizardState.type].c++;
        fb.textContent = (result.message || 'Correct!') + ` (${elapsed.toFixed(1)}s)`;
        fb.className = 'feedback correct';
    } else {
        fb.innerHTML = result.message;
        fb.className = 'feedback wrong';
    }
    decompScores[wizardState.type].t++;
    recordResult(topicNames[wizardState.type], result.correct, parseFloat(elapsed.toFixed(1)));
    updateDecompScore();
    document.getElementById('step-next').style.display = 'inline-block';
}

function goNextStep() {
    wizardState.currentStep++;
    wizardState.stepStart = Date.now();
    renderCurrentStep();
}

function showWizardSummary() {
    const area = document.getElementById('decomp-problem-area');
    area.innerHTML = `<div class="step-progress">Complete!</div>
        ${wizardState.summaryFn()}
        <button class="next-btn" onclick="generateDecompProblem()">Next Problem →</button>`;
}

function updateDecompScore() {
    const s = decompScores[currentDecompType];
    document.getElementById('decomp-score').textContent = `Steps: ${s.c}/${s.t}`;
}

function generateDecompProblem() {
    const size = parseInt(document.getElementById('decomp-size-select').value);
    if (currentDecompType === 'lu') generateLU(size);
    else if (currentDecompType === 'qr') generateQR(size);
    else generateSVD(size);
}

// ============ LU Decomposition ============

function generateLU(n) {
    const L = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
            if (i === j) return 1;
            if (j < i) return randInt(-3, 3);
            return 0;
        }));
    const U = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
            if (i === j) { let v = randInt(1, 4); return Math.random() < 0.3 ? -v : v; }
            if (j > i) return randInt(-4, 4);
            return 0;
        }));
    const A = mMul(L, U);
    const steps = n === 2 ? buildLU2(A, L, U) : buildLU3(A, L, U);
    const summary = () => `<div class="summary-matrices">
        ${renderMat(A, 'A =')}${renderMat(L, 'L =')}${renderMat(U, 'U =')}
        <div class="verify-msg">A = LU ✓</div></div>`;
    startWizard('lu', steps, summary);
}

function buildLU2(A, L, U) {
    const l21 = L[1][0];
    const newR2 = [U[1][0], U[1][1]];
    const Lpf = [[1, 0], [null, 1]];
    const Upf = [[null, null], [0, null]];

    return [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Find the multiplier to eliminate a₂₁:<br>
                l₂₁ = a₂₁ / a₁₁ = ${A[1][0]} / ${A[0][0]}</div>
                ${inputScalarHTML('lu-l21', 'l₂₁ =')}`,
            validate: () => {
                const v = readScalar('lu-l21');
                if (approxEq(v, l21, 0.01)) return { correct: true, message: `l₂₁ = ${fmtNum(l21)}` };
                return { correct: false, message: `l₂₁ = ${A[1][0]} / ${A[0][0]} = ${fmtNum(l21)}` };
            }
        },
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Eliminate: R₂ ← R₂ − (${fmtNum(l21)})·R₁<br>
                Enter the new Row 2:</div>
                ${inputVectorHTML('lu-r2', 2, 'Row 2:')}`,
            validate: () => {
                const v = readVector('lu-r2', 2);
                if (v.every((x, i) => approxEq(x, newR2[i], 0.01))) return { correct: true };
                return { correct: false, message: `Row 2 = [${newR2.map(fmtNum).join(', ')}]` };
            }
        },
        {
            content: `<div class="step-instruction">Enter the final L and U matrices:</div>
                ${inputMatrixHTML('lu-L', 2, 2, Lpf, 'L =')}
                ${inputMatrixHTML('lu-U', 2, 2, Upf, 'U =')}`,
            validate: () => {
                const Lv = readMatrixPF('lu-L', 2, 2, Lpf);
                const Uv = readMatrixPF('lu-U', 2, 2, Upf);
                let errs = [];
                if (!approxEq(Lv[1][0], l21, 0.01)) errs.push(`L₂₁ should be ${fmtNum(l21)}`);
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (Upf[i][j] === null && !approxEq(Uv[i][j], U[i][j], 0.01))
                            errs.push(`U${i+1}${j+1} should be ${fmtNum(U[i][j])}`);
                if (errs.length === 0) return { correct: true, message: 'A = LU ✓' };
                return { correct: false, message: errs.join('<br>') };
            }
        }
    ];
}

function buildLU3(A, L, U) {
    const l21 = L[1][0], l31 = L[2][0];
    const mid = mMul(L, U).map(r => [...r]);
    const r2after1 = [0, A[1][1] - l21 * A[0][1], A[1][2] - l21 * A[0][2]];
    const r3after1 = [0, A[2][1] - l31 * A[0][1], A[2][2] - l31 * A[0][2]];
    const l32 = L[2][1];
    const r3after2 = [0, 0, r3after1[2] - l32 * r2after1[2]];
    const Lpf = [[1, 0, 0], [null, 1, 0], [null, null, 1]];
    const Upf = [[null, null, null], [0, null, null], [0, 0, null]];

    return [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Find the multipliers to eliminate column 1:</div>
                ${inputScalarHTML('lu-l21', 'l₂₁ = a₂₁/a₁₁ = ' + A[1][0] + '/' + A[0][0] + ' =')}
                ${inputScalarHTML('lu-l31', 'l₃₁ = a₃₁/a₁₁ = ' + A[2][0] + '/' + A[0][0] + ' =')}`,
            validate: () => {
                const v21 = readScalar('lu-l21'), v31 = readScalar('lu-l31');
                let errs = [];
                if (!approxEq(v21, l21, 0.01)) errs.push(`l₂₁ = ${fmtNum(l21)}`);
                if (!approxEq(v31, l31, 0.01)) errs.push(`l₃₁ = ${fmtNum(l31)}`);
                if (errs.length === 0) return { correct: true };
                return { correct: false, message: 'Incorrect: ' + errs.join(', ') };
            }
        },
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Eliminate column 1:<br>
                R₂ ← R₂ − (${fmtNum(l21)})·R₁<br>
                R₃ ← R₃ − (${fmtNum(l31)})·R₁</div>
                ${inputVectorHTML('lu-r2', 3, 'New Row 2:')}
                ${inputVectorHTML('lu-r3', 3, 'New Row 3:')}`,
            validate: () => {
                const v2 = readVector('lu-r2', 3), v3 = readVector('lu-r3', 3);
                let ok = true, msg = '';
                if (!v2.every((x, i) => approxEq(x, r2after1[i], 0.01))) {
                    ok = false; msg += `Row 2 = [${r2after1.map(fmtNum).join(', ')}]<br>`;
                }
                if (!v3.every((x, i) => approxEq(x, r3after1[i], 0.01))) {
                    ok = false; msg += `Row 3 = [${r3after1.map(fmtNum).join(', ')}]`;
                }
                if (ok) return { correct: true };
                return { correct: false, message: msg };
            }
        },
        {
            content: `<div class="step-instruction">After column 1 elimination:</div>
                ${renderMat([A[0], r2after1, r3after1])}
                <div class="step-instruction">Find the multiplier to eliminate below pivot 2:<br>
                l₃₂ = a'₃₂ / a'₂₂ = ${fmtNum(r3after1[1])} / ${fmtNum(r2after1[1])}</div>
                ${inputScalarHTML('lu-l32', 'l₃₂ =')}`,
            validate: () => {
                const v = readScalar('lu-l32');
                if (approxEq(v, l32, 0.01)) return { correct: true, message: `l₃₂ = ${fmtNum(l32)}` };
                return { correct: false, message: `l₃₂ = ${fmtNum(l32)}` };
            }
        },
        {
            content: `<div class="step-instruction">After column 1 elimination:</div>
                ${renderMat([A[0], r2after1, r3after1])}
                <div class="step-instruction">Eliminate: R₃ ← R₃ − (${fmtNum(l32)})·R₂<br>Enter new Row 3:</div>
                ${inputVectorHTML('lu-r3b', 3, 'New Row 3:')}`,
            validate: () => {
                const v = readVector('lu-r3b', 3);
                if (v.every((x, i) => approxEq(x, r3after2[i], 0.01))) return { correct: true };
                return { correct: false, message: `Row 3 = [${r3after2.map(fmtNum).join(', ')}]` };
            }
        },
        {
            content: `<div class="step-instruction">Enter the final L and U matrices:</div>
                ${inputMatrixHTML('lu-L', 3, 3, Lpf, 'L =')}
                ${inputMatrixHTML('lu-U', 3, 3, Upf, 'U =')}`,
            validate: () => {
                const Lv = readMatrixPF('lu-L', 3, 3, Lpf);
                const Uv = readMatrixPF('lu-U', 3, 3, Upf);
                let errs = [];
                [[1,0,l21],[2,0,l31],[2,1,l32]].forEach(([i,j,exp]) => {
                    if (!approxEq(Lv[i][j], exp, 0.01)) errs.push(`L${i+1}${j+1} = ${fmtNum(exp)}`);
                });
                for (let i = 0; i < 3; i++)
                    for (let j = i; j < 3; j++)
                        if (!approxEq(Uv[i][j], U[i][j], 0.01))
                            errs.push(`U${i+1}${j+1} = ${fmtNum(U[i][j])}`);
                if (errs.length === 0) return { correct: true, message: 'A = LU ✓' };
                return { correct: false, message: errs.join('<br>') };
            }
        }
    ];
}

// ============ QR Decomposition ============

function generateQRMatrix2() {
    const triples = [[3,4,5],[4,3,5],[5,12,13],[12,5,13],[8,15,17]];
    const [a, b, c] = triples[Math.floor(Math.random() * triples.length)];
    const sa = Math.random() < 0.3 ? -1 : 1;
    const sb = Math.random() < 0.3 ? -1 : 1;
    const k = randInt(1, 3);
    const m = randInt(1, 3);
    return [[sa*a, sa*a*k - sb*b*m], [sb*b, sb*b*k + sa*a*m]];
}

function generateQR(n) {
    const A = n === 2 ? generateQRMatrix2() :
        Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => randInt(-4, 4)));

    const cols = A[0].length;
    const Q = [], R = Array.from({ length: cols }, () => Array(cols).fill(0));
    const qCols = [];

    for (let j = 0; j < cols; j++) {
        let v = getCol(A, j);
        for (let i = 0; i < j; i++) {
            R[i][j] = vDot(qCols[i], getCol(A, j));
            v = vSub(v, vScale(qCols[i], R[i][j]));
        }
        R[j][j] = vNorm(v);
        if (R[j][j] < 0.0001) {
            return generateQR(n);
        }
        qCols.push(vScale(v, 1 / R[j][j]));
    }

    const Qmat = A.map((_, i) => qCols.map(col => col[i]));
    const steps = n === 2 ? buildQR2(A, Qmat, R, qCols) : buildQR3(A, Qmat, R, qCols);
    const summary = () => `<div class="summary-matrices">
        ${renderMat(A, 'A =')}${renderMat(Qmat, 'Q =')}${renderMat(R, 'R =')}
        <div class="verify-msg">A = QR ✓</div></div>`;
    startWizard('qr', steps, summary);
}

function buildQR2(A, Q, R, qCols) {
    const a1 = getCol(A, 0), a2 = getCol(A, 1);
    const r11 = R[0][0], r12 = R[0][1], r22 = R[1][1];
    const q1 = qCols[0], q2 = qCols[1];
    const a2p = vSub(a2, vScale(q1, r12));
    const tol = 0.05;
    const hint = ' (Enter as decimal or fraction, e.g. 0.6 or 3/5)';

    return [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Gram-Schmidt step 1: Compute the norm of column 1.<br>
                r₁₁ = ‖a₁‖ = ‖[${a1.map(fmtNum).join(', ')}]‖</div>
                ${inputScalarHTML('qr-r11', 'r₁₁ =')}`,
            validate: () => {
                const v = readScalar('qr-r11');
                if (approxEq(v, r11, tol)) return { correct: true, message: `r₁₁ = ${fmtNum(r11)}` };
                return { correct: false, message: `r₁₁ = ‖a₁‖ = ${fmtNum(r11)}` };
            }
        },
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Compute q₁ = a₁ / r₁₁ = a₁ / ${fmtNum(r11)}${hint}</div>
                ${inputVectorHTML('qr-q1', 2, 'q₁ =')}`,
            validate: () => {
                const v = readVector('qr-q1', 2);
                if (v.every((x, i) => approxEq(x, q1[i], tol))) return { correct: true };
                return { correct: false, message: `q₁ = [${q1.map(fmtNum).join(', ')}]` };
            }
        },
        {
            content: `<div class="step-instruction">Compute r₁₂ = q₁ᵀ · a₂<br>
                q₁ = [${q1.map(fmtNum).join(', ')}], a₂ = [${a2.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r12', 'r₁₂ =')}`,
            validate: () => {
                const v = readScalar('qr-r12');
                if (approxEq(v, r12, tol)) return { correct: true, message: `r₁₂ = ${fmtNum(r12)}` };
                return { correct: false, message: `r₁₂ = ${fmtNum(r12)}` };
            }
        },
        {
            content: `<div class="step-instruction">Orthogonalize: a₂' = a₂ − r₁₂·q₁<br>
                a₂' = [${a2.map(fmtNum).join(', ')}] − ${fmtNum(r12)}·[${q1.map(fmtNum).join(', ')}]</div>
                ${inputVectorHTML('qr-a2p', 2, "a₂' =")}`,
            validate: () => {
                const v = readVector('qr-a2p', 2);
                if (v.every((x, i) => approxEq(x, a2p[i], tol))) return { correct: true };
                return { correct: false, message: `a₂' = [${a2p.map(fmtNum).join(', ')}]` };
            }
        },
        {
            content: `<div class="step-instruction">Compute r₂₂ = ‖a₂'‖ where a₂' = [${a2p.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r22', 'r₂₂ =')}`,
            validate: () => {
                const v = readScalar('qr-r22');
                if (approxEq(v, r22, tol)) return { correct: true, message: `r₂₂ = ${fmtNum(r22)}` };
                return { correct: false, message: `r₂₂ = ${fmtNum(r22)}` };
            }
        },
        {
            content: `<div class="step-instruction">Compute q₂ = a₂' / r₂₂ = [${a2p.map(fmtNum).join(', ')}] / ${fmtNum(r22)}${hint}</div>
                ${inputVectorHTML('qr-q2', 2, 'q₂ =')}`,
            validate: () => {
                const v = readVector('qr-q2', 2);
                if (v.every((x, i) => approxEq(x, q2[i], tol))) return { correct: true };
                return { correct: false, message: `q₂ = [${q2.map(fmtNum).join(', ')}]` };
            }
        },
        {
            content: `<div class="step-instruction">Write the final Q and R matrices:${hint}</div>
                ${inputMatrixHTML('qr-Q', 2, 2, [[null,null],[null,null]], 'Q =')}
                ${inputMatrixHTML('qr-R', 2, 2, [[null,null],[0,null]], 'R =')}`,
            validate: () => {
                const Qv = readMatrixPF('qr-Q', 2, 2, [[null,null],[null,null]]);
                const Rv = readMatrixPF('qr-R', 2, 2, [[null,null],[0,null]]);
                let errs = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++) {
                        if (!approxEq(Qv[i][j], Q[i][j], tol)) errs.push(`Q${i+1}${j+1} = ${fmtNum(Q[i][j])}`);
                        if (!(i > j) && !approxEq(Rv[i][j], R[i][j], tol)) errs.push(`R${i+1}${j+1} = ${fmtNum(R[i][j])}`);
                    }
                if (errs.length === 0) return { correct: true, message: 'A = QR ✓' };
                return { correct: false, message: errs.join('<br>') };
            }
        }
    ];
}

function buildQR3(A, Q, R, qCols) {
    const a1 = getCol(A, 0), a2 = getCol(A, 1), a3 = getCol(A, 2);
    const q1 = qCols[0], q2 = qCols[1], q3 = qCols[2];
    const a2p = vSub(a2, vScale(q1, R[0][1]));
    const a3p = vSub(vSub(a3, vScale(q1, R[0][2])), vScale(q2, R[1][2]));
    const tol = 0.05;
    const hint = ' (Round to 2 decimals)';

    return [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Compute r₁₁ = ‖a₁‖ and q₁ = a₁/r₁₁${hint}</div>
                ${inputScalarHTML('qr-r11', 'r₁₁ =')}
                ${inputVectorHTML('qr-q1', 3, 'q₁ =')}`,
            validate: () => {
                const r = readScalar('qr-r11'), q = readVector('qr-q1', 3);
                let ok = approxEq(r, R[0][0], tol) && q.every((x, i) => approxEq(x, q1[i], tol));
                if (ok) return { correct: true };
                return { correct: false, message: `r₁₁ = ${fmtNum(R[0][0])}, q₁ = [${q1.map(fmtNum).join(', ')}]` };
            }
        },
        {
            content: `<div class="step-instruction">Compute projections onto q₁:<br>
                q₁ = [${q1.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r12', 'r₁₂ = q₁ᵀa₂ =')}
                ${inputScalarHTML('qr-r13', 'r₁₃ = q₁ᵀa₃ =')}`,
            validate: () => {
                const r12 = readScalar('qr-r12'), r13 = readScalar('qr-r13');
                let ok = approxEq(r12, R[0][1], tol) && approxEq(r13, R[0][2], tol);
                if (ok) return { correct: true };
                return { correct: false, message: `r₁₂ = ${fmtNum(R[0][1])}, r₁₃ = ${fmtNum(R[0][2])}` };
            }
        },
        {
            content: `<div class="step-instruction">Orthogonalize a₂: a₂' = a₂ − r₁₂·q₁<br>
                Then r₂₂ = ‖a₂'‖ and q₂ = a₂'/r₂₂${hint}</div>
                ${inputVectorHTML('qr-a2p', 3, "a₂' =")}
                ${inputScalarHTML('qr-r22', 'r₂₂ =')}
                ${inputVectorHTML('qr-q2', 3, 'q₂ =')}`,
            validate: () => {
                const ap = readVector('qr-a2p', 3), r22 = readScalar('qr-r22'), q = readVector('qr-q2', 3);
                let ok = ap.every((x, i) => approxEq(x, a2p[i], tol))
                    && approxEq(r22, R[1][1], tol)
                    && q.every((x, i) => approxEq(x, q2[i], tol));
                if (ok) return { correct: true };
                return { correct: false, message: `a₂' = [${a2p.map(fmtNum).join(', ')}]<br>r₂₂ = ${fmtNum(R[1][1])}<br>q₂ = [${q2.map(fmtNum).join(', ')}]` };
            }
        },
        {
            content: `<div class="step-instruction">Compute r₂₃ = q₂ᵀa₃<br>
                q₂ = [${q2.map(fmtNum).join(', ')}], a₃ = [${a3.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r23', 'r₂₃ =')}`,
            validate: () => {
                const v = readScalar('qr-r23');
                if (approxEq(v, R[1][2], tol)) return { correct: true };
                return { correct: false, message: `r₂₃ = ${fmtNum(R[1][2])}` };
            }
        },
        {
            content: `<div class="step-instruction">Orthogonalize a₃: a₃' = a₃ − r₁₃·q₁ − r₂₃·q₂<br>
                r₁₃ = ${fmtNum(R[0][2])}, r₂₃ = ${fmtNum(R[1][2])}<br>
                Then r₃₃ = ‖a₃'‖ and q₃ = a₃'/r₃₃${hint}</div>
                ${inputVectorHTML('qr-a3p', 3, "a₃' =")}
                ${inputScalarHTML('qr-r33', 'r₃₃ =')}
                ${inputVectorHTML('qr-q3', 3, 'q₃ =')}`,
            validate: () => {
                const ap = readVector('qr-a3p', 3), r33 = readScalar('qr-r33'), q = readVector('qr-q3', 3);
                let ok = ap.every((x, i) => approxEq(x, a3p[i], tol))
                    && approxEq(r33, R[2][2], tol)
                    && q.every((x, i) => approxEq(x, q3[i], tol));
                if (ok) return { correct: true };
                return { correct: false, message: `a₃' = [${a3p.map(fmtNum).join(', ')}]<br>r₃₃ = ${fmtNum(R[2][2])}<br>q₃ = [${q3.map(fmtNum).join(', ')}]` };
            }
        }
    ];
}

// ============ SVD ============

function generateSVDMatrix() {
    const triples = [[3,4,5],[4,3,5],[5,12,13],[12,5,13]];
    const [a, b, c] = triples[Math.floor(Math.random() * triples.length)];
    const k1 = randInt(2, 4), k2 = randInt(1, k1 - 1);
    const signs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    const [s1, s2] = signs[Math.floor(Math.random() * signs.length)];
    return {
        A: [[s1 * a * k1, -s1 * b * k1], [s2 * b * k2, s2 * a * k2]],
        sigma: [c * k1, c * k2],
        Vtvals: [[a/c, b/c], [-b/c, a/c]],
        triple: [a, b, c], k1, k2, s1, s2
    };
}

function generateSVD(size) {
    if (size === 3) {
        document.getElementById('decomp-problem-area').innerHTML =
            '<div class="step-instruction">3×3 SVD is very complex by hand. Practice with 2×2 first!</div>' +
            '<button class="next-btn" onclick="document.getElementById(\'decomp-size-select\').value=\'2\';generateDecompProblem()">Switch to 2×2</button>';
        return;
    }

    const prob = generateSVDMatrix();
    const A = prob.A;
    const AtA = mMul(mTrans(A), A);
    const sigma = prob.sigma;
    const s1sq = sigma[0] * sigma[0], s2sq = sigma[1] * sigma[1];

    const trace = AtA[0][0] + AtA[1][1];
    const det = AtA[0][0] * AtA[1][1] - AtA[0][1] * AtA[1][0];
    const eigvals = [s1sq, s2sq].sort((a, b) => b - a);

    const eigvecs = eigvals.map(lam => {
        const r0 = AtA[0][0] - lam, r1 = AtA[0][1];
        let v;
        if (Math.abs(r0) > 0.001) v = [-r1, r0];
        else if (Math.abs(r1) > 0.001) v = [1, 0];
        else v = [1, 0];
        const norm = vNorm(v);
        return vScale(v, 1 / norm);
    });

    const sortedSigma = eigvals.map(l => Math.sqrt(l));

    const uCols = eigvecs.map((vi, idx) => {
        const Av = [A[0][0] * vi[0] + A[0][1] * vi[1], A[1][0] * vi[0] + A[1][1] * vi[1]];
        return vScale(Av, 1 / sortedSigma[idx]);
    });

    const Vmat = [[eigvecs[0][0], eigvecs[1][0]], [eigvecs[0][1], eigvecs[1][1]]];
    const Umat = [[uCols[0][0], uCols[1][0]], [uCols[0][1], uCols[1][1]]];
    const Smat = [[sortedSigma[0], 0], [0, sortedSigma[1]]];

    const tol = 0.1;
    const hint = ' (Round to 2 decimals, or use fractions like 3/5)';

    const steps = [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Step 1: Compute AᵀA</div>
                ${inputMatrixHTML('svd-ata', 2, 2, [[null,null],[null,null]], 'AᵀA =')}`,
            validate: () => {
                const M = readMatrixPF('svd-ata', 2, 2, [[null,null],[null,null]]);
                let ok = true;
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (!approxEq(M[i][j], AtA[i][j], 0.5)) ok = false;
                if (ok) return { correct: true };
                return { correct: false, message: `AᵀA = ${matStr(AtA)}` };
            }
        },
        {
            content: `${renderMat(AtA, 'AᵀA =')}
                <div class="step-instruction">Step 2: Find the eigenvalues of AᵀA<br>
                det(AᵀA − λI) = 0<br>
                λ² − ${fmtNum(trace)}λ + ${fmtNum(det)} = 0</div>
                ${inputScalarHTML('svd-l1', 'λ₁ (larger) =')}
                ${inputScalarHTML('svd-l2', 'λ₂ (smaller) =')}`,
            validate: () => {
                const l1 = readScalar('svd-l1'), l2 = readScalar('svd-l2');
                if (approxEq(l1, eigvals[0], 0.5) && approxEq(l2, eigvals[1], 0.5))
                    return { correct: true, message: `λ₁ = ${fmtNum(eigvals[0])}, λ₂ = ${fmtNum(eigvals[1])}` };
                return { correct: false, message: `λ₁ = ${fmtNum(eigvals[0])}, λ₂ = ${fmtNum(eigvals[1])}` };
            }
        },
        {
            content: `<div class="step-instruction">Step 3: Singular values σᵢ = √λᵢ</div>
                ${inputScalarHTML('svd-s1', 'σ₁ = √' + fmtNum(eigvals[0]) + ' =')}
                ${inputScalarHTML('svd-s2', 'σ₂ = √' + fmtNum(eigvals[1]) + ' =')}`,
            validate: () => {
                const s1 = readScalar('svd-s1'), s2 = readScalar('svd-s2');
                if (approxEq(s1, sortedSigma[0], tol) && approxEq(s2, sortedSigma[1], tol))
                    return { correct: true };
                return { correct: false, message: `σ₁ = ${fmtNum(sortedSigma[0])}, σ₂ = ${fmtNum(sortedSigma[1])}` };
            }
        },
        {
            content: `${renderMat(AtA, 'AᵀA =')}
                <div class="step-instruction">Step 4: Find eigenvectors of AᵀA (columns of V)${hint}<br>
                Any normalized eigenvector is accepted.</div>
                ${inputVectorHTML('svd-v1', 2, 'v₁ (for λ₁ = ' + fmtNum(eigvals[0]) + '):')}
                ${inputVectorHTML('svd-v2', 2, 'v₂ (for λ₂ = ' + fmtNum(eigvals[1]) + '):')}`,
            validate: () => {
                const v1 = readVector('svd-v1', 2), v2 = readVector('svd-v2', 2);
                let errs = [];
                if (!isApproxScalarMult(v1, eigvecs[0], 0.15))
                    errs.push(`v₁ should be ±[${eigvecs[0].map(fmtNum).join(', ')}]`);
                if (!isApproxScalarMult(v2, eigvecs[1], 0.15))
                    errs.push(`v₂ should be ±[${eigvecs[1].map(fmtNum).join(', ')}]`);
                if (errs.length === 0) return { correct: true };
                return { correct: false, message: errs.join('<br>') };
            }
        },
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Step 5: Compute U columns: uᵢ = (1/σᵢ)·A·vᵢ${hint}<br>
                σ₁ = ${fmtNum(sortedSigma[0])}, v₁ = [${eigvecs[0].map(fmtNum).join(', ')}]<br>
                σ₂ = ${fmtNum(sortedSigma[1])}, v₂ = [${eigvecs[1].map(fmtNum).join(', ')}]</div>
                ${inputVectorHTML('svd-u1', 2, 'u₁ =')}
                ${inputVectorHTML('svd-u2', 2, 'u₂ =')}`,
            validate: () => {
                const u1 = readVector('svd-u1', 2), u2 = readVector('svd-u2', 2);
                let errs = [];
                if (!isApproxScalarMult(u1, uCols[0], 0.15))
                    errs.push(`u₁ = [${uCols[0].map(fmtNum).join(', ')}]`);
                if (!isApproxScalarMult(u2, uCols[1], 0.15))
                    errs.push(`u₂ = [${uCols[1].map(fmtNum).join(', ')}]`);
                if (errs.length === 0) return { correct: true };
                return { correct: false, message: errs.join('<br>') };
            }
        }
    ];

    const summary = () => `<div class="summary-matrices">
        ${renderMat(A, 'A =')}${renderMat(Umat, 'U =')}
        ${renderMat(Smat, 'Σ =')}${renderMat(Vmat, 'V =')}
        <div class="verify-msg">A = UΣVᵀ ✓</div></div>`;

    startWizard('svd', steps, summary);
}

function matStr(M) {
    return '[' + M.map(r => '[' + r.map(fmtNum).join(', ') + ']').join(', ') + ']';
}

// ============ Start Functions ============

function startDecomp(type, title) {
    currentDecompType = type;
    decompScores[type] = { c: 0, t: 0 };
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('decomposition').style.display = 'block';
    document.getElementById('decomp-title').textContent = title;
    document.getElementById('decomp-score').textContent = 'Steps: 0/0';

    const sizeSelect = document.getElementById('decomp-size-select');
    if (type === 'svd') {
        sizeSelect.innerHTML = '<option value="2">2×2</option><option value="3">3×3</option>';
        sizeSelect.value = '2';
    } else {
        sizeSelect.innerHTML = '<option value="2">2×2</option><option value="3">3×3</option>';
    }
    generateDecompProblem();
}

function startLU() { startDecomp('lu', 'LU Decomposition'); }
function startQR() { startDecomp('qr', 'QR Decomposition'); }
function startSVD() { startDecomp('svd', 'SVD'); }
