/**
 * GTO Dojo v2 — UI管理モジュール
 * AI対戦版: ヴィラン手札表示、全アクションEV比較バー、詳細「なぜダメなのか」解説
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

  // === AIローディング ===

  function showAILoading(show, message = '🤖 AI分析中...') {
    const overlay = document.getElementById('ai-loading-overlay');
    if (!overlay) return;
    if (show) {
      overlay.querySelector('.ai-loading-text').textContent = message;
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  // === カード描画 ===

  function createCardHTML(cardStr, small = false, faceDown = false) {
    if (faceDown) {
      const sizeClass = small ? 'card-small' : '';
      return `<div class="playing-card card-back ${sizeClass}">
        <span class="card-back-design">🂠</span>
      </div>`;
    }
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

  /** v2: ヴィランカード表示（裏面 or 表面） */
  function displayVillainCards(card1, card2, reveal = false) {
    const container = document.getElementById('villain-cards-display');
    if (!container) return;
    if (reveal) {
      container.innerHTML = createCardHTML(card1, true) + createCardHTML(card2, true);
    } else {
      container.innerHTML = createCardHTML(null, true, true) + createCardHTML(null, true, true);
    }
    container.style.display = 'flex';
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

  // === v2: EV比較バーチャート（全アクションのEVと理由） ===

  function buildEVComparisonBars(actions, userAction) {
    if (!actions || Object.keys(actions).length === 0) return '';

    const entries = Object.entries(actions)
      .filter(([k, v]) => v && (typeof v === 'object' ? v.frequency > 0 : v > 0))
      .sort((a, b) => {
        const evA = typeof a[1] === 'object' ? (a[1].ev || 0) : 0;
        const evB = typeof b[1] === 'object' ? (b[1].ev || 0) : 0;
        return evB - evA;
      });

    if (entries.length === 0) return '';

    const maxFreq = Math.max(...entries.map(([, v]) => typeof v === 'object' ? v.frequency : v));

    const bars = entries.map(([action, detail]) => {
      const isObject = typeof detail === 'object';
      const freq = isObject ? detail.frequency : detail;
      const ev = isObject ? detail.ev : null;
      const reason = isObject ? detail.reason : '';
      const pct = (freq * 100).toFixed(0);
      const label = ALL_ACTION_LABELS[action] || action;
      const isUser = action === userAction;

      let barColor = 'var(--accent-primary)';
      if (action === 'fold') barColor = 'var(--accent-danger)';
      else if (action === 'check') barColor = 'var(--accent-warning)';
      else if (['raise', 'bet_large', '3bet', '4bet'].includes(action)) barColor = 'var(--accent-success)';

      const evDisplay = ev !== null ? `<span class="ev-badge ${ev >= 0 ? 'positive' : 'negative'}">EV: ${ev >= 0 ? '+' : ''}${ev.toFixed(2)}BB</span>` : '';
      const userMarker = isUser ? '<span class="user-choice-marker">← あなた</span>' : '';

      return `<div class="ev-bar-row ${isUser ? 'user-selected' : ''}">
                <div class="ev-bar-header">
                    <span class="ev-bar-label">${label}</span>
                    <span class="ev-bar-stats">${pct}% ${evDisplay} ${userMarker}</span>
                </div>
                <div class="ev-bar-track">
                    <div class="ev-bar-fill" style="width:${(freq / maxFreq * 100).toFixed(0)}%;background:${barColor};"></div>
                </div>
                ${reason ? `<div class="ev-bar-reason">${reason}</div>` : ''}
            </div>`;
    }).join('');

    return `<div class="ev-comparison-container">
            <div class="ev-comparison-title">📊 各アクションのEV比較</div>
            ${bars}
        </div>`;
  }

  // === 互換性: 古い形式の頻度バーチャートも対応 ===

  function buildFrequencyBars(frequencies) {
    if (!frequencies || Object.keys(frequencies).length === 0) return '';
    // 新形式（オブジェクト）か旧形式（数値）かを判定
    const firstVal = Object.values(frequencies)[0];
    if (typeof firstVal === 'object') {
      return buildEVComparisonBars(frequencies);
    }

    // 旧形式
    const entries = Object.entries(frequencies)
      .filter(([k, v]) => v > 0 && !k.includes('ev'))
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) return '';

    const bars = entries.map(([action, freq]) => {
      const pct = (freq * 100).toFixed(0);
      const label = ALL_ACTION_LABELS[action] || action;
      let barColor = 'var(--accent-primary)';
      if (action === 'fold') barColor = 'var(--accent-danger)';
      else if (action === 'check') barColor = 'var(--accent-warning)';
      else if (['raise', 'bet_large', '3bet', '4bet'].includes(action)) barColor = 'var(--accent-success)';

      return `<div class="freq-bar-row">
                <span class="freq-label">${label}</span>
                <div class="freq-bar-track">
                    <div class="freq-bar-fill" style="width:${pct}%;background:${barColor};">${pct}%</div>
                </div>
            </div>`;
    }).join('');

    return `<div class="freq-bar-container">
            <div class="freq-bar-title">📊 GTO頻度分布</div>
            ${bars}
        </div>`;
  }

  /** 直前のストリート結果をコンパクト表示（ゲーム画面内） */
  function showPreflopMiniResult(result) {
    const mini = document.getElementById('preflop-mini-result');
    if (!mini) return;
    const emoji = result.grade === 'correct' ? '✅' : result.grade === 'mixed' ? '🟡' : '❌';
    const streetLabel = STREET_LABELS[result.street] || 'プリフロップ';
    const label = ALL_ACTION_LABELS[result.userAction] || result.userAction;
    mini.innerHTML = `<span>${emoji} ${streetLabel}: ${label}</span>`;
    mini.style.display = 'block';
  }

  // === v2: ストリート間フィードバック（EV比較 + なぜダメなのか） ===

  function showStreetFeedback(evaluation, street, nextCallback) {
    const emoji = evaluation.grade === 'correct' ? '✅' : evaluation.grade === 'mixed' ? '🟡' : '❌';
    const streetLabel = STREET_LABELS[street] || street;
    const actionLabel = ALL_ACTION_LABELS[evaluation.userAction] || evaluation.userAction;
    const gtoLabel = ALL_ACTION_LABELS[evaluation.gtoAction] || evaluation.gtoAction;

    const overlay = document.getElementById('street-feedback-overlay');
    if (!overlay) { nextCallback(); return; }

    // v2: EV比較バーチャート（全アクションの理由つき）
    const evBarsHtml = buildEVComparisonBars(evaluation.actions, evaluation.userAction);

    // v2: 「なぜダメなのか」カード
    let whyWrongHtml = '';
    if (evaluation.whyPlayerWrong && !evaluation.match) {
      whyWrongHtml = `<div class="why-wrong-card">
                <div class="why-wrong-header">❌ なぜこの選択がダメなのか</div>
                <p class="why-wrong-text">${evaluation.whyPlayerWrong}</p>
            </div>`;
    }

    // v2: 最適アクションの理由
    let whyBestHtml = '';
    if (evaluation.whyBest) {
      whyBestHtml = `<div class="why-best-card">
                <div class="why-best-header">✅ 最適アクションの理由</div>
                <p class="why-best-text">${evaluation.whyBest}</p>
            </div>`;
    }

    // v2: キーインサイト
    let insightHtml = '';
    if (evaluation.keyInsight) {
      insightHtml = `<div class="key-insight-card">
                <div class="key-insight-icon">💡</div>
                <p class="key-insight-text">${evaluation.keyInsight}</p>
            </div>`;
    }

    // EVロス表示
    const evLossHtml = evaluation.evLoss > 0
      ? `<div class="sf-ev-loss">EVロス: <strong>-${evaluation.evLoss.toFixed(2)} BB</strong></div>`
      : `<div class="sf-ev-perfect">✨ EVロスなし</div>`;

    // v2 NEW: 詳細解説セクション（もっと詳しく）
    let deepDiveHtml = '';
    const hasDeepDive = evaluation.handStrength || evaluation.boardAnalysis || evaluation.equityEstimate || evaluation.rangeConsideration;
    if (hasDeepDive) {
      deepDiveHtml = `<details class="deep-dive-section">
                <summary class="deep-dive-trigger">🔍 もっと詳しく</summary>
                <div class="deep-dive-content">
                    ${evaluation.handStrength ? `
                    <div class="deep-dive-item">
                        <div class="deep-dive-label">🃏 ハンド強度</div>
                        <p>${evaluation.handStrength}</p>
                    </div>` : ''}
                    ${evaluation.boardAnalysis ? `
                    <div class="deep-dive-item">
                        <div class="deep-dive-label">🎲 ボードテクスチャ</div>
                        <p>${evaluation.boardAnalysis}</p>
                    </div>` : ''}
                    ${evaluation.equityEstimate ? `
                    <div class="deep-dive-item">
                        <div class="deep-dive-label">📈 エクイティ</div>
                        <p>${evaluation.equityEstimate}</p>
                    </div>` : ''}
                    ${evaluation.rangeConsideration ? `
                    <div class="deep-dive-item">
                        <div class="deep-dive-label">♠️ レンジバランス</div>
                        <p>${evaluation.rangeConsideration}</p>
                    </div>` : ''}
                </div>
            </details>`;
    }

    overlay.innerHTML = `
        <div class="street-feedback glass-card sf-detailed">
            <div class="sf-header">
                <span class="sf-emoji">${emoji}</span>
                <span class="sf-street-label">${streetLabel}</span>
            </div>

            <div class="sf-action-compare">
                <div class="sf-action-box sf-action-yours ${evaluation.match ? 'correct' : 'wrong'}">
                    <div class="sf-action-label">あなた</div>
                    <div class="sf-action-value">${actionLabel}</div>
                </div>
                <div class="sf-action-arrow">${evaluation.match ? '=' : '→'}</div>
                <div class="sf-action-box sf-action-gto">
                    <div class="sf-action-label">GTO</div>
                    <div class="sf-action-value">${gtoLabel}</div>
                </div>
            </div>

            ${evLossHtml}
            ${whyWrongHtml}
            ${whyBestHtml}
            ${evBarsHtml}
            ${insightHtml}
            ${deepDiveHtml}

            <button class="btn btn-primary sf-next-btn" onclick="UI.dismissStreetFeedback()">
                次のストリートへ →
            </button>
        </div>`;
    overlay.style.display = 'flex';
    overlay._nextCallback = nextCallback;
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

  // === v2: フル結果画面（ショーダウン + 詳細EV解説） ===

  function renderFullResult(data) {
    const panel = document.getElementById('feedback-panel');
    if (!panel) return;

    const { lastEvaluation, hand, position, villainPosition, scenario,
      streetResults, totalEvLoss, allMatch, boardCards,
      villainCards, actionHistory, endReason } = data;

    // v2: ヴィランカード表示
    let villainCardsHtml = '';
    if (villainCards && villainCards.length === 2) {
      const villainHand = GTO.normalizeHand(villainCards[0], villainCards[1]);
      villainCardsHtml = `
        <div class="showdown-section">
            <div class="showdown-title">🎭 ショーダウン</div>
            <div class="showdown-cards">
                <div class="showdown-player">
                    <div class="showdown-label">あなた (${position})</div>
                    <div class="showdown-hand">${createCardHTML(data.heroCards?.[0] || '', true)} ${createCardHTML(data.heroCards?.[1] || '', true)}</div>
                    <div class="showdown-hand-name">${hand}</div>
                </div>
                <div class="showdown-vs">VS</div>
                <div class="showdown-player">
                    <div class="showdown-label">ヴィラン (${villainPosition || '?'})</div>
                    <div class="showdown-hand">${createCardHTML(villainCards[0], true)} ${createCardHTML(villainCards[1], true)}</div>
                    <div class="showdown-hand-name">${villainHand}</div>
                </div>
            </div>
        </div>`;
    }

    // ボードカード表示
    let boardHtml = '';
    if (boardCards && boardCards.length > 0) {
      boardHtml = `<div class="board-display-result">${boardCards.map(c => createCardHTML(c, true)).join('')}</div>`;
    }

    // 終了理由
    let endReasonHtml = '';
    if (endReason === 'villain_fold') {
      endReasonHtml = `<div class="end-reason-card">🎭 ヴィランがフォールドしました。あなたの勝ちです！</div>`;
    }

    // v2: ストリート別結果（全アクションEV + なぜダメなのか）
    const streetSummaryHtml = streetResults.map((r, idx) => {
      const emoji = r.grade === 'correct' ? '✅' : r.grade === 'mixed' ? '🟡' : '❌';
      const streetLabel = STREET_LABELS[r.street] || r.street;
      const userLabel = ALL_ACTION_LABELS[r.userAction] || r.userAction;
      const gtoLabel = ALL_ACTION_LABELS[r.gtoAction] || r.gtoAction;

      // v2: 詳細展開（EV比較 + 理由）
      // AI非同期取得のため、詳細コンテナは常に描画する
      let detailsHtml = '';
      const hasDetails = true;
      if (hasDetails) {
        const evBarsHtml = r.actions ? buildEVComparisonBars(r.actions, r.userAction) : '';

        detailsHtml = `<details class="street-detail-expand" id="details-expand-${r.street}">
                    <summary class="street-detail-trigger">📊 詳細を見る</summary>
                    <div class="street-detail-content" id="street-detail-content-${r.street}">
                        <div id="ai-feedback-top-${r.street}">
                            <div style="font-size:0.85rem; color:var(--accent-info); margin-bottom:8px;">
                                🔄 AIがさらに詳しい解説を生成中...
                            </div>
                            ${r.whyPlayerWrong && !r.match ? `
                            <div class="why-wrong-inline">
                                <strong>❌ なぜダメなのか:</strong> ${r.whyPlayerWrong}
                            </div>` : ''}

                            ${r.whyBest ? `
                            <div class="why-best-inline">
                                <strong>✅ 最適な理由:</strong> ${r.whyBest}
                            </div>` : ''}
                        </div>

                        ${evBarsHtml}

                        <div id="ai-feedback-bottom-${r.street}">
                            ${r.keyInsight ? `
                            <div class="key-insight-inline">
                                <strong>💡 ポイント:</strong> ${r.keyInsight}
                            </div>` : ''}

                            ${r.handStrength || r.boardAnalysis || r.equityEstimate || r.rangeConsideration ? `
                            <div class="deep-dive-content" style="margin-top:8px;">
                                ${r.handStrength ? `<div class="deep-dive-item"><div class="deep-dive-label">🃏 ハンド強度</div><p>${r.handStrength}</p></div>` : ''}
                                ${r.boardAnalysis ? `<div class="deep-dive-item"><div class="deep-dive-label">🎲 ボード分析</div><p>${r.boardAnalysis}</p></div>` : ''}
                                ${r.equityEstimate ? `<div class="deep-dive-item"><div class="deep-dive-label">📈 エクイティ</div><p>${r.equityEstimate}</p></div>` : ''}
                                ${r.rangeConsideration ? `<div class="deep-dive-item"><div class="deep-dive-label">♠️ レンジ</div><p>${r.rangeConsideration}</p></div>` : ''}
                            </div>` : ''}
                        </div>
                    </div>
                </details>`;
      }

      return `<div class="street-result-item ${r.match ? 'correct' : 'incorrect'}">
                <div class="street-result-header">
                    <span class="street-result-label">${emoji} <strong>${streetLabel}</strong></span>
                    <span class="street-result-action">
                        ${userLabel} ${r.match ? '' : `→ <span class="gto-action">${gtoLabel}</span>`}
                        ${r.evLoss > 0 ? `<span class="ev-loss-badge">-${r.evLoss.toFixed(2)}BB</span>` : ''}
                    </span>
                </div>
                ${detailsHtml}
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

      ${endReasonHtml}

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
      ${villainCardsHtml}

      <div class="street-results-section">
        <h4 class="section-title">📋 ストリート別結果</h4>
        ${streetSummaryHtml}
      </div>

      <div id="ai-hand-review-section" style="margin-top:12px;">
        <div class="ai-loading-inline" style="font-size:0.9rem; color:var(--accent-info); text-align:center; padding:12px; border:1px dashed var(--accent-info); border-radius:8px;">
          🤖 AIコーチがハンドを総合分析中...
        </div>
      </div>
    `;
  }

  /** v2: AIハンドレビューを結果画面に追記（強化版） */
  function appendAIHandReview(review, errMsg = null) {
    const section = document.getElementById('ai-hand-review-section');
    if (!section) return;

    if (!review) {
      const msg = errMsg ? `⚠️ ${errMsg}` : '⚠️ AI総合評価の生成に失敗しました（タイムアウト等）';
      section.innerHTML = `
        <div style="padding:16px; background:var(--bg-secondary); border-radius:12px; border-left:4px solid var(--accent-warning); margin-top:16px;">
          <h4 style="margin:0 0 8px 0; color:var(--text-primary); font-size:1rem;">${msg}</h4>
          <p style="margin:0; font-size:0.85rem; color:var(--text-muted); line-height:1.4;">お手数ですが再度お試しください。</p>
        </div>
      `;
      return;
    }

    const gradeEmoji = { A: '🏆', B: '👍', C: '📝', D: '⚠️', F: '❌' }[review.overallGrade] || '📊';

    section.innerHTML = `
        <div class="ai-hand-review">
            <div class="ai-review-header">
                <span>${gradeEmoji}</span>
                <span>AIコーチの総合評価</span>
                <span class="ai-grade-badge grade-${(review.overallGrade || 'C').toLowerCase()}">${review.overallGrade}</span>
            </div>
            ${review.summary ? `<p class="ai-review-summary">${review.summary}</p>` : ''}

            ${review.keyMistake ? `
            <div class="ai-review-item mistake">
                <div class="ai-review-item-label">⚠️ 最大のミス</div>
                <p>${review.keyMistake}</p>
            </div>` : ''}

            ${review.keyLearning ? `
            <div class="ai-review-item">
                <div class="ai-review-item-label">📚 学びのポイント</div>
                <p>${review.keyLearning}</p>
            </div>` : ''}

            ${review.improvementTip ? `
            <div class="ai-review-item">
                <div class="ai-review-item-label">💡 次回のアドバイス</div>
                <p>${review.improvementTip}</p>
            </div>` : ''}

            ${review.boardAnalysis ? `
            <div class="ai-review-item">
                <div class="ai-review-item-label">🎲 ボード分析</div>
                <p>${review.boardAnalysis}</p>
            </div>` : ''}
        </div>`;
    section.style.display = 'block';
  }

  // === セッションサマリー ===

  function renderSessionSummary(sessionData, results) {
    const container = document.getElementById('session-summary-content');
    if (!container) return;

    const perfectRate = sessionData.hands > 0
      ? (sessionData.perfectHands / sessionData.hands * 100).toFixed(0)
      : 0;

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
    if (data.villainPosition !== undefined) {
      const el = document.getElementById('game-villain-pos');
      if (el) el.innerHTML = positionBadgeHTML(data.villainPosition);
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
      textEl.innerHTML = text;
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

    // v2: Advanced Stats (VPIP/PFR/Street Miss)
    const adv = Stats.getAdvancedStats();
    if (adv) {
      const vpipEl = document.getElementById('stat-vpip');
      if (vpipEl) vpipEl.textContent = adv.vpip !== '-' ? `${adv.vpip}%` : '—';

      const pfrEl = document.getElementById('stat-pfr');
      if (pfrEl) pfrEl.textContent = adv.pfr !== '-' ? `${adv.pfr}%` : '—';

      const msPreflopEl = document.getElementById('stat-miss-preflop');
      if (msPreflopEl) msPreflopEl.textContent = adv.streetStats.preflop || '0.0%';

      const msFlopEl = document.getElementById('stat-miss-flop');
      if (msFlopEl) msFlopEl.textContent = adv.streetStats.flop || '0.0%';

      const msTurnEl = document.getElementById('stat-miss-turn');
      if (msTurnEl) msTurnEl.textContent = adv.streetStats.turn || '0.0%';

      const msRiverEl = document.getElementById('stat-miss-river');
      if (msRiverEl) msRiverEl.textContent = adv.streetStats.river || '0.0%';
    }

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

  /** v2: AIの一括分析結果を各ストリートの詳細エリアに反映する */
  function updateAIDetailedAnalysis(aiResults, errMsg = null) {
    if (!aiResults) {
      // AI分析失敗時：すべてのローディング表示をエラーメッセージに置換
      const msg = errMsg ? `⚠️ ${errMsg}` : '⚠️ AI解説の生成に失敗しました（タイムアウト等）';
      const loadingEls = document.querySelectorAll('div[id^="ai-feedback-top-"]');
      loadingEls.forEach(el => {
        el.innerHTML = `<div style="font-size:0.85rem; color:var(--accent-warning); margin-bottom:8px;">${msg}</div>`;
      });
      return;
    }

    for (const [street, details] of Object.entries(aiResults)) {
      const topDiv = document.getElementById(`ai-feedback-top-${street}`);
      const bottomDiv = document.getElementById(`ai-feedback-bottom-${street}`);

      if (topDiv) {
        topDiv.innerHTML = `
            ${details.whyPlayerWrong ? `
            <div class="why-wrong-inline">
                <strong>❌ なぜダメなのか:</strong> ${details.whyPlayerWrong}
            </div>` : ''}

            ${details.whyBest ? `
            <div class="why-best-inline">
                <strong>✅ 最適な理由:</strong> ${details.whyBest}
            </div>` : ''}
        `;
      }

      if (bottomDiv) {
        bottomDiv.innerHTML = `
            ${details.keyInsight ? `
            <div class="key-insight-inline">
                <strong>💡 ポイント:</strong> ${details.keyInsight}
            </div>` : ''}

            ${details.handStrength || details.boardAnalysis || details.equityEstimate || details.rangeConsideration ? `
            <div class="deep-dive-content" style="margin-top:8px;">
                ${details.handStrength ? `<div class="deep-dive-item"><div class="deep-dive-label">🃏 ハンド強度</div><p>${details.handStrength}</p></div>` : ''}
                ${details.boardAnalysis ? `<div class="deep-dive-item"><div class="deep-dive-label">🎲 ボード分析</div><p>${details.boardAnalysis}</p></div>` : ''}
                ${details.equityEstimate ? `<div class="deep-dive-item"><div class="deep-dive-label">📈 エクイティ</div><p>${details.equityEstimate}</p></div>` : ''}
                ${details.rangeConsideration ? `<div class="deep-dive-item"><div class="deep-dive-label">♠️ レンジ</div><p>${details.rangeConsideration}</p></div>` : ''}
            </div>` : ''}
        `;
      }
    }
  }

  // === 公開API ===
  return {
    showScreen,
    toggleSelect,
    getToggleValue,
    showToast,
    showAILoading,
    createCardHTML,
    displayHeroCards,
    displayVillainCards,
    displayBoard,
    clearBoard,
    positionBadgeHTML,
    renderActionButtons,
    showPreflopMiniResult,
    showStreetFeedback,
    dismissStreetFeedback,
    renderFullResult,
    appendAIHandReview,
    updateAIDetailedAnalysis,
    renderSessionSummary,
    updateGameInfo,
    showVillainAction,
    hideVillainAction,
    updateHomeStats,
    updateStatsScreen
  };
})();
