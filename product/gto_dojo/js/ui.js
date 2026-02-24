/**
 * GTO Dojo — UI管理モジュール v2
 * ポストフロップ対応、ストリートフィードバック、セッションサマリー
 */

const UI = (() => {

    /** 画面切り替え */
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');

        if (id === 'home-screen') updateHomeStats();
        if (id === 'stats-screen') updateStatsScreen();
        if (id === 'settings-screen') initSettingsScreen();
    }

    /** トグルボタン選択 */
    function toggleSelect(btn) {
        const group = btn.getAttribute('data-group');
        document.querySelectorAll(`.toggle-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    /** 選択されたトグル値の取得 */
    function getToggleValue(group) {
        const active = document.querySelector(`.toggle-btn[data-group="${group}"].active`);
        return active ? active.getAttribute('data-value') : null;
    }

    /** トースト表示 */
    function showToast(message, duration = 2500) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }

    // === カード描画 ===

    function createCardHTML(cardStr, small = false) {
        const rank = cardStr[0];
        const suit = cardStr[1];
        const suitClass = { s: 'spade', h: 'heart', d: 'diamond', c: 'club' }[suit];
        const suitSymbol = GTO.SUIT_SYMBOLS[suit];
        const sizeClass = small ? 'card-small' : '';
        return `<div class="playing-card ${suitClass} ${sizeClass}">
      <span class="card-rank">${rank}</span>
      <span class="card-suit">${suitSymbol}</span>
    </div>`;
    }

    function displayHeroCards(card1, card2) {
        const container = document.getElementById('hero-cards');
        if (!container) return;
        container.innerHTML = createCardHTML(card1) + createCardHTML(card2);
    }

    function displayBoard(boardCards) {
        const container = document.getElementById('board-cards');
        if (!container) return;
        container.style.display = 'flex';
        container.innerHTML = boardCards.map(c => createCardHTML(c, true)).join('');
        container.classList.add('fade-in');
    }

    function clearBoard() {
        const container = document.getElementById('board-cards');
        if (!container) return;
        container.innerHTML = '';
        container.style.display = 'none';
        // プリフロップミニ結果クリア
        const mini = document.getElementById('preflop-mini-result');
        if (mini) { mini.innerHTML = ''; mini.style.display = 'none'; }
    }

    // === ポジションバッジ ===

    function positionBadgeHTML(position) {
        const cls = position.toLowerCase().replace('+', '');
        return `<span class="position-badge ${cls}">${position}</span>`;
    }

    // === アクションボタン ===

    function renderActionButtons(scenario) {
        const container = document.getElementById('action-buttons');
        if (!container) return;

        let buttons = [];

        switch (scenario) {
            case 'RFI':
                buttons = [
                    { action: 'fold', label: 'フォールド', sublabel: '降りる', icon: '✋' },
                    { action: 'call', label: 'リンプ', sublabel: 'コール', icon: '📞' },
                    { action: 'raise_small', label: 'レイズ (2.5x)', sublabel: '標準', icon: '⬆️' },
                    { action: 'raise_large', label: 'レイズ (4x+)', sublabel: '大きめ', icon: '⏫' },
                ];
                break;
            case 'vs_RFI':
                buttons = [
                    { action: 'fold', label: 'フォールド', sublabel: '降りる', icon: '✋' },
                    { action: 'call', label: 'コール', sublabel: 'フラット', icon: '📞' },
                    { action: 'raise_small', label: '3ベット(小)', sublabel: '2.5〜3x', icon: '⬆️' },
                    { action: 'raise_large', label: '3ベット(大)', sublabel: '4x+', icon: '⏫' },
                ];
                break;
            case 'vs_3bet':
                buttons = [
                    { action: 'fold', label: 'フォールド', sublabel: '降りる', icon: '✋' },
                    { action: 'call', label: 'コール', sublabel: '3betコール', icon: '📞' },
                    { action: 'raise_small', label: '4ベット', sublabel: 'リレイズ', icon: '⬆️' },
                    { action: 'allin', label: 'オールイン', sublabel: '全額', icon: '🔥' },
                ];
                break;
            case 'postflop_action':
                buttons = [
                    { action: 'check', label: 'チェック', sublabel: 'パス', icon: '✅' },
                    { action: 'bet_small', label: 'ベット小', sublabel: '1/3ポット', icon: '💰' },
                    { action: 'bet_large', label: 'ベット大', sublabel: '2/3+ポット', icon: '💎' },
                ];
                break;
            case 'facing_bet':
                buttons = [
                    { action: 'fold', label: 'フォールド', sublabel: '降りる', icon: '✋' },
                    { action: 'call', label: 'コール', sublabel: '合わせる', icon: '📞' },
                    { action: 'raise', label: 'レイズ', sublabel: '返す', icon: '⬆️' },
                ];
                break;
        }

        container.innerHTML = buttons.map(b => `
      <button class="action-btn" data-action="${b.action}" onclick="Game.handleAction('${b.action}')">
        <span>${b.icon} ${b.label}</span>
        <span class="action-label">${b.sublabel}</span>
      </button>
    `).join('');
    }

    // === フィードバック ===

    const ALL_ACTION_LABELS = {
        'fold': 'フォールド', 'call': 'コール', 'raise': 'レイズ', 'check': 'チェック',
        '3bet': '3ベット', '4bet': '4ベット', 'limp': 'リンプ',
        'raise_small': 'レイズ(小)', 'raise_large': 'レイズ(大)', 'allin': 'オールイン',
        'bet_small': 'ベット小', 'bet_large': 'ベット大'
    };

    const STREET_LABELS = {
        'preflop': 'プリフロップ', 'flop': 'フロップ', 'turn': 'ターン', 'river': 'リバー'
    };

    function getScenarioLabel(scenario) {
        const labels = { 'RFI': 'RFI', 'vs_RFI': 'vs オープン', 'vs_3bet': 'vs 3ベット' };
        return labels[scenario] || scenario;
    }

    /** プリフロップ結果をコンパクト表示（ゲーム画面内） */
    function showPreflopMiniResult(result) {
        const mini = document.getElementById('preflop-mini-result');
        if (!mini) return;
        const emoji = result.grade === 'correct' ? '✅' : result.grade === 'mixed' ? '🟡' : '❌';
        const label = ALL_ACTION_LABELS[result.userAction] || result.userAction;
        mini.innerHTML = `<span>${emoji} プリフロップ: ${label}</span>`;
        mini.style.display = 'block';
    }

    /** ストリート間フィードバック（フロップ/ターン結果を簡易表示後に次へ進む） */
    function showStreetFeedback(evaluation, street, nextCallback) {
        const emoji = evaluation.grade === 'correct' ? '✅' : evaluation.grade === 'mixed' ? '🟡' : '❌';
        const streetLabel = STREET_LABELS[street] || street;
        const actionLabel = ALL_ACTION_LABELS[evaluation.userAction] || evaluation.userAction;
        const gtoLabel = ALL_ACTION_LABELS[evaluation.gtoAction] || evaluation.gtoAction;

        // インラインフィードバック
        const overlay = document.getElementById('street-feedback-overlay');
        if (overlay) {
            let freqHtml = '';
            if (evaluation.frequencies) {
                freqHtml = `<div style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);">
          GTO頻度: ${Object.entries(evaluation.frequencies)
                        .filter(([k, v]) => v > 0 && !k.includes('ev'))
                        .map(([k, v]) => `${ALL_ACTION_LABELS[k] || k} ${(v * 100).toFixed(0)}%`)
                        .join(' / ')}
        </div>`;
            }

            let handInfoHtml = '';
            if (evaluation.handLabel) {
                handInfoHtml = `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">
          ハンド強度: <strong>${evaluation.handLabel}</strong>
          ${evaluation.boardLabel ? `/ ボード: <strong>${evaluation.boardLabel}</strong>` : ''}
        </div>`;
            }

            overlay.innerHTML = `
        <div class="street-feedback glass-card" style="text-align:center;">
          <div style="font-size:1.2rem;margin-bottom:8px;">${emoji} ${streetLabel}</div>
          <div style="font-size:0.9rem;">
            あなた: <strong>${actionLabel}</strong>
            → GTO: <strong style="color:var(--accent-success);">${gtoLabel}</strong>
          </div>
          ${handInfoHtml}
          ${evaluation.evLoss > 0 ? `<div style="color:var(--accent-danger);font-size:0.85rem;margin-top:4px;">EVロス: -${evaluation.evLoss.toFixed(2)} BB</div>` : ''}
          ${freqHtml}
          <button class="btn btn-primary" style="margin-top:12px;width:100%;" onclick="UI.dismissStreetFeedback()">
            次のストリートへ →
          </button>
        </div>`;
            overlay.style.display = 'flex';
            overlay._nextCallback = nextCallback;
        } else {
            // フォールバック：直接次へ
            nextCallback();
        }
    }

    function dismissStreetFeedback() {
        const overlay = document.getElementById('street-feedback-overlay');
        if (overlay) {
            const cb = overlay._nextCallback;
            overlay.style.display = 'none';
            overlay.innerHTML = '';
            if (cb) cb();
        }
    }

    /** フル結果画面（ハンド終了時） */
    function renderFullResult(data) {
        const panel = document.getElementById('feedback-panel');
        if (!panel) return;

        const { lastEvaluation, hand, position, scenario, streetResults, totalEvLoss, allMatch, boardCards } = data;

        // ボードカード表示
        let boardHtml = '';
        if (boardCards && boardCards.length > 0) {
            boardHtml = `<div style="display:flex;gap:4px;justify-content:center;margin:12px 0;">${boardCards.map(c => createCardHTML(c, true)).join('')}</div>`;
        }

        // ストリート別結果
        const streetSummaryHtml = streetResults.map(r => {
            const emoji = r.grade === 'correct' ? '✅' : r.grade === 'mixed' ? '🟡' : '❌';
            const streetLabel = STREET_LABELS[r.street] || r.street;
            const userLabel = ALL_ACTION_LABELS[r.userAction] || r.userAction;
            const gtoLabel = ALL_ACTION_LABELS[r.gtoAction] || r.gtoAction;
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
        <span>${emoji} <strong>${streetLabel}</strong></span>
        <span style="font-size:0.8rem;">
          ${userLabel} ${r.match ? '' : `→ <span style="color:var(--accent-success);">${gtoLabel}</span>`}
          ${r.evLoss > 0 ? `<span style="color:var(--accent-danger);"> -${r.evLoss.toFixed(2)}BB</span>` : ''}
        </span>
      </div>`;
        }).join('');

        // 総合評価
        const overallEmoji = allMatch ? '🎉' : totalEvLoss <= 1 ? '👍' : totalEvLoss <= 3 ? '😐' : '😓';
        const overallMsg = allMatch ? '全ストリートGTO通り！パーフェクト！'
            : totalEvLoss <= 1 ? '概ね良いプレイでした。'
                : totalEvLoss <= 3 ? '改善の余地があります。'
                    : '大きなミスがありました。復習しましょう。';

        panel.innerHTML = `
      <div style="text-align:center;margin-bottom:12px;">
        <span style="font-size:2rem;">${overallEmoji}</span>
        <div style="font-size:1.1rem;font-weight:700;margin-top:4px;">${overallMsg}</div>
      </div>

      <table class="gto-comparison">
        <tr><th>項目</th><th>詳細</th></tr>
        <tr>
          <td>ハンド</td>
          <td style="font-family:var(--font-mono);font-weight:700;">${hand}</td>
        </tr>
        <tr>
          <td>ポジション</td>
          <td>${positionBadgeHTML(position)}</td>
        </tr>
        <tr>
          <td>シナリオ</td>
          <td>${getScenarioLabel(scenario)}</td>
        </tr>
        <tr>
          <td>合計EVロス</td>
          <td class="ev-value ${totalEvLoss > 0 ? 'negative' : 'positive'}">
            ${totalEvLoss > 0 ? '-' + totalEvLoss.toFixed(2) : '0.00'} BB
          </td>
        </tr>
      </table>

      ${boardHtml}

      <div style="margin-top:12px;">
        <h4 style="font-size:0.85rem;margin-bottom:8px;color:var(--text-secondary);">ストリート別</h4>
        ${streetSummaryHtml}
      </div>

      ${lastEvaluation.explanation ? `
      <div style="margin-top:12px;padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);border-left:3px solid var(--accent-primary);">
        <p style="font-size:0.8rem;color:var(--text-secondary);">💡 ${lastEvaluation.explanation}</p>
      </div>` : ''}
    `;
    }

    // === セッションサマリー ===

    function renderSessionSummary(sessionData, results) {
        const container = document.getElementById('session-summary-content');
        if (!container) return;

        const perfectRate = sessionData.hands > 0
            ? (sessionData.perfectHands / sessionData.hands * 100).toFixed(0)
            : 0;

        // ハンド別結果リスト
        const handListHtml = results.slice(-20).reverse().map(r => {
            const emoji = r.allMatch ? '✅' : '❌';
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;">
        <span>${emoji} #${r.handNum} <strong style="font-family:var(--font-mono);">${r.hand}</strong></span>
        <span>${positionBadgeHTML(r.position)} ${r.matchCount}/${r.totalStreets}正解
          ${r.totalEvLoss > 0 ? `<span style="color:var(--accent-danger);"> -${r.totalEvLoss.toFixed(1)}BB</span>` : ''}
        </span>
      </div>`;
        }).join('');

        container.innerHTML = `
      <div style="text-align:center;margin-bottom:var(--spacing-lg);">
        <span style="font-size:2.5rem;">🏁</span>
        <h2 style="font-size:1.2rem;margin-top:8px;">セッション完了</h2>
      </div>

      <div class="stats-grid" style="margin-bottom:var(--spacing-md);">
        <div class="stat-item">
          <span class="stat-value">${sessionData.hands}</span>
          <span class="stat-label">ハンド数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value ${parseFloat(sessionData.gtoRate) >= 60 ? 'positive' : 'negative'}">${sessionData.gtoRate}%</span>
          <span class="stat-label">GTO一致率</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${perfectRate}%</span>
          <span class="stat-label">パーフェクト率</span>
        </div>
        <div class="stat-item">
          <span class="stat-value negative">-${sessionData.evLoss}</span>
          <span class="stat-label">合計EVロス</span>
        </div>
      </div>

      <div class="glass-card" style="margin-top:var(--spacing-md);">
        <h3 style="font-size:0.85rem;margin-bottom:8px;">ハンド履歴（直近20件）</h3>
        ${handListHtml || '<p style="color:var(--text-muted);text-align:center;">データなし</p>'}
      </div>
    `;
    }

    // === ゲーム情報バー ===

    function updateGameInfo(data) {
        if (data.handNum !== undefined) {
            const el = document.getElementById('game-hand-num');
            if (el) el.textContent = `#${data.handNum}`;
        }
        if (data.position !== undefined) {
            const el = document.getElementById('game-position');
            if (el) el.innerHTML = positionBadgeHTML(data.position);
        }
        if (data.street !== undefined) {
            const el = document.getElementById('game-street');
            if (el) el.textContent = data.street;
        }
        if (data.stack !== undefined) {
            const el = document.getElementById('game-stack');
            if (el) el.textContent = `${data.stack}BB`;
        }
        if (data.pot !== undefined) {
            const el = document.getElementById('game-pot');
            if (el) el.textContent = `${data.pot} BB`;
        }
    }

    // === ヴィランアクション ===

    function showVillainAction(text) {
        const area = document.getElementById('villain-action-area');
        const textEl = document.getElementById('villain-action-text');
        if (area && textEl) {
            textEl.textContent = text;
            area.style.display = 'block';
        }
    }

    function hideVillainAction() {
        const area = document.getElementById('villain-action-area');
        if (area) area.style.display = 'none';
    }

    // === ホーム画面スタッツ ===

    function updateHomeStats() {
        const totalEl = document.getElementById('home-total-hands');
        const rateEl = document.getElementById('home-gto-rate');
        const evEl = document.getElementById('home-ev-loss');

        if (totalEl) totalEl.textContent = Stats.getTotalHands();
        if (rateEl) {
            const rate = Stats.getGTORate();
            rateEl.textContent = rate !== null ? `${rate}%` : '—';
        }
        if (evEl) {
            const ev = Stats.getAvgEvLoss();
            evEl.textContent = ev !== null ? `${ev}BB` : '—';
        }
    }

    // === 成績画面 ===

    function updateStatsScreen() {
        const totalEl = document.getElementById('stat-total-hands');
        const rateEl = document.getElementById('stat-gto-rate');
        const evEl = document.getElementById('stat-ev-loss');
        const sessEl = document.getElementById('stat-sessions');

        if (totalEl) totalEl.textContent = Stats.getTotalHands();
        if (rateEl) {
            const rate = Stats.getGTORate();
            rateEl.textContent = rate !== null ? `${rate}%` : '—';
            if (rate !== null) {
                rateEl.className = 'stat-value ' + (parseFloat(rate) >= 60 ? 'positive' : 'negative');
            }
        }
        if (evEl) {
            const ev = Stats.getAvgEvLoss();
            evEl.textContent = ev !== null ? `${ev} BB` : '—';
            if (ev !== null) evEl.className = 'stat-value negative';
        }
        if (sessEl) sessEl.textContent = Stats.getSessionCount();
        renderPositionStats();
    }

    function renderPositionStats() {
        const container = document.getElementById('position-stats');
        if (!container) return;

        const posStats = Stats.getPositionStats();
        const positions = GTO.POSITIONS_6MAX;

        if (Object.keys(posStats).length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">データがありません</p>';
            return;
        }

        container.innerHTML = positions.map(pos => {
            const data = posStats[pos];
            if (!data || data.hands === 0) {
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          ${positionBadgeHTML(pos)}
          <span style="color:var(--text-muted);font-size:0.8rem;">—</span>
        </div>`;
            }
            const rate = (data.matches / data.hands * 100).toFixed(0);
            const barColor = rate >= 70 ? 'var(--accent-success)' : rate >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';
            return `<div style="padding:8px 0;border-bottom:1px solid var(--border-color);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          ${positionBadgeHTML(pos)}
          <span style="font-family:var(--font-mono);font-size:0.85rem;font-weight:700;">${rate}% <span style="color:var(--text-muted);font-weight:400;">(${data.hands}h)</span></span>
        </div>
        <div style="height:4px;background:var(--bg-secondary);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${rate}%;background:${barColor};border-radius:2px;transition:width 0.5s ease;"></div>
        </div>
      </div>`;
        }).join('');
    }

    /** 設定画面初期化 */
    function initSettingsScreen() {
        const nameInput = document.getElementById('setting-name');
        if (nameInput) nameInput.value = Stats.getSetting('playerName') || 'Hero';
    }

    // === 公開API ===
    return {
        showScreen,
        toggleSelect,
        getToggleValue,
        showToast,
        createCardHTML,
        displayHeroCards,
        displayBoard,
        clearBoard,
        positionBadgeHTML,
        renderActionButtons,
        showPreflopMiniResult,
        showStreetFeedback,
        dismissStreetFeedback,
        renderFullResult,
        renderSessionSummary,
        updateGameInfo,
        showVillainAction,
        hideVillainAction,
        updateHomeStats,
        updateStatsScreen
    };
})();
