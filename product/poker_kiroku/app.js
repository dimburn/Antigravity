/**
 * Poker Kiroku App - With Visual Card Picker & BB Charts
 */

// ===== State =====
let sessions = JSON.parse(localStorage.getItem('poker_sessions') || '[]');
let currentSession = null;
let positionIndex = 0;
let currentPeriod = 'all';
let historyPeriod = 'all';
let profitChart = null;

// Card picker state
let selectedCards = [null, null];
let currentCardIndex = 0;
let tempRank = null;

const POSITIONS = {
    '2': ['BTN', 'BB'],
    '6': ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
    '9': ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO']
};

let positions = POSITIONS['6'];
let currentStakes = { sb: 1, bb: 2, ante: 2 };

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('poker_current_session');
    updateHomeStats();
    showScreen('home-screen');

    document.getElementById('session-form').addEventListener('submit', (e) => {
        e.preventDefault();
        startSession();
    });
});

// ===== Screen Navigation =====
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');

    if (id === 'home-screen') updateHomeStats();
}

// ===== Period Filtering =====
function setPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('#home-screen .filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    updateHomeStats();
}

function setHistoryPeriod(period) {
    historyPeriod = period;
    document.querySelectorAll('#history-screen .filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderHistory();
}

function getFilteredSessions(period) {
    const now = new Date();
    let cutoff;

    switch (period) {
        case 'week': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
        case 'month': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
        case '3month': cutoff = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
        default: return sessions;
    }

    return sessions.filter(s => new Date(s.startTime) >= cutoff);
}

function getPeriodLabel(period) {
    switch (period) {
        case 'week': return '(1週間)';
        case 'month': return '(1ヶ月)';
        case '3month': return '(3ヶ月)';
        default: return '(全期間)';
    }
}

// ===== Setup Functions =====
function selectGameType(btn) {
    btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function selectStakes(btn) {
    document.querySelectorAll('#stakes-group .toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('custom-stakes-group').style.display = 'none';

    currentStakes = {
        sb: parseInt(btn.dataset.sb) || 1,
        bb: parseInt(btn.dataset.bb) || 2,
        ante: parseInt(btn.dataset.ante) || 0
    };
}

function showCustomStakes() {
    document.querySelectorAll('#stakes-group .toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[onclick="showCustomStakes()"]').classList.add('active');
    document.getElementById('custom-stakes-group').style.display = 'block';
}

function selectTableSize(btn) {
    btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    positions = POSITIONS[btn.dataset.value] || POSITIONS['6'];
}

// ===== Start Session =====
function startSession() {
    const gameTypeBtn = document.querySelector('#session-form [data-value="cash"].active');
    const gameType = gameTypeBtn ? 'cash' : 'tournament';
    const buyinBB = parseInt(document.getElementById('buyin').value) || 100;
    const location = document.getElementById('location').value || '';

    if (document.getElementById('custom-stakes-group').style.display === 'block') {
        currentStakes = {
            sb: parseInt(document.getElementById('custom-sb').value) || 1,
            bb: parseInt(document.getElementById('custom-bb').value) || 2,
            ante: parseInt(document.getElementById('custom-ante').value) || 0
        };
    }

    currentSession = {
        id: Date.now(),
        startTime: new Date().toISOString(),
        gameType,
        stakes: { ...currentStakes },
        buyinBB,
        location,
        hands: [],
        handsPlayed: 0,
        vpipCount: 0,
        pfrCount: 0,
        threeBetCount: 0,
        winCount: 0,
        loseCount: 0
    };

    positionIndex = 0;
    selectedCards = [null, null];
    updateHandDisplay();
    updateHUD();
    showScreen('hud-screen');
}

// ===== Card Picker =====
function openCardPicker() {
    currentCardIndex = 0;
    tempRank = null;
    document.getElementById('card-picker-modal').style.display = 'flex';
    updatePickerDisplay();
}

function closeCardPicker() {
    document.getElementById('card-picker-modal').style.display = 'none';
}

function selectRank(rank) {
    tempRank = rank;
    // Highlight all rank buttons
    document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');
}

function selectSuit(suit) {
    if (!tempRank) {
        alert('まずランクを選んでください');
        return;
    }

    selectedCards[currentCardIndex] = tempRank + suit;
    currentCardIndex = (currentCardIndex + 1) % 2;
    tempRank = null;

    document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('selected'));
    updatePickerDisplay();
}

function updatePickerDisplay() {
    const card1El = document.getElementById('selected-card-1');
    const card2El = document.getElementById('selected-card-2');

    card1El.innerHTML = selectedCards[0] ? formatCardHTML(selectedCards[0]) : '?';
    card2El.innerHTML = selectedCards[1] ? formatCardHTML(selectedCards[1]) : '?';

    card1El.className = 'selected-card' + (currentCardIndex === 0 ? ' active' : '');
    card2El.className = 'selected-card' + (currentCardIndex === 1 ? ' active' : '');
}

function formatCardHTML(card) {
    if (!card) return '?';
    const rank = card[0];
    const suit = card[1];
    const suitSymbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
    const suitColors = { s: 'black', h: 'red', d: 'red', c: 'black' };
    return `<span class="card-rank">${rank}</span><span class="card-suit ${suitColors[suit]}">${suitSymbols[suit]}</span>`;
}

function clearCards() {
    selectedCards = [null, null];
    currentCardIndex = 0;
    tempRank = null;
    document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('selected'));
    updatePickerDisplay();
}

function confirmCards() {
    closeCardPicker();
    updateHandDisplay();
}

function updateHandDisplay() {
    const container = document.getElementById('hand-cards');
    if (selectedCards[0] && selectedCards[1]) {
        container.innerHTML = `
            <div class="playing-card">${formatCardHTML(selectedCards[0])}</div>
            <div class="playing-card">${formatCardHTML(selectedCards[1])}</div>
        `;
    } else {
        container.innerHTML = `
            <div class="card-placeholder">?</div>
            <div class="card-placeholder">?</div>
        `;
    }
}

// ===== HUD =====
function updateHUD() {
    if (!currentSession) return;

    document.getElementById('hud-game-type').textContent = currentSession.gameType === 'cash' ? '💵' : '🏆';

    const s = currentSession.stakes;
    document.getElementById('hud-stakes').textContent = s.ante > 0 ? `${s.sb}-${s.bb}-${s.ante}` : `${s.sb}-${s.bb}`;
    document.getElementById('hud-hand-count').textContent = `#${currentSession.handsPlayed}`;
    document.getElementById('current-position').textContent = positions[positionIndex % positions.length];

    const h = currentSession.handsPlayed || 1;
    document.getElementById('live-vpip').textContent = Math.round((currentSession.vpipCount / h) * 100) + '%';
    document.getElementById('live-pfr').textContent = Math.round((currentSession.pfrCount / h) * 100) + '%';
    document.getElementById('live-3bet').textContent = Math.round((currentSession.threeBetCount / h) * 100) + '%';

    const totalRes = currentSession.winCount + currentSession.loseCount;
    document.getElementById('live-winrate').textContent = totalRes > 0 ? Math.round((currentSession.winCount / totalRes) * 100) + '%' : '0%';
}

function cyclePosition() {
    positionIndex = (positionIndex + 1) % positions.length;
    document.getElementById('current-position').textContent = positions[positionIndex];
}

// ===== Actions =====
function recordAction(action) {
    if (!currentSession) return;

    currentSession.handsPlayed++;

    // Save hand with cards
    currentSession.hands.push({
        position: positions[positionIndex % positions.length],
        action,
        cards: selectedCards[0] && selectedCards[1] ? [...selectedCards] : null,
        timestamp: new Date().toISOString()
    });

    if (action !== 'fold') {
        currentSession.vpipCount++;
        if (['raise', '3bet', '4bet', 'allin'].includes(action)) {
            currentSession.pfrCount++;
        }
        if (['3bet', '4bet'].includes(action)) {
            currentSession.threeBetCount++;
        }
        document.getElementById('action-phase').style.display = 'none';
        document.getElementById('inhand-phase').style.display = 'block';
    } else {
        nextHand();
    }

    updateHUD();
}

function recordResult(result) {
    if (result === 'win') currentSession.winCount++;
    else currentSession.loseCount++;

    document.getElementById('action-phase').style.display = 'block';
    document.getElementById('inhand-phase').style.display = 'none';

    nextHand();
}

function nextHand() {
    positionIndex++;
    selectedCards = [null, null];
    updateHandDisplay();
    updateHUD();
}

// ===== End Session =====
function endSession() {
    if (confirm('セッションを終了しますか？')) {
        showScreen('cashout-screen');
    }
}

function saveSession() {
    const cashoutBB = parseInt(document.getElementById('cashout').value) || 0;

    currentSession.endTime = new Date().toISOString();
    currentSession.cashoutBB = cashoutBB;
    currentSession.profitBB = cashoutBB - currentSession.buyinBB;

    sessions.push(currentSession);
    localStorage.setItem('poker_sessions', JSON.stringify(sessions));

    alert(`保存完了! 収支: ${currentSession.profitBB > 0 ? '+' : ''}${currentSession.profitBB} BB`);

    currentSession = null;
    document.getElementById('buyin').value = '';
    document.getElementById('cashout').value = '';
    document.getElementById('location').value = '';

    showScreen('home-screen');
}

// ===== Delete Sessions =====
function clearAllSessions() {
    if (confirm('すべての履歴を削除しますか？')) {
        sessions = [];
        localStorage.setItem('poker_sessions', JSON.stringify(sessions));
        updateHomeStats();
        renderHistory();
    }
}

function deleteSession(id) {
    if (confirm('削除しますか？')) {
        sessions = sessions.filter(s => s.id !== id);
        localStorage.setItem('poker_sessions', JSON.stringify(sessions));
        updateHomeStats();
        renderHistory();
    }
}

// ===== Home Stats =====
function updateHomeStats() {
    const filtered = getFilteredSessions(currentPeriod);

    document.getElementById('period-label').textContent = getPeriodLabel(currentPeriod);

    const totalProfitBB = filtered.reduce((s, x) => s + (x.profitBB || 0), 0);
    const totalHands = filtered.reduce((s, x) => s + (x.handsPlayed || 0), 0);
    const totalVpip = filtered.reduce((s, x) => s + (x.vpipCount || 0), 0);
    const totalPfr = filtered.reduce((s, x) => s + (x.pfrCount || 0), 0);
    const total3Bet = filtered.reduce((s, x) => s + (x.threeBetCount || 0), 0);
    const totalWins = filtered.reduce((s, x) => s + (x.winCount || 0), 0);
    const totalLoses = filtered.reduce((s, x) => s + (x.loseCount || 0), 0);
    const totalRes = totalWins + totalLoses;

    document.getElementById('total-profit').textContent = `${totalProfitBB >= 0 ? '+' : ''}${totalProfitBB} BB`;
    document.getElementById('total-profit').style.color = totalProfitBB >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    document.getElementById('total-sessions').textContent = filtered.length;
    document.getElementById('total-vpip').textContent = totalHands > 0 ? Math.round((totalVpip / totalHands) * 100) + '%' : '--%';
    document.getElementById('total-pfr').textContent = totalHands > 0 ? Math.round((totalPfr / totalHands) * 100) + '%' : '--%';
    document.getElementById('total-3bet').textContent = totalHands > 0 ? Math.round((total3Bet / totalHands) * 100) + '%' : '--%';
    document.getElementById('total-winrate').textContent = totalRes > 0 ? Math.round((totalWins / totalRes) * 100) + '%' : '--%';

    updateChart(filtered);
    renderHistory();
}

// ===== Chart (BB based) =====
function updateChart(data) {
    const ctx = document.getElementById('profit-chart');
    if (!ctx) return;

    const sorted = [...data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    let cumulative = 0;
    const labels = [];
    const profits = [];

    sorted.forEach(s => {
        cumulative += (s.profitBB || 0);
        labels.push(new Date(s.startTime).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
        profits.push(cumulative);
    });

    if (labels.length === 0) {
        labels.push('データなし');
        profits.push(0);
    }

    if (profitChart) profitChart.destroy();

    const finalProfit = profits[profits.length - 1] || 0;

    profitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '累計収支 (BB)',
                data: profits,
                borderColor: finalProfit >= 0 ? '#00d26a' : '#ff4d6d',
                backgroundColor: finalProfit >= 0 ? 'rgba(0, 210, 106, 0.1)' : 'rgba(255, 77, 109, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// ===== History =====
function renderHistory() {
    const container = document.getElementById('history-list');
    const filtered = getFilteredSessions(historyPeriod);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 まだセッションがありません</div>';
        return;
    }

    container.innerHTML = filtered.slice().reverse().map(s => {
        const date = new Date(s.startTime).toLocaleDateString('ja-JP');
        const profit = s.profitBB || 0;
        const vpip = s.handsPlayed > 0 ? Math.round((s.vpipCount / s.handsPlayed) * 100) : 0;
        const stakesStr = s.stakes?.ante > 0 ? `${s.stakes.sb}-${s.stakes.bb}-${s.stakes.ante}` : `${s.stakes?.sb || 1}-${s.stakes?.bb || 2}`;

        return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-date">${date} ${s.gameType === 'cash' ? '💵' : '🏆'} ${stakesStr}</div>
                    <div class="history-location">${s.location || ''}</div>
                    <div class="history-stats">${s.handsPlayed}h | VPIP ${vpip}%</div>
                </div>
                <div class="history-right">
                    <div class="history-profit ${profit >= 0 ? 'positive' : 'negative'}">
                        ${profit >= 0 ? '+' : ''}${profit}BB
                    </div>
                    <button class="btn-delete-item" onclick="deleteSession(${s.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}
