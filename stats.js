const STATS_KEY = 'mathprep-stats';

function loadStats() {
    try {
        return JSON.parse(localStorage.getItem(STATS_KEY)) || {};
    } catch { return {}; }
}

function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function recordResult(topic, correct, timeSeconds) {
    const stats = loadStats();
    if (!stats[topic]) {
        stats[topic] = { correct: 0, wrong: 0, totalTime: 0, times: [], bestStreak: 0, currentStreak: 0 };
    }
    const t = stats[topic];
    if (correct) {
        t.correct++;
        t.currentStreak++;
        if (t.currentStreak > t.bestStreak) t.bestStreak = t.currentStreak;
    } else {
        t.wrong++;
        t.currentStreak = 0;
    }
    t.totalTime += timeSeconds;
    t.times.push(timeSeconds);
    if (t.times.length > 100) t.times.shift();
    saveStats(stats);
}

function getTopicStats(topic) {
    const stats = loadStats();
    return stats[topic] || { correct: 0, wrong: 0, totalTime: 0, times: [], bestStreak: 0, currentStreak: 0 };
}

function getAllStats() {
    return loadStats();
}

function formatAvgTime(times) {
    if (times.length === 0) return '—';
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return avg.toFixed(1) + 's';
}

function renderStatsPanel() {
    const stats = getAllStats();
    const topics = Object.keys(stats);
    if (topics.length === 0) return '';

    let html = '<div class="stats-panel"><h3>Session Stats</h3><table class="stats-table">';
    html += '<tr><th>Topic</th><th>Correct</th><th>Wrong</th><th>Avg Time</th><th>Best Streak</th></tr>';
    for (const topic of topics) {
        const s = stats[topic];
        html += `<tr>
            <td>${topic}</td>
            <td class="stat-correct">${s.correct}</td>
            <td class="stat-wrong">${s.wrong}</td>
            <td>${formatAvgTime(s.times)}</td>
            <td>${s.bestStreak}</td>
        </tr>`;
    }
    html += '</table></div>';
    return html;
}

function showStatsOnHome() {
    let panel = document.getElementById('home-stats');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'home-stats';
        const menu = document.getElementById('main-menu');
        menu.appendChild(panel);
    }
    panel.innerHTML = renderStatsPanel();
}
