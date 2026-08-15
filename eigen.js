let eigenCorrect = 0;
let eigenTotal = 0;
let currentEigenData = null;
let eigenStartTime = null;

function renderMatrix(matrix) {
    const n = matrix.length;
    const cells = matrix.flat().map(v => `<span>${v}</span>`).join('');
    return `<div class="matrix-display">
        <div class="matrix-wrapper">
            <span class="matrix-bracket">[</span>
            <div class="matrix-grid" style="grid-template-columns: repeat(${n}, 1fr)">
                ${cells}
            </div>
            <span class="matrix-bracket">]</span>
        </div>
    </div>`;
}

function generate2x2() {
    const roll = Math.random();
    if (roll < 0.75) return generateDiagonalizable2x2();
    if (roll < 0.9) return generateSimple2x2();
    return generateIntegerEigen2x2();
}

function generateSimple2x2() {
    const l1 = randNonZeroInt(-4, 5);
    const l2 = randDifferentInt(-4, 5, l1);

    const a = l1;
    const d = l2;
    const b = randNonZeroInt(-3, 3);
    const c = 0;

    return {
        matrix: [[a, b], [c, d]],
        eigenvalues: [...new Set([l1, l2])].sort((a, b) => a - b),
        eigenvectors: computeEigenvectors2x2([[a, b], [c, d]], [...new Set([l1, l2])].sort((a, b) => a - b))
    };
}

function generateDiagonalizable2x2() {
    const l1 = randNonZeroInt(-4, 4);
    const l2 = randDifferentInt(-4, 4, l1);
    const pChoices = [
        [[1, 1], [1, 2]],
        [[1, 2], [1, 3]],
        [[2, 1], [1, 1]],
        [[1, -1], [2, -1]],
        [[1, 2], [-1, -1]],
        [[-1, 1], [-2, 1]]
    ];
    const p = pChoices[Math.floor(Math.random() * pChoices.length)];
    const matrix = multiply2x2(multiply2x2(p, [[l1, 0], [0, l2]]), inverse2x2(p));
    const eigenvalues = [...new Set([l1, l2])].sort((a, b) => a - b);

    return {
        matrix,
        eigenvalues,
        eigenvectors: computeEigenvectors2x2(matrix, eigenvalues)
    };
}

function generateIntegerEigen2x2() {
    const l1 = randNonZeroInt(-4, 4);
    const l2 = randDifferentInt(-4, 4, l1);

    const matrix = [[l1, 0], [0, l2]];
    const eigenvalues = [...new Set([l1, l2])].sort((a, b) => a - b);

    return {
        matrix,
        eigenvalues,
        eigenvectors: computeEigenvectors2x2(matrix, eigenvalues)
    };
}

function randNonZeroInt(min, max) {
    let value;
    do {
        value = randInt(min, max);
    } while (value === 0);
    return value;
}

function randDifferentInt(min, max, disallowed) {
    let value;
    do {
        value = randInt(min, max);
    } while (value === disallowed);
    return value;
}

function multiply2x2(a, b) {
    return [
        [
            a[0][0] * b[0][0] + a[0][1] * b[1][0],
            a[0][0] * b[0][1] + a[0][1] * b[1][1]
        ],
        [
            a[1][0] * b[0][0] + a[1][1] * b[1][0],
            a[1][0] * b[0][1] + a[1][1] * b[1][1]
        ]
    ];
}

function inverse2x2(m) {
    const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    return [
        [m[1][1] / det, -m[0][1] / det],
        [-m[1][0] / det, m[0][0] / det]
    ];
}

function computeEigenvectors2x2(m, eigenvalues) {
    const vecs = [];
    for (const lam of eigenvalues) {
        const r0c0 = m[0][0] - lam;
        const r0c1 = m[0][1];
        const r1c0 = m[1][0];
        const r1c1 = m[1][1] - lam;

        let vec;
        if (r0c0 === 0 && r0c1 === 0 && r1c0 === 0 && r1c1 === 0) {
            vec = [1, 0];
        } else if (r0c0 !== 0) {
            vec = [-r0c1, r0c0];
        } else if (r0c1 !== 0) {
            vec = [1, 0];
        } else if (r1c0 !== 0) {
            vec = [-r1c1, r1c0];
        } else {
            vec = [1, 0];
        }

        const g = gcd(Math.abs(vec[0]), Math.abs(vec[1]));
        if (g > 0) {
            vec = [vec[0] / g, vec[1] / g];
        }
        if (vec[0] < 0 || (vec[0] === 0 && vec[1] < 0)) {
            vec = [-vec[0], -vec[1]];
        }
        vecs.push(vec);
    }
    return vecs;
}

function generate3x3() {
    const l1 = randInt(-3, 3);
    const l2 = randInt(-3, 3);
    const l3 = randInt(-3, 3);

    const matrix = [[l1, 0, 0], [0, l2, 0], [0, 0, l3]];

    const p = randomSimpleInvertible3x3();
    const result = multiply3x3(multiply3x3(p, matrix), inverse3x3Simple(p));

    if (!result || !allInteger3x3(result)) {
        return {
            matrix: [[l1, 0, 0], [0, l2, 0], [0, 0, l3]],
            eigenvalues: [...new Set([l1, l2, l3])].sort((a, b) => a - b),
            eigenvectors: null
        };
    }

    const eigenvalues = [...new Set([l1, l2, l3])].sort((a, b) => a - b);
    return {
        matrix: result,
        eigenvalues,
        eigenvectors: null
    };
}

function randomSimpleInvertible3x3() {
    const m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const idx = randInt(0, 2);
    const idx2 = (idx + 1) % 3;
    const val = randInt(-1, 1);
    m[idx][idx2] = val;
    return m;
}

function multiply3x3(a, b) {
    const r = [[0,0,0],[0,0,0],[0,0,0]];
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            for (let k = 0; k < 3; k++)
                r[i][j] += a[i][k] * b[k][j];
    return r;
}

function inverse3x3Simple(m) {
    const det = m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
              - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
              + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    if (det === 0) return null;

    const adj = [[0,0,0],[0,0,0],[0,0,0]];
    adj[0][0] =  (m[1][1]*m[2][2] - m[1][2]*m[2][1]);
    adj[0][1] = -(m[0][1]*m[2][2] - m[0][2]*m[2][1]);
    adj[0][2] =  (m[0][1]*m[1][2] - m[0][2]*m[1][1]);
    adj[1][0] = -(m[1][0]*m[2][2] - m[1][2]*m[2][0]);
    adj[1][1] =  (m[0][0]*m[2][2] - m[0][2]*m[2][0]);
    adj[1][2] = -(m[0][0]*m[1][2] - m[0][2]*m[1][0]);
    adj[2][0] =  (m[1][0]*m[2][1] - m[1][1]*m[2][0]);
    adj[2][1] = -(m[0][0]*m[2][1] - m[0][1]*m[2][0]);
    adj[2][2] =  (m[0][0]*m[1][1] - m[0][1]*m[1][0]);

    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            adj[i][j] /= det;

    return adj;
}

function allInteger3x3(m) {
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            if (!Number.isInteger(Math.round(m[i][j] * 1000) / 1000)) return false;
    return true;
}

function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

function generateEigenProblem() {
    const size = parseInt(document.getElementById('matrix-size-select').value);
    const task = document.getElementById('eigen-task-select').value;

    const data = size === 2 ? generate2x2() : generate3x3();
    currentEigenData = { ...data, task, size };

    let problemHTML = `<div>Find the ${task === 'eigenvectors' ? 'eigenvectors' : task === 'both' ? 'eigenvalues and eigenvectors' : 'eigenvalues'} of:</div>`;
    problemHTML += renderMatrix(data.matrix);

    document.getElementById('eigen-problem').innerHTML = problemHTML;

    let inputHTML = '';
    if (task === 'eigenvalues' || task === 'both') {
        inputHTML += `<div class="eigen-input-group">
            <label>Eigenvalues (comma-separated, e.g. -2, 3):</label>
            <input type="text" id="eigen-values-input" autocomplete="off">
        </div>`;
    }

    if (task === 'eigenvectors' || task === 'both') {
        if (task === 'eigenvectors') {
            inputHTML += `<div class="eigen-input-group">
                <label>Given eigenvalues: <strong>${data.eigenvalues.join(', ')}</strong></label>
            </div>`;
        }
        for (let i = 0; i < data.eigenvalues.length; i++) {
            const lam = data.eigenvalues[i];
            if (size === 2) {
                inputHTML += `<div class="eigen-input-group">
                    <label>Eigenvector for λ=${lam} (two components, e.g. 1, -2):</label>
                    <input type="text" id="eigen-vec-${i}" autocomplete="off">
                    <div class="hint">Enter as x, y — any scalar multiple is accepted</div>
                </div>`;
            }
        }
    }

    inputHTML += `<button class="eigen-check-btn" onclick="checkEigenAnswer()">Check</button>`;

    document.getElementById('eigen-input-area').innerHTML = inputHTML;
    document.getElementById('eigen-feedback').textContent = '';
    document.getElementById('eigen-feedback').className = 'feedback';
    document.getElementById('eigen-next').style.display = 'none';

    eigenStartTime = Date.now();
    const firstInput = document.querySelector('#eigen-input-area input');
    if (firstInput) firstInput.focus();
}

function parseNumberList(str) {
    return str.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
}

function isScalarMultiple(v1, v2) {
    if (v1.length !== v2.length) return false;

    let ratio = null;
    for (let i = 0; i < v1.length; i++) {
        if (v2[i] === 0 && v1[i] === 0) continue;
        if (v2[i] === 0 || v1[i] === 0) return false;
        const r = v1[i] / v2[i];
        if (ratio === null) ratio = r;
        else if (Math.abs(r - ratio) > 0.001) return false;
    }
    return ratio !== null;
}

function checkEigenAnswer() {
    const data = currentEigenData;
    const feedback = document.getElementById('eigen-feedback');
    let allCorrect = true;
    let details = [];

    if (data.task === 'eigenvalues' || data.task === 'both') {
        const input = document.getElementById('eigen-values-input').value.trim();
        const userValues = parseNumberList(input).sort((a, b) => a - b);
        const correct = [...data.eigenvalues];

        if (userValues.length === correct.length && userValues.every((v, i) => Math.abs(v - correct[i]) < 0.01)) {
            details.push('Eigenvalues: Correct!');
        } else {
            allCorrect = false;
            details.push(`Eigenvalues: Wrong — correct answer is ${correct.join(', ')}`);
        }
    }

    if ((data.task === 'eigenvectors' || data.task === 'both') && data.eigenvectors) {
        for (let i = 0; i < data.eigenvalues.length; i++) {
            const vecInput = document.getElementById(`eigen-vec-${i}`);
            if (!vecInput) continue;
            const userVec = parseNumberList(vecInput.value.trim());
            const correctVec = data.eigenvectors[i];

            if (userVec.length === correctVec.length && isScalarMultiple(userVec, correctVec)) {
                details.push(`Eigenvector for λ=${data.eigenvalues[i]}: Correct!`);
            } else {
                allCorrect = false;
                details.push(`Eigenvector for λ=${data.eigenvalues[i]}: Wrong — one answer is (${correctVec.join(', ')})`);
            }
        }
    }

    eigenTotal++;
    if (allCorrect) eigenCorrect++;
    const elapsed = (Date.now() - eigenStartTime) / 1000;
    recordResult('Eigenvalues', allCorrect, parseFloat(elapsed.toFixed(1)));

    feedback.innerHTML = details.join('<br>');
    feedback.className = allCorrect ? 'feedback correct' : 'feedback wrong';

    if (data.size === 2) {
        const mat = data.matrix;
        const p = mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
        const mVal = (mat[0][0] + mat[1][1]) / 2;
        feedback.innerHTML += `<div class="solution-detail"><h4>2×2 shortcut:</h4>
            <p>p = det(A) = ${mat[0][0]}·${mat[1][1]} − ${mat[0][1]}·${mat[1][0]} = ${p} (product of eigenvalues)</p>
            <p>m = mean of main diagonal = (${mat[0][0]} + ${mat[1][1]}) / 2 = ${mVal}</p>
            <p>λ = m ± √(m² − p) = ${mVal} ± √(${mVal}² − ${p})</p></div>`;
    }

    if (!allCorrect) {
        let solutionHTML = '<div class="solution-detail"><h4>Solution steps:</h4>';
        solutionHTML += `<p>det(A - λI) = 0</p>`;
        if (data.size === 2) {
            const m = data.matrix;
            solutionHTML += `<p>det([${m[0][0]}-λ, ${m[0][1]}; ${m[1][0]}, ${m[1][1]}-λ]) = 0</p>`;
            solutionHTML += `<p>(${m[0][0]}-λ)(${m[1][1]}-λ) - (${m[0][1]})(${m[1][0]}) = 0</p>`;
            const trace = m[0][0] + m[1][1];
            const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
            solutionHTML += `<p>λ² - ${trace}λ + ${det} = 0</p>`;
            solutionHTML += `<p>λ = ${data.eigenvalues.join(', ')}</p>`;
        }
        solutionHTML += '</div>';
        feedback.innerHTML += solutionHTML;
    }

    document.getElementById('eigen-score').textContent = `Score: ${eigenCorrect}/${eigenTotal}`;
    document.getElementById('eigen-next').style.display = 'inline-block';
}

function startEigen() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('eigen').style.display = 'block';
    eigenCorrect = 0;
    eigenTotal = 0;
    document.getElementById('eigen-score').textContent = 'Score: 0/0';
    generateEigenProblem();
}
