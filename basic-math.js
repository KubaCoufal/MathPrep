let basicCorrect = 0;
let basicTotal = 0;
let basicStreak = 0;
let basicCurrentAnswer = null;
let basicStartTime = null;

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRange() {
    const diff = document.getElementById('difficulty-select').value;
    if (diff === 'single') return [1, 9];
    if (diff === 'double') return [10, 99];
    return Math.random() < 0.5 ? [1, 9] : [10, 99];
}

function generateBasicProblem() {
    const opSelect = document.getElementById('operation-select').value;
    const ops = opSelect === 'all' ? ['add', 'sub', 'mul', 'div'] : [opSelect];
    const op = ops[Math.floor(Math.random() * ops.length)];

    const [min, max] = getRange();
    let a, b, symbol, answer;

    switch (op) {
        case 'add':
            a = randInt(min, max);
            b = randInt(min, max);
            symbol = '+';
            answer = a + b;
            break;
        case 'sub':
            a = randInt(min, max);
            b = randInt(min, max);
            if (b > a) [a, b] = [b, a];
            symbol = '−';
            answer = a - b;
            break;
        case 'mul':
            a = randInt(min, Math.min(max, 19));
            b = randInt(min, Math.min(max, 19));
            symbol = '×';
            answer = a * b;
            break;
        case 'div':
            b = randInt(Math.max(min, 2), Math.min(max, 19));
            answer = randInt(min, Math.min(max, 19));
            a = b * answer;
            symbol = '÷';
            break;
    }

    basicCurrentAnswer = answer;
    basicStartTime = Date.now();

    document.getElementById('basic-problem').textContent = `${a} ${symbol} ${b} = ?`;
    document.getElementById('basic-answer').value = '';
    document.getElementById('basic-feedback').textContent = '';
    document.getElementById('basic-feedback').className = 'feedback';
    document.getElementById('basic-next').style.display = 'none';
    document.getElementById('basic-answer').focus();
    document.getElementById('basic-time').textContent = 'Time: —';
}

function checkBasicAnswer() {
    const input = document.getElementById('basic-answer').value.trim();
    if (input === '') return;

    const userAnswer = parseFloat(input);
    const elapsed = ((Date.now() - basicStartTime) / 1000).toFixed(1);
    basicTotal++;

    const feedback = document.getElementById('basic-feedback');

    if (userAnswer === basicCurrentAnswer) {
        basicCorrect++;
        basicStreak++;
        feedback.textContent = `Correct! (${elapsed}s)`;
        feedback.className = 'feedback correct';
    } else {
        basicStreak = 0;
        feedback.textContent = `Wrong — answer is ${basicCurrentAnswer}`;
        feedback.className = 'feedback wrong';
    }

    document.getElementById('basic-score').textContent = `Score: ${basicCorrect}/${basicTotal}`;
    document.getElementById('basic-streak').textContent = `Streak: ${basicStreak}`;
    document.getElementById('basic-time').textContent = `Time: ${elapsed}s`;
    document.getElementById('basic-next').style.display = 'inline-block';
    document.getElementById('basic-answer').blur();
}

function startBasicMath() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('basic-math').style.display = 'block';
    basicCorrect = 0;
    basicTotal = 0;
    basicStreak = 0;
    document.getElementById('basic-score').textContent = 'Score: 0/0';
    document.getElementById('basic-streak').textContent = 'Streak: 0';
    generateBasicProblem();
}
