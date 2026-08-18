let wizardState = null;
let decompScores = { lu: { c: 0, t: 0 }, qr: { c: 0, t: 0 }, svd: { c: 0, t: 0 }, matpow: { c: 0, t: 0 }, inverse: { c: 0, t: 0 }, transpose: { c: 0, t: 0 }, matmul: { c: 0, t: 0 } };
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
function matrixApproxEq(A, B, tol) {
    for (let i = 0; i < A.length; i++)
        for (let j = 0; j < A[0].length; j++)
            if (!approxEq(A[i][j], B[i][j], tol)) return false;
    return true;
}

function isOrthogonalMatrix(M, tol) {
    const MtM = mMul(mTrans(M), M);
    for (let i = 0; i < MtM.length; i++)
        for (let j = 0; j < MtM.length; j++) {
            const expected = i === j ? 1 : 0;
            if (!approxEq(MtM[i][j], expected, tol)) return false;
        }
    return true;
}
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

function renderMatProgress(M, rows, cols, state, label) {
    let cells = '';
    for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
            const s = state[i][j];
            const cls = s === 'current' ? 'cell-current' : s === 'pending' ? 'cell-pending' : '';
            const content = s === 'known' ? fmtNum(M[i][j]) : '?';
            cells += `<span class="${cls}">${content}</span>`;
        }
    return `${label ? `<div class="mat-label">${label}</div>` : ''}
        <div class="matrix-display"><div class="matrix-wrapper">
        <span class="matrix-bracket">[</span>
        <div class="matrix-grid" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>
        <span class="matrix-bracket">]</span></div></div>`;
}

function renderMatCellsHighlighted(M, rows, cols, highlightFn, label) {
    let cells = '';
    for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
            const cls = highlightFn(i, j) ? 'cell-current' : '';
            cells += `<span class="${cls}">${fmtNum(M[i][j])}</span>`;
        }
    return `${label ? `<div class="mat-label">${label}</div>` : ''}
        <div class="matrix-display"><div class="matrix-wrapper">
        <span class="matrix-bracket">[</span>
        <div class="matrix-grid" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>
        <span class="matrix-bracket">]</span></div></div>`;
}

function renderMatMulProgress(A, B, C, n, curI, curJ, knownMask) {
    const cState = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => {
        if (r === curI && c === curJ) return 'current';
        return knownMask[r][c] ? 'known' : 'pending';
    }));
    return `<div class="summary-matrices">
        ${renderMatCellsHighlighted(A, n, n, (r, c) => r === curI, 'A =')}
        ${renderMatCellsHighlighted(B, n, n, (r, c) => c === curJ, 'B =')}
        ${renderMatProgress(C, n, n, cState, 'C = A×B =')}
        </div>`;
}

function renderQRProgress(A, Q, R, n, opts) {
    const qState = Array.from({ length: n }, () => Array(n).fill('pending'));
    (opts.qKnownCols || []).forEach(c => { for (let i = 0; i < n; i++) qState[i][c] = 'known'; });
    (opts.qCurrentCols || []).forEach(c => { for (let i = 0; i < n; i++) qState[i][c] = 'current'; });

    const rState = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i > j ? 'known' : 'pending'));
    (opts.rKnownCells || []).forEach(([i, j]) => rState[i][j] = 'known');
    (opts.rCurrentCells || []).forEach(([i, j]) => rState[i][j] = 'current');

    return `<div class="summary-matrices">
        ${renderMat(A, 'A =')}
        ${renderMatProgress(Q, n, n, qState, 'Q =')}${renderMatProgress(R, n, n, rState, 'R =')}
        </div>`;
}

function renderSVDProgress(topMat, topLabel, Umat, Smat, Vmat, n, opts) {
    const sState = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 'pending' : 'known'));
    (opts.sKnown || []).forEach(i => sState[i][i] = 'known');
    (opts.sCurrent || []).forEach(i => sState[i][i] = 'current');

    const vState = Array.from({ length: n }, () => Array(n).fill('pending'));
    (opts.vKnownCols || []).forEach(c => { for (let i = 0; i < n; i++) vState[i][c] = 'known'; });
    (opts.vCurrentCols || []).forEach(c => { for (let i = 0; i < n; i++) vState[i][c] = 'current'; });

    const uState = Array.from({ length: n }, () => Array(n).fill('pending'));
    (opts.uKnownCols || []).forEach(c => { for (let i = 0; i < n; i++) uState[i][c] = 'known'; });
    (opts.uCurrentCols || []).forEach(c => { for (let i = 0; i < n; i++) uState[i][c] = 'current'; });

    return `<div class="summary-matrices">
        ${renderMat(topMat, topLabel)}
        ${renderMatProgress(Umat, n, n, uState, 'U =')}${renderMatProgress(Smat, n, n, sState, 'Σ =')}${renderMatProgress(Vmat, n, n, vState, 'V =')}
        </div>`;
}

function inputScalarHTML(id, label) {
    return `<div class="step-field"><label>${label}</label>
        <input type="text" id="${id}" autocomplete="off" class="scalar-input" onkeydown="handleStepInputEnter(event)" oninput="this.classList.remove('input-error')"></div>`;
}

function inputVectorHTML(id, n, label) {
    let inputs = '';
    for (let i = 0; i < n; i++)
        inputs += `<input type="text" id="${id}-${i}" autocomplete="off" class="vec-input" onkeydown="handleStepInputEnter(event)" oninput="this.classList.remove('input-error')">`;
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
                inputs += `<input type="text" id="${id}-${i}-${j}" autocomplete="off" class="mat-input" onkeydown="handleStepInputEnter(event)" oninput="this.classList.remove('input-error')">`;
        }
    return `<div class="step-field"><label>${label}</label>
        <div class="matrix-input-wrapper"><span class="matrix-bracket">[</span>
        <div class="matrix-input-grid" style="grid-template-columns:repeat(${cols},1fr)">${inputs}</div>
        <span class="matrix-bracket">]</span></div></div>`;
}

function handleStepInputEnter(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    const area = document.getElementById('decomp-problem-area');
    const inputs = Array.from(area.querySelectorAll('input:not([disabled])'));
    const idx = inputs.indexOf(e.target);
    if (idx >= 0 && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
    } else {
        area.querySelector('.check-btn')?.click();
    }
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
    const area = document.getElementById('decomp-problem-area');

    area.querySelectorAll('input.input-error').forEach(el => el.classList.remove('input-error'));

    const elapsed = (Date.now() - wizardState.stepStart) / 1000;
    const topicNames = { lu: 'LU Decomposition', qr: 'QR Decomposition', svd: 'SVD', matpow: 'Matrix Power', inverse: 'Matrix Inverse', transpose: 'Matrix Transpose', matmul: 'Matrix Multiplication' };
    if (result.correct) {
        decompScores[wizardState.type].c++;
        fb.textContent = (result.message || 'Correct!') + ` (${elapsed.toFixed(1)}s)`;
        fb.className = 'feedback correct';
    } else {
        fb.innerHTML = result.message || 'Not quite — check the highlighted fields.';
        fb.className = 'feedback wrong';
        (result.wrongIds || []).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('input-error');
        });
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
    else if (currentDecompType === 'matpow') generateMatPow(size);
    else if (currentDecompType === 'inverse') generateInverse(size);
    else if (currentDecompType === 'transpose') generateTranspose(size);
    else if (currentDecompType === 'matmul') generateMatMul(size);
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
    const steps = buildLUFullMatrixStep(A, L, U);
    const summary = () => `<div class="summary-matrices">
        ${renderMat(A, 'A =')}${renderMat(L, 'L =')}${renderMat(U, 'U =')}
        <div class="verify-msg">A = LU ✓</div></div>`;
    startWizard('lu', steps, summary);
}

function buildLUFullMatrixStep(A, L, U) {
    const n = A.length;
    const Lpf = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
            if (i === j) return 1;
            if (j > i) return 0;
            return null;
        }));
    const Upf = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => j < i ? 0 : null));

    return [{
        content: `${renderMat(A, 'A =')}
            <div class="step-instruction">Enter the L and U matrices. The fixed entries are already filled in.</div>
            ${inputMatrixHTML('lu-L', n, n, Lpf, 'L =')}
            ${inputMatrixHTML('lu-U', n, n, Upf, 'U =')}`,
        validate: () => {
            const Lv = readMatrixPF('lu-L', n, n, Lpf);
            const Uv = readMatrixPF('lu-U', n, n, Upf);
            let wrongIds = [];
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++) {
                    if (Lpf[i][j] === null && !approxEq(Lv[i][j], L[i][j], 0.01))
                        wrongIds.push(`lu-L-${i}-${j}`);
                    if (Upf[i][j] === null && !approxEq(Uv[i][j], U[i][j], 0.01))
                        wrongIds.push(`lu-U-${i}-${j}`);
                }
            if (wrongIds.length === 0) return { correct: true, message: 'A = LU' };
            return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
        }
    }];
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

function buildQRFullMatrixStep(A, Q, R) {
    const n = A.length;
    const Rpf = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => j < i ? 0 : null));
    const tol = n === 2 ? 0.05 : 0.08;
    const hint = n === 2 ? 'Use decimals or fractions.' : 'Round decimals to about 2 places.';

    return [{
        content: `${renderMat(A, 'A =')}
            <div class="step-instruction">Enter the Q and R matrices. ${hint}</div>
            ${inputMatrixHTML('qr-Q', n, n, null, 'Q =')}
            ${inputMatrixHTML('qr-R', n, n, Rpf, 'R =')}`,
        validate: () => {
            const Qv = readMatrixPF('qr-Q', n, n, null);
            const Rv = readMatrixPF('qr-R', n, n, Rpf);
            let errs = [];
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++) {
                    if (!approxEq(Qv[i][j], Q[i][j], tol))
                        errs.push(`Q${i + 1}${j + 1} = ${fmtNum(Q[i][j])}`);
                    if (Rpf[i][j] === null && !approxEq(Rv[i][j], R[i][j], tol))
                        errs.push(`R${i + 1}${j + 1} = ${fmtNum(R[i][j])}`);
                }
            if (errs.length === 0) return { correct: true, message: 'A = QR' };
            return { correct: false, message: errs.join('<br>') };
        }
    }];
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
            content: `${renderQRProgress(A, Q, R, 2, { rCurrentCells: [[0,0]] })}
                <div class="step-instruction">QR splits A into an orthonormal basis Q and the coefficients R needed to rebuild A from it. We build Q one column at a time with Gram-Schmidt.<br><br>
                <b>Why:</b> before we can turn a₁ into a unit vector, we need its length.<br>
                r₁₁ = ‖a₁‖ = ‖[${a1.map(fmtNum).join(', ')}]‖</div>
                ${inputScalarHTML('qr-r11', 'r₁₁ =')}`,
            validate: () => {
                const v = readScalar('qr-r11');
                if (approxEq(v, r11, tol)) return { correct: true, message: `r₁₁ = ${fmtNum(r11)}` };
                return { correct: false, message: `Not quite — recheck the highlighted field.`, wrongIds: ['qr-r11'] };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 2, { rKnownCells: [[0,0]], qCurrentCols: [0] })}
                <div class="step-instruction"><b>Why:</b> dividing a₁ by its own length rescales it to length 1 — that's q₁, the first orthonormal direction.<br>
                q₁ = a₁ / r₁₁ = a₁ / ${fmtNum(r11)}${hint}</div>
                ${inputVectorHTML('qr-q1', 2, 'q₁ =')}`,
            validate: () => {
                const v = readVector('qr-q1', 2);
                const wrongIds = v.map((x, i) => approxEq(x, q1[i], tol) ? null : `qr-q1-${i}`).filter(Boolean);
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: `Not quite — recheck the highlighted field.`, wrongIds };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 2, { rKnownCells: [[0,0]], qKnownCols: [0], rCurrentCells: [[0,1]] })}
                <div class="step-instruction"><b>Why:</b> before we can make a₂ orthogonal to q₁, we need to know how much of a₂ already points along q₁ — that's the projection r₁₂.<br>
                r₁₂ = q₁ᵀ · a₂, with q₁ = [${q1.map(fmtNum).join(', ')}], a₂ = [${a2.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r12', 'r₁₂ =')}`,
            validate: () => {
                const v = readScalar('qr-r12');
                if (approxEq(v, r12, tol)) return { correct: true, message: `r₁₂ = ${fmtNum(r12)}` };
                return { correct: false, message: `Not quite — recheck the highlighted field.`, wrongIds: ['qr-r12'] };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 2, { rKnownCells: [[0,0],[0,1]], qKnownCols: [0] })}
                <div class="step-instruction"><b>Why:</b> subtracting off that projection removes the part of a₂ parallel to q₁, leaving a vector perpendicular to it — the raw material for q₂.<br>
                a₂' = a₂ − r₁₂·q₁ = [${a2.map(fmtNum).join(', ')}] − ${fmtNum(r12)}·[${q1.map(fmtNum).join(', ')}]</div>
                ${inputVectorHTML('qr-a2p', 2, "a₂' =")}`,
            validate: () => {
                const v = readVector('qr-a2p', 2);
                const wrongIds = v.map((x, i) => approxEq(x, a2p[i], tol) ? null : `qr-a2p-${i}`).filter(Boolean);
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: `Not quite — recheck the highlighted field.`, wrongIds };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 2, { rKnownCells: [[0,0],[0,1]], qKnownCols: [0], rCurrentCells: [[1,1]] })}
                <div class="step-instruction"><b>Why:</b> just like with column 1, we need a₂''s length before we can normalize it.<br>
                r₂₂ = ‖a₂'‖ where a₂' = [${a2p.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r22', 'r₂₂ =')}`,
            validate: () => {
                const v = readScalar('qr-r22');
                if (approxEq(v, r22, tol)) return { correct: true, message: `r₂₂ = ${fmtNum(r22)}` };
                return { correct: false, message: `Not quite — recheck the highlighted field.`, wrongIds: ['qr-r22'] };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 2, { rKnownCells: [[0,0],[0,1],[1,1]], qKnownCols: [0], qCurrentCols: [1] })}
                <div class="step-instruction"><b>Why:</b> dividing a₂' by its length gives the second orthonormal direction, completing Q.<br>
                q₂ = a₂' / r₂₂ = [${a2p.map(fmtNum).join(', ')}] / ${fmtNum(r22)}${hint}</div>
                ${inputVectorHTML('qr-q2', 2, 'q₂ =')}`,
            validate: () => {
                const v = readVector('qr-q2', 2);
                const wrongIds = v.map((x, i) => approxEq(x, q2[i], tol) ? null : `qr-q2-${i}`).filter(Boolean);
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: `Not quite — recheck the highlighted field.`, wrongIds };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 2, { qKnownCols: [0, 1], rKnownCells: [[0,0],[0,1],[1,1]] })}
                <div class="step-instruction"><b>Why:</b> Q is just the orthonormal columns you built, and R collects the projection coefficients — together A = QR.${hint}</div>
                ${inputMatrixHTML('qr-Q', 2, 2, [[null,null],[null,null]], 'Q =')}
                ${inputMatrixHTML('qr-R', 2, 2, [[null,null],[0,null]], 'R =')}`,
            validate: () => {
                const Qv = readMatrixPF('qr-Q', 2, 2, [[null,null],[null,null]]);
                const Rv = readMatrixPF('qr-R', 2, 2, [[null,null],[0,null]]);
                let wrongIds = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++) {
                        if (!approxEq(Qv[i][j], Q[i][j], tol)) wrongIds.push(`qr-Q-${i}-${j}`);
                        if (!(i > j) && !approxEq(Rv[i][j], R[i][j], tol)) wrongIds.push(`qr-R-${i}-${j}`);
                    }
                if (wrongIds.length === 0) return { correct: true, message: 'A = QR ✓' };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
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
            content: `${renderQRProgress(A, Q, R, 3, { rCurrentCells: [[0,0]], qCurrentCols: [0] })}
                <div class="step-instruction">QR splits A into an orthonormal basis Q and the coefficients R needed to rebuild A. We build Q one column at a time with Gram-Schmidt.<br><br>
                <b>Why:</b> normalizing a₁ by its own length gives the first orthonormal direction q₁.${hint}</div>
                ${inputScalarHTML('qr-r11', 'r₁₁ = ‖a₁‖ =')}
                ${inputVectorHTML('qr-q1', 3, 'q₁ = a₁/r₁₁ =')}`,
            validate: () => {
                const r = readScalar('qr-r11'), q = readVector('qr-q1', 3);
                let wrongIds = [];
                if (!approxEq(r, R[0][0], tol)) wrongIds.push('qr-r11');
                q.forEach((x, i) => { if (!approxEq(x, q1[i], tol)) wrongIds.push(`qr-q1-${i}`); });
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted fields.', wrongIds };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 3, { rKnownCells: [[0,0]], qKnownCols: [0], rCurrentCells: [[0,1],[0,2]] })}
                <div class="step-instruction"><b>Why:</b> before we can orthogonalize a₂ and a₃ against q₁, we need to know how much of each already points along q₁.<br>
                q₁ = [${q1.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r12', 'r₁₂ = q₁ᵀa₂ =')}
                ${inputScalarHTML('qr-r13', 'r₁₃ = q₁ᵀa₃ =')}`,
            validate: () => {
                const r12 = readScalar('qr-r12'), r13 = readScalar('qr-r13');
                let wrongIds = [];
                if (!approxEq(r12, R[0][1], tol)) wrongIds.push('qr-r12');
                if (!approxEq(r13, R[0][2], tol)) wrongIds.push('qr-r13');
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted fields.', wrongIds };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 3, { rKnownCells: [[0,0],[0,1],[0,2]], qKnownCols: [0], rCurrentCells: [[1,1]], qCurrentCols: [1] })}
                <div class="step-instruction"><b>Why:</b> subtracting the projection removes the part of a₂ parallel to q₁, leaving a vector perpendicular to it; normalizing that gives q₂.<br>
                a₂' = a₂ − r₁₂·q₁, then r₂₂ = ‖a₂'‖ and q₂ = a₂'/r₂₂${hint}</div>
                ${inputVectorHTML('qr-a2p', 3, "a₂' =")}
                ${inputScalarHTML('qr-r22', 'r₂₂ =')}
                ${inputVectorHTML('qr-q2', 3, 'q₂ =')}`,
            validate: () => {
                const ap = readVector('qr-a2p', 3), r22 = readScalar('qr-r22'), q = readVector('qr-q2', 3);
                let wrongIds = [];
                ap.forEach((x, i) => { if (!approxEq(x, a2p[i], tol)) wrongIds.push(`qr-a2p-${i}`); });
                if (!approxEq(r22, R[1][1], tol)) wrongIds.push('qr-r22');
                q.forEach((x, i) => { if (!approxEq(x, q2[i], tol)) wrongIds.push(`qr-q2-${i}`); });
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted fields.', wrongIds };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 3, { rKnownCells: [[0,0],[0,1],[0,2],[1,1]], qKnownCols: [0,1], rCurrentCells: [[1,2]] })}
                <div class="step-instruction"><b>Why:</b> before we can orthogonalize a₃ against q₂ (it's already being orthogonalized against q₁ next step), we need its projection onto q₂.<br>
                q₂ = [${q2.map(fmtNum).join(', ')}], a₃ = [${a3.map(fmtNum).join(', ')}]</div>
                ${inputScalarHTML('qr-r23', 'r₂₃ = q₂ᵀa₃ =')}`,
            validate: () => {
                const v = readScalar('qr-r23');
                if (approxEq(v, R[1][2], tol)) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted field.', wrongIds: ['qr-r23'] };
            }
        },
        {
            content: `${renderQRProgress(A, Q, R, 3, { rKnownCells: [[0,0],[0,1],[0,2],[1,1],[1,2]], qKnownCols: [0,1], rCurrentCells: [[2,2]], qCurrentCols: [2] })}
                <div class="step-instruction"><b>Why:</b> subtracting both projections removes everything a₃ shares with q₁ and q₂, leaving the direction that completes the orthonormal basis: q₃.<br>
                a₃' = a₃ − r₁₃·q₁ − r₂₃·q₂ (r₁₃ = ${fmtNum(R[0][2])}, r₂₃ = ${fmtNum(R[1][2])})<br>
                Then r₃₃ = ‖a₃'‖ and q₃ = a₃'/r₃₃${hint}</div>
                ${inputVectorHTML('qr-a3p', 3, "a₃' =")}
                ${inputScalarHTML('qr-r33', 'r₃₃ =')}
                ${inputVectorHTML('qr-q3', 3, 'q₃ =')}`,
            validate: () => {
                const ap = readVector('qr-a3p', 3), r33 = readScalar('qr-r33'), q = readVector('qr-q3', 3);
                let wrongIds = [];
                ap.forEach((x, i) => { if (!approxEq(x, a3p[i], tol)) wrongIds.push(`qr-a3p-${i}`); });
                if (!approxEq(r33, R[2][2], tol)) wrongIds.push('qr-r33');
                q.forEach((x, i) => { if (!approxEq(x, q3[i], tol)) wrongIds.push(`qr-q3-${i}`); });
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted fields.', wrongIds };
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
            content: `${renderSVDProgress(A, 'A =', Umat, Smat, Vmat, 2, {})}
                <div class="step-instruction">SVD writes A = UΣVᵀ, where V holds directions A stretches purely (no rotation), Σ holds the stretch amounts, and U holds where those directions land after A is applied.<br><br>
                <b>Why:</b> we start from AᵀA because its eigenvectors turn out to be exactly those pure-stretch directions (V), and its eigenvalues are the squared stretch amounts.<br>
                Step 1: Compute AᵀA</div>
                ${inputMatrixHTML('svd-ata', 2, 2, [[null,null],[null,null]], 'AᵀA =')}`,
            validate: () => {
                const M = readMatrixPF('svd-ata', 2, 2, [[null,null],[null,null]]);
                let wrongIds = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (!approxEq(M[i][j], AtA[i][j], 0.5)) wrongIds.push(`svd-ata-${i}-${j}`);
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        },
        {
            content: `${renderSVDProgress(AtA, 'AᵀA =', Umat, Smat, Vmat, 2, {})}
                <div class="step-instruction"><b>Why:</b> these eigenvalues measure how much A stretches (squared) along each of the pure-stretch directions we're about to find.<br>
                Step 2: Find the eigenvalues of AᵀA<br>
                det(AᵀA − λI) = 0<br>
                λ² − ${fmtNum(trace)}λ + ${fmtNum(det)} = 0</div>
                ${inputScalarHTML('svd-l1', 'λ₁ (larger) =')}
                ${inputScalarHTML('svd-l2', 'λ₂ (smaller) =')}`,
            validate: () => {
                const l1 = readScalar('svd-l1'), l2 = readScalar('svd-l2');
                let wrongIds = [];
                if (!approxEq(l1, eigvals[0], 0.5)) wrongIds.push('svd-l1');
                if (!approxEq(l2, eigvals[1], 0.5)) wrongIds.push('svd-l2');
                if (wrongIds.length === 0) return { correct: true, message: `λ₁ = ${fmtNum(eigvals[0])}, λ₂ = ${fmtNum(eigvals[1])}` };
                return { correct: false, message: 'Not quite — recheck the highlighted fields.', wrongIds };
            }
        },
        {
            content: `${renderSVDProgress(AtA, 'AᵀA =', Umat, Smat, Vmat, 2, { sCurrent: [0, 1] })}
                <div class="step-instruction"><b>Why:</b> the eigenvalues are squared stretch amounts, so taking the square root gives the actual singular values — the entries of Σ.<br>
                Step 3: Singular values σᵢ = √λᵢ</div>
                ${inputScalarHTML('svd-s1', 'σ₁ = √' + fmtNum(eigvals[0]) + ' =')}
                ${inputScalarHTML('svd-s2', 'σ₂ = √' + fmtNum(eigvals[1]) + ' =')}`,
            validate: () => {
                const s1 = readScalar('svd-s1'), s2 = readScalar('svd-s2');
                let wrongIds = [];
                if (!approxEq(s1, sortedSigma[0], tol)) wrongIds.push('svd-s1');
                if (!approxEq(s2, sortedSigma[1], tol)) wrongIds.push('svd-s2');
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted fields.', wrongIds };
            }
        },
        {
            content: `${renderSVDProgress(AtA, 'AᵀA =', Umat, Smat, Vmat, 2, { sKnown: [0, 1], vCurrentCols: [0, 1] })}
                <div class="step-instruction"><b>Why:</b> the eigenvectors of AᵀA are the pure-stretch directions themselves — these become the columns of V.${hint}<br>
                Step 4: Find eigenvectors of AᵀA (columns of V)<br>
                Any normalized eigenvector is accepted.</div>
                ${inputVectorHTML('svd-v1', 2, 'v₁ (for λ₁ = ' + fmtNum(eigvals[0]) + '):')}
                ${inputVectorHTML('svd-v2', 2, 'v₂ (for λ₂ = ' + fmtNum(eigvals[1]) + '):')}`,
            validate: () => {
                const v1 = readVector('svd-v1', 2), v2 = readVector('svd-v2', 2);
                let wrongIds = [];
                if (!isApproxScalarMult(v1, eigvecs[0], 0.15)) wrongIds.push('svd-v1-0', 'svd-v1-1');
                if (!isApproxScalarMult(v2, eigvecs[1], 0.15)) wrongIds.push('svd-v2-0', 'svd-v2-1');
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted vector(s).', wrongIds };
            }
        },
        {
            content: `${renderSVDProgress(A, 'A =', Umat, Smat, Vmat, 2, { sKnown: [0, 1], vKnownCols: [0, 1], uCurrentCols: [0, 1] })}
                <div class="step-instruction"><b>Why:</b> mapping each pure-stretch direction vᵢ through A and rescaling by 1/σᵢ gives the corresponding output direction — the columns of U.${hint}<br>
                Step 5: Compute U columns: uᵢ = (1/σᵢ)·A·vᵢ<br>
                σ₁ = ${fmtNum(sortedSigma[0])}, v₁ = [${eigvecs[0].map(fmtNum).join(', ')}]<br>
                σ₂ = ${fmtNum(sortedSigma[1])}, v₂ = [${eigvecs[1].map(fmtNum).join(', ')}]</div>
                ${inputVectorHTML('svd-u1', 2, 'u₁ =')}
                ${inputVectorHTML('svd-u2', 2, 'u₂ =')}`,
            validate: () => {
                const u1 = readVector('svd-u1', 2), u2 = readVector('svd-u2', 2);
                let wrongIds = [];
                if (!isApproxScalarMult(u1, uCols[0], 0.15)) wrongIds.push('svd-u1-0', 'svd-u1-1');
                if (!isApproxScalarMult(u2, uCols[1], 0.15)) wrongIds.push('svd-u2-0', 'svd-u2-1');
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Not quite — recheck the highlighted vector(s).', wrongIds };
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

function buildSVDFullMatrixStep(A, U, S, V, sigma) {
    const Spf = [[null, 0], [0, null]];
    const tol = 0.15;

    return [{
        content: `${renderMat(A, 'A =')}
            <div class="step-instruction">Enter U, Sigma, and V. Round decimals to about 2 places, or use fractions like 3/5.</div>
            ${inputMatrixHTML('svd-U', 2, 2, null, 'U =')}
            ${inputMatrixHTML('svd-S', 2, 2, Spf, 'Sigma =')}
            ${inputMatrixHTML('svd-V', 2, 2, null, 'V =')}`,
        validate: () => {
            const Uv = readMatrixPF('svd-U', 2, 2, null);
            const Sv = readMatrixPF('svd-S', 2, 2, Spf);
            const Vv = readMatrixPF('svd-V', 2, 2, null);
            const reconstructed = mMul(mMul(Uv, Sv), mTrans(Vv));
            const errs = [];

            if (!isOrthogonalMatrix(Uv, tol)) errs.push('U should be orthogonal.');
            if (!isOrthogonalMatrix(Vv, tol)) errs.push('V should be orthogonal.');
            if (!approxEq(Sv[0][0], sigma[0], tol) || !approxEq(Sv[1][1], sigma[1], tol))
                errs.push(`Sigma should have diagonal entries ${fmtNum(sigma[0])}, ${fmtNum(sigma[1])}.`);
            if (!matrixApproxEq(reconstructed, A, 0.25))
                errs.push('Check that U * Sigma * V^T equals A.');

            if (errs.length === 0) return { correct: true, message: 'A = U Sigma V^T' };
            return { correct: false, message: `${errs.join('<br>')}<br>One valid answer:<br>U = ${matStr(U)}<br>Sigma = ${matStr(S)}<br>V = ${matStr(V)}` };
        }
    }];
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
    if (type === 'svd' || type === 'matpow') {
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
function startMatPow() { startDecomp('matpow', 'Matrix Power (Aⁿ)'); }
function startInverse() { startDecomp('inverse', 'Matrix Inverse'); }
function startTranspose() { startDecomp('transpose', 'Matrix Transpose'); }
function startMatMul() { startDecomp('matmul', 'Matrix Multiplication'); }

// ============ Matrix Power via PDP⁻¹ ============

function generateMatPow(n) {
    if (n === 3) {
        document.getElementById('decomp-problem-area').innerHTML =
            '<div class="step-instruction">3×3 matrix power via diagonalization is very complex by hand. Practice with 2×2 first!</div>' +
            '<button class="next-btn" onclick="document.getElementById(\'decomp-size-select\').value=\'2\';generateDecompProblem()">Switch to 2×2</button>';
        return;
    }

    let lam1, lam2;
    do {
        lam1 = randInt(-2, 3);
        lam2 = randInt(-2, 3);
    } while (lam1 === lam2);

    const maxAbs = Math.max(Math.abs(lam1), Math.abs(lam2));
    const maxPow = maxAbs >= 3 ? 3 : (maxAbs >= 2 ? 4 : 6);
    const power = randInt(2, Math.min(maxPow, 5));

    const pChoices = [
        [[1,1],[0,1]], [[1,0],[1,1]], [[2,1],[1,1]],
        [[1,1],[1,2]], [[3,1],[2,1]], [[1,2],[1,3]]
    ];
    const P = pChoices[Math.floor(Math.random() * pChoices.length)];
    const detP = P[0][0] * P[1][1] - P[0][1] * P[1][0];
    const Pinv = [
        [P[1][1] / detP, -P[0][1] / detP],
        [-P[1][0] / detP, P[0][0] / detP]
    ];

    const D = [[lam1, 0], [0, lam2]];
    const A = mMul(mMul(P, D), Pinv);
    const Dn = [[Math.pow(lam1, power), 0], [0, Math.pow(lam2, power)]];
    const An = mMul(mMul(P, Dn), Pinv);

    const v1 = [P[0][0], P[1][0]];
    const v2 = [P[0][1], P[1][1]];
    const trA = A[0][0] + A[1][1];
    const detA = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const tol = 0.1;
    const sup = `<sup>${power}</sup>`;

    const steps = [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Compute A${sup} using diagonalization: A = PDP⁻¹ → A${sup} = PD${sup}P⁻¹<br><br>
                Step 1: Find the eigenvalues of A.<br>
                det(A − λI) = λ² − ${fmtNum(trA)}λ + ${fmtNum(detA)} = 0</div>
                ${inputScalarHTML('mp-l1', 'λ₁ =')}
                ${inputScalarHTML('mp-l2', 'λ₂ =')}`,
            validate: () => {
                const l1 = readScalar('mp-l1'), l2 = readScalar('mp-l2');
                const ok = (approxEq(l1, lam1, 0.01) && approxEq(l2, lam2, 0.01)) ||
                           (approxEq(l1, lam2, 0.01) && approxEq(l2, lam1, 0.01));
                if (ok) return { correct: true, message: `λ₁ = ${lam1}, λ₂ = ${lam2}` };
                return { correct: false, message: `λ₁ = ${lam1}, λ₂ = ${lam2}`, wrongIds: ['mp-l1', 'mp-l2'] };
            }
        },
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Step 2: Find an eigenvector for each eigenvalue.<br>
                For λ = ${lam1}: solve (A − ${lam1}I)v = 0<br>
                For λ = ${lam2}: solve (A − ${lam2}I)v = 0</div>
                ${inputVectorHTML('mp-v1', 2, 'v₁ (for λ = ' + lam1 + '):')}
                ${inputVectorHTML('mp-v2', 2, 'v₂ (for λ = ' + lam2 + '):')}`,
            validate: () => {
                const uv1 = readVector('mp-v1', 2), uv2 = readVector('mp-v2', 2);
                let errs = [], wrongIds = [];
                if (!isApproxScalarMult(uv1, v1, 0.15)) {
                    errs.push(`v₁ should be a multiple of [${v1.join(', ')}]`);
                    wrongIds.push('mp-v1-0', 'mp-v1-1');
                }
                if (!isApproxScalarMult(uv2, v2, 0.15)) {
                    errs.push(`v₂ should be a multiple of [${v2.join(', ')}]`);
                    wrongIds.push('mp-v2-0', 'mp-v2-1');
                }
                if (errs.length === 0) return { correct: true };
                return { correct: false, message: errs.join('<br>'), wrongIds };
            }
        },
        {
            content: `<div class="step-instruction">Step 3: Using P = [v₁ | v₂]:</div>
                ${renderMat(P, 'P =')}
                <div class="step-instruction">Enter D (diagonal eigenvalue matrix) and D${sup}:</div>
                ${inputMatrixHTML('mp-D', 2, 2, [[null, 0], [0, null]], 'D =')}
                ${inputMatrixHTML('mp-Dn', 2, 2, [[null, 0], [0, null]], 'D' + sup + ' =')}`,
            validate: () => {
                const Dv = readMatrixPF('mp-D', 2, 2, [[null, 0], [0, null]]);
                const Dnv = readMatrixPF('mp-Dn', 2, 2, [[null, 0], [0, null]]);
                let wrongIds = [];
                if (!approxEq(Dv[0][0], lam1, 0.01)) wrongIds.push('mp-D-0-0');
                if (!approxEq(Dv[1][1], lam2, 0.01)) wrongIds.push('mp-D-1-1');
                if (!approxEq(Dnv[0][0], Dn[0][0], 0.5)) wrongIds.push('mp-Dn-0-0');
                if (!approxEq(Dnv[1][1], Dn[1][1], 0.5)) wrongIds.push('mp-Dn-1-1');
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        },
        {
            content: `<div class="step-instruction">Step 4: Compute P⁻¹<br><br>
                P = ${matStr(P)}, det(P) = ${fmtNum(detP)}<br>
                P⁻¹ = (1/${fmtNum(detP)}) · adj(P)</div>
                ${inputMatrixHTML('mp-Pinv', 2, 2, [[null, null], [null, null]], 'P⁻¹ =')}`,
            validate: () => {
                const Piv = readMatrixPF('mp-Pinv', 2, 2, [[null, null], [null, null]]);
                let wrongIds = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (!approxEq(Piv[i][j], Pinv[i][j], tol)) wrongIds.push(`mp-Pinv-${i}-${j}`);
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        },
        {
            content: `<div class="step-instruction">Step 5: Compute A${sup} = P · D${sup} · P⁻¹</div>
                ${renderMat(P, 'P =')}
                <div class="step-instruction">D${sup} = diag(${fmtNum(Dn[0][0])}, ${fmtNum(Dn[1][1])})</div>
                ${renderMat(Pinv, 'P⁻¹ =')}
                ${inputMatrixHTML('mp-An', 2, 2, [[null, null], [null, null]], 'A' + sup + ' =')}`,
            validate: () => {
                const Anv = readMatrixPF('mp-An', 2, 2, [[null, null], [null, null]]);
                let wrongIds = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (!approxEq(Anv[i][j], An[i][j], 0.5)) wrongIds.push(`mp-An-${i}-${j}`);
                if (wrongIds.length === 0) return { correct: true, message: `A${sup} = PD${sup}P⁻¹ ✓` };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        }
    ];

    const summary = () => `<div class="summary-matrices">
        ${renderMat(A, 'A =')}${renderMat(P, 'P =')}${renderMat(D, 'D =')}
        ${renderMat(Dn, 'D' + sup + ' =')}${renderMat(An, 'A' + sup + ' =')}
        <div class="verify-msg">A${sup} = PD${sup}P⁻¹ ✓</div></div>`;

    startWizard('matpow', steps, summary);
}

// ============ Matrix Transpose ============

function generateTranspose(n) {
    let A;
    do {
        A = Array.from({ length: n }, () => Array.from({ length: n }, () => randInt(-6, 6)));
    } while (matrixApproxEq(A, mTrans(A), 0.001));

    const At = mTrans(A);
    const steps = buildTransposeStep(A, At, n);
    const summary = () => `<div class="summary-matrices">
        ${renderMat(A, 'A =')}${renderMat(At, 'Aᵀ =')}
        <div class="verify-msg">Aᵀ ✓</div></div>`;
    startWizard('transpose', steps, summary);
}

function buildTransposeStep(A, At, n) {
    return [{
        content: `${renderMat(A, 'A =')}
            <div class="step-instruction">The transpose flips A across its main diagonal: (Aᵀ)ᵢⱼ = Aⱼᵢ — row i of A becomes column i of Aᵀ.<br><br>
            <b>Why:</b> every entry off the diagonal swaps places with its mirror image across the diagonal; entries on the diagonal stay put.</div>
            ${inputMatrixHTML('t-At', n, n, null, 'Aᵀ =')}`,
        validate: () => {
            const Atv = readMatrixPF('t-At', n, n, null);
            let wrongIds = [];
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++)
                    if (!approxEq(Atv[i][j], At[i][j], 0.01)) wrongIds.push(`t-At-${i}-${j}`);
            if (wrongIds.length === 0) return { correct: true, message: 'Aᵀ ✓' };
            return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
        }
    }];
}

// ============ Matrix Inverse ============

function generateInverse2x2() {
    let A, det;
    do {
        A = [[randInt(-5, 5), randInt(-5, 5)], [randInt(-5, 5), randInt(-5, 5)]];
        det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    } while (det === 0);
    return { A, det };
}

function cofactor3x3(A, i, j) {
    const rows = [0, 1, 2].filter(r => r !== i);
    const cols = [0, 1, 2].filter(c => c !== j);
    const minor = A[rows[0]][cols[0]] * A[rows[1]][cols[1]] - A[rows[0]][cols[1]] * A[rows[1]][cols[0]];
    return ((i + j) % 2 === 0 ? 1 : -1) * minor;
}

function generateInverse3x3() {
    let A, det;
    do {
        A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => randInt(-3, 3)));
        det = A[0][0] * cofactor3x3(A, 0, 0) + A[0][1] * cofactor3x3(A, 0, 1) + A[0][2] * cofactor3x3(A, 0, 2);
    } while (det === 0);
    return { A, det };
}

function generateInverse(n) {
    if (n === 2) {
        const { A, det } = generateInverse2x2();
        const adj = [[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]];
        const Ainv = adj.map(row => row.map(v => v / det));
        const steps = buildInverse2Steps(A, det, adj, Ainv);
        const summary = () => `<div class="summary-matrices">
            ${renderMat(A, 'A =')}${renderMat(Ainv, 'A⁻¹ =')}
            <div class="verify-msg">A·A⁻¹ = I ✓</div></div>`;
        startWizard('inverse', steps, summary);
    } else {
        const { A, det } = generateInverse3x3();
        const C = Array.from({ length: 3 }, (_, i) => Array.from({ length: 3 }, (_, j) => cofactor3x3(A, i, j)));
        const adj = mTrans(C);
        const Ainv = adj.map(row => row.map(v => v / det));
        const steps = buildInverse3Steps(A, det, C, Ainv);
        const summary = () => `<div class="summary-matrices">
            ${renderMat(A, 'A =')}${renderMat(Ainv, 'A⁻¹ =')}
            <div class="verify-msg">A·A⁻¹ = I ✓</div></div>`;
        startWizard('inverse', steps, summary);
    }
}

function buildInverse2Steps(A, det, adj, Ainv) {
    const tol = 0.05;
    const hint = ' (Enter as decimal or fraction, e.g. 0.5 or 1/2)';

    return [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">For a 2×2 matrix, A⁻¹ = (1/det(A))·adj(A) — this only works when det(A) ≠ 0.<br><br>
                <b>Why:</b> det(A) tells us A is invertible at all, and it's the number we'll divide the adjugate by.<br>
                det(A) = a₁₁a₂₂ − a₁₂a₂₁ = ${A[0][0]}·${A[1][1]} − ${A[0][1]}·${A[1][0]}</div>
                ${inputScalarHTML('inv-det', 'det(A) =')}`,
            validate: () => {
                const v = readScalar('inv-det');
                if (approxEq(v, det, 0.01)) return { correct: true, message: `det(A) = ${fmtNum(det)}` };
                return { correct: false, message: 'Not quite — recheck the highlighted field.', wrongIds: ['inv-det'] };
            }
        },
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction"><b>Why:</b> for 2×2 matrices the adjugate has a shortcut — swap the diagonal entries and negate the off-diagonal ones.<br>
                adj(A) = [[a₂₂, −a₁₂], [−a₂₁, a₁₁]]</div>
                ${inputMatrixHTML('inv-adj', 2, 2, null, 'adj(A) =')}`,
            validate: () => {
                const M = readMatrixPF('inv-adj', 2, 2, null);
                let wrongIds = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (!approxEq(M[i][j], adj[i][j], 0.01)) wrongIds.push(`inv-adj-${i}-${j}`);
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        },
        {
            content: `<div class="step-instruction"><b>Why:</b> dividing the adjugate by det(A) rescales it into the actual inverse, so that A·A⁻¹ = I.<br>
                A⁻¹ = (1/${fmtNum(det)})·adj(A)${hint}</div>
                ${inputMatrixHTML('inv-final', 2, 2, null, 'A⁻¹ =')}`,
            validate: () => {
                const M = readMatrixPF('inv-final', 2, 2, null);
                let wrongIds = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (!approxEq(M[i][j], Ainv[i][j], tol)) wrongIds.push(`inv-final-${i}-${j}`);
                if (wrongIds.length === 0) return { correct: true, message: 'A⁻¹ found ✓' };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        }
    ];
}

function buildInverse3Steps(A, det, C, Ainv) {
    const tol = 0.05;
    const hint = ' (Enter as decimal or fraction, e.g. 0.5 or 1/2)';

    return [
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction">Compute det(A) by cofactor expansion along row 1.<br><br>
                <b>Why:</b> det(A) confirms A is invertible and becomes the scaling factor for the inverse.<br>
                det(A) = a₁₁(a₂₂a₃₃−a₂₃a₃₂) − a₁₂(a₂₁a₃₃−a₂₃a₃₁) + a₁₃(a₂₁a₃₂−a₂₂a₃₁)<br>
                = ${A[0][0]}(${A[1][1]}·${A[2][2]}−${A[1][2]}·${A[2][1]}) − ${A[0][1]}(${A[1][0]}·${A[2][2]}−${A[1][2]}·${A[2][0]}) + ${A[0][2]}(${A[1][0]}·${A[2][1]}−${A[1][1]}·${A[2][0]})</div>
                ${inputScalarHTML('inv-det', 'det(A) =')}`,
            validate: () => {
                const v = readScalar('inv-det');
                if (approxEq(v, det, 0.01)) return { correct: true, message: `det(A) = ${fmtNum(det)}` };
                return { correct: false, message: 'Not quite — recheck the highlighted field.', wrongIds: ['inv-det'] };
            }
        },
        {
            content: `${renderMat(A, 'A =')}
                <div class="step-instruction"><b>Why:</b> each cofactor Cᵢⱼ = (−1)ⁱ⁺ʲ·Mᵢⱼ, where Mᵢⱼ is the determinant of A with row i and column j deleted. We need all 9 to build the adjugate.</div>
                ${inputMatrixHTML('inv-cof', 3, 3, null, 'Cofactor matrix C =')}`,
            validate: () => {
                const M = readMatrixPF('inv-cof', 3, 3, null);
                let wrongIds = [];
                for (let i = 0; i < 3; i++)
                    for (let j = 0; j < 3; j++)
                        if (!approxEq(M[i][j], C[i][j], 0.01)) wrongIds.push(`inv-cof-${i}-${j}`);
                if (wrongIds.length === 0) return { correct: true };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        },
        {
            content: `<div class="step-instruction"><b>Why:</b> the adjugate is the transpose of the cofactor matrix; dividing it by det(A) gives A⁻¹, so that A·A⁻¹ = I.<br>
                adj(A) = Cᵀ, then A⁻¹ = (1/${fmtNum(det)})·adj(A)${hint}</div>
                ${inputMatrixHTML('inv-final', 3, 3, null, 'A⁻¹ =')}`,
            validate: () => {
                const M = readMatrixPF('inv-final', 3, 3, null);
                let wrongIds = [];
                for (let i = 0; i < 3; i++)
                    for (let j = 0; j < 3; j++)
                        if (!approxEq(M[i][j], Ainv[i][j], tol)) wrongIds.push(`inv-final-${i}-${j}`);
                if (wrongIds.length === 0) return { correct: true, message: 'A⁻¹ found ✓' };
                return { correct: false, message: 'Some entries are incorrect — check the highlighted cells.', wrongIds };
            }
        }
    ];
}

// ============ Matrix Multiplication ============

const SUB_DIGITS = ['', '₁', '₂', '₃'];

function buildKnownMaskRowMajor(n, curI, curJ) {
    return Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => r < curI || (r === curI && c < curJ)));
}

function generateMatMul(n) {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => randInt(-4, 4)));
    const B = Array.from({ length: n }, () => Array.from({ length: n }, () => randInt(-4, 4)));
    const C = mMul(A, B);
    const steps = buildMatMulSteps(A, B, C, n);
    const summary = () => `<div class="summary-matrices">
        ${renderMat(A, 'A =')}${renderMat(B, 'B =')}${renderMat(C, 'C = A×B =')}
        <div class="verify-msg">C = A×B ✓</div></div>`;
    startWizard('matmul', steps, summary);
}

function buildMatMulSteps(A, B, C, n) {
    const steps = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const terms = Array.from({ length: n }, (_, k) => `${A[i][k]}·${B[k][j]}`).join(' + ');
            const knownMask = buildKnownMaskRowMajor(n, i, j);
            const id = `mm-c-${i}-${j}`;
            const label = `C${SUB_DIGITS[i + 1]}${SUB_DIGITS[j + 1]}`;
            steps.push({
                content: `${renderMatMulProgress(A, B, C, n, i, j, knownMask)}
                    <div class="step-instruction"><b>Why:</b> each entry of a product is a dot product — pair up row ${i + 1} of A (highlighted) with column ${j + 1} of B (highlighted), multiply corresponding entries, and add them up.<br>
                    ${label} = row ${i + 1} of A · column ${j + 1} of B = ${terms}</div>
                    ${inputScalarHTML(id, `${label} =`)}`,
                validate: () => {
                    const v = readScalar(id);
                    if (approxEq(v, C[i][j], 0.01)) return { correct: true, message: `${label} = ${fmtNum(C[i][j])}` };
                    return { correct: false, message: 'Not quite — recheck the highlighted field.', wrongIds: [id] };
                }
            });
        }
    }
    return steps;
}
