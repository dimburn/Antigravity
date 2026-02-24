/**
 * GTO Dojo — レンジビューア
 * 13x13グリッドでポジション別GTOレンジをグラフィカル表示
 */

const RangeViewer = (() => {
    const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

    let currentPosition = 'BTN';
    let currentScenario = 'RFI';

    // === 初期化 ===

    function init() {
        renderGrid();
        renderControls();
    }

    // === グリッド描画 ===

    function renderGrid() {
        const container = document.getElementById('range-grid');
        if (!container) return;

        // ヘッダー行 + 13行
        let html = '<div class="range-grid-inner">';

        // 角 (空セル)
        html += '<div class="range-cell range-header"></div>';
        // 列ヘッダー
        for (const rank of RANKS) {
            html += `<div class="range-cell range-header">${rank}</div>`;
        }

        for (let row = 0; row < 13; row++) {
            // 行ヘッダー
            html += `<div class="range-cell range-header">${RANKS[row]}</div>`;
            for (let col = 0; col < 13; col++) {
                const hand = getHandNotation(row, col);
                const type = row < col ? 'suited' : row > col ? 'offsuit' : 'pair';
                const action = getHandAction(hand);
                const actionClass = getActionClass(action);
                const tooltip = `${hand} — ${getActionLabel(action)}`;

                html += `<div class="range-cell ${type} ${actionClass}"
                    data-hand="${hand}" title="${tooltip}"
                    onclick="RangeViewer.showHandDetail('${hand}')">
                    <span class="range-hand-label">${hand}</span>
                </div>`;
            }
        }

        html += '</div>';

        // 凡例
        html += `
            <div class="range-legend">
                <div class="legend-item"><span class="legend-color action-raise"></span> レイズ</div>
                <div class="legend-item"><span class="legend-color action-call"></span> コール</div>
                <div class="legend-item"><span class="legend-color action-3bet"></span> 3ベット</div>
                <div class="legend-item"><span class="legend-color action-fold"></span> フォールド</div>
            </div>`;

        container.innerHTML = html;
    }

    // === ハンド表記取得 ===

    function getHandNotation(row, col) {
        if (row === col) return RANKS[row] + RANKS[col]; // pair
        if (row < col) return RANKS[row] + RANKS[col] + 's'; // suited (top-right)
        return RANKS[col] + RANKS[row] + 'o'; // offsuit (bottom-left)
    }

    // === GTO推奨アクション取得 ===

    function getHandAction(hand) {
        if (!GTO.isLoaded()) return 'fold';

        let result;
        if (currentScenario === 'RFI') {
            result = GTO.getRFIAction(hand, currentPosition);
        } else if (currentScenario === 'vs_RFI') {
            // 一つ前のポジションをレイザーとする
            const positions = GTO.POSITIONS_6MAX;
            const idx = positions.indexOf(currentPosition);
            const raiserPos = idx > 0 ? positions[idx - 1] : 'UTG';
            result = GTO.getVsRFIAction(hand, currentPosition, raiserPos);
        } else if (currentScenario === 'vs_3bet') {
            result = GTO.getVs3betAction(hand, currentPosition);
        }

        return result ? result.recommended : 'fold';
    }

    // === アクション色分け ===

    function getActionClass(action) {
        switch (action) {
            case 'raise': return 'action-raise';
            case 'call': return 'action-call';
            case '3bet': return 'action-3bet';
            case '4bet': return 'action-4bet';
            default: return 'action-fold';
        }
    }

    function getActionLabel(action) {
        const labels = {
            raise: 'レイズ', call: 'コール', '3bet': '3ベット',
            '4bet': '4ベット', fold: 'フォールド'
        };
        return labels[action] || action;
    }

    // === コントロール描画 ===

    function renderControls() {
        const container = document.getElementById('range-controls');
        if (!container) return;

        const positions = GTO.POSITIONS_6MAX;

        container.innerHTML = `
            <div style="margin-bottom:12px;">
                <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">ポジション</label>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${positions.map(p => `
                        <button class="toggle-btn range-pos-btn ${p === currentPosition ? 'active' : ''}"
                            onclick="RangeViewer.selectPosition('${p}')">${p}</button>
                    `).join('')}
                </div>
            </div>
            <div>
                <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">シナリオ</label>
                <div style="display:flex;gap:4px;">
                    <button class="toggle-btn range-scn-btn ${currentScenario === 'RFI' ? 'active' : ''}"
                        onclick="RangeViewer.selectScenario('RFI')">RFI</button>
                    <button class="toggle-btn range-scn-btn ${currentScenario === 'vs_RFI' ? 'active' : ''}"
                        onclick="RangeViewer.selectScenario('vs_RFI')">vs RFI</button>
                    <button class="toggle-btn range-scn-btn ${currentScenario === 'vs_3bet' ? 'active' : ''}"
                        onclick="RangeViewer.selectScenario('vs_3bet')">vs 3bet</button>
                </div>
            </div>

            <div style="margin-top:12px;text-align:center;">
                <span id="range-summary" style="font-size:0.8rem;color:var(--text-secondary);"></span>
            </div>`;

        updateRangeSummary();
    }

    // === ポジション/シナリオ切替 ===

    function selectPosition(pos) {
        currentPosition = pos;
        document.querySelectorAll('.range-pos-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.range-pos-btn[onclick*="'${pos}'"]`)?.classList.add('active');
        renderGrid();
        updateRangeSummary();
    }

    function selectScenario(scn) {
        currentScenario = scn;
        document.querySelectorAll('.range-scn-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.range-scn-btn[onclick*="'${scn}'"]`)?.classList.add('active');
        renderGrid();
        updateRangeSummary();
    }

    // === レンジサマリー ===

    function updateRangeSummary() {
        const el = document.getElementById('range-summary');
        if (!el) return;

        // レイズ/コール/フォールドのコンボ数を数える
        let raiseCount = 0, callCount = 0, foldCount = 0, totalCombos = 0;

        for (let row = 0; row < 13; row++) {
            for (let col = 0; col < 13; col++) {
                const hand = getHandNotation(row, col);
                const action = getHandAction(hand);
                const type = row < col ? 'suited' : row > col ? 'offsuit' : 'pair';
                const combos = type === 'pair' ? 6 : type === 'suited' ? 4 : 12;
                totalCombos += combos;

                if (action === 'raise' || action === '3bet' || action === '4bet') raiseCount += combos;
                else if (action === 'call') callCount += combos;
                else foldCount += combos;
            }
        }

        const raisePct = (raiseCount / totalCombos * 100).toFixed(1);
        const callPct = (callCount / totalCombos * 100).toFixed(1);

        const scenarioLabels = { RFI: 'RFI', vs_RFI: 'vs RFI', vs_3bet: 'vs 3bet' };
        el.innerHTML = `${currentPosition} ${scenarioLabels[currentScenario]} — レイズ: ${raisePct}% / コール: ${callPct}%`;
    }

    // === ハンド詳細表示 ===

    function showHandDetail(hand) {
        const action = getHandAction(hand);
        const label = getActionLabel(action);
        UI.showToast(`${hand}: GTO → ${label}`);
    }

    // === 公開API ===
    return {
        init,
        selectPosition,
        selectScenario,
        showHandDetail
    };
})();
