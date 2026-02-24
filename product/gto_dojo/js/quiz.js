/**
 * GTO Dojo — クイズモジュール
 * ランダムハンド出題、制限時間、スコア管理
 */

const Quiz = (() => {
    let state = {
        active: false,
        mode: 'preflop',     // 'preflop' or 'postflop'
        questionNum: 0,
        totalQuestions: 10,
        score: 0,
        streak: 0,
        bestStreak: 0,
        timeLeft: 0,
        timerId: null,
        timerEnabled: true,
        timePerQuestion: 15,
        results: [],
        currentQuestion: null
    };

    // === クイズ開始 ===

    function start() {
        state.mode = UI.getToggleValue('quizMode') || 'preflop';
        state.totalQuestions = parseInt(UI.getToggleValue('quizCount') || '10');
        state.timerEnabled = UI.getToggleValue('quizTimer') !== 'off';
        state.timePerQuestion = parseInt(UI.getToggleValue('quizTimer') || '15');
        state.active = true;
        state.questionNum = 0;
        state.score = 0;
        state.streak = 0;
        state.bestStreak = 0;
        state.results = [];

        if (!GTO.isLoaded()) {
            UI.showToast('GTOデータ読み込み中...');
            GTO.loadRanges().then(() => nextQuestion());
        } else {
            nextQuestion();
        }
    }

    // === 次の問題 ===

    function nextQuestion() {
        state.questionNum++;
        if (state.questionNum > state.totalQuestions) {
            finishQuiz();
            return;
        }

        // タイマーリセット
        clearTimer();

        // 問題生成
        if (state.mode === 'preflop') {
            generatePreflopQuestion();
        } else {
            generatePostflopQuestion();
        }

        // 画面表示
        UI.showScreen('quiz-game-screen');
        renderQuestion();

        // タイマー開始
        if (state.timerEnabled) {
            startTimer();
        }
    }

    // === プリフロップ問題生成 ===

    function generatePreflopQuestion() {
        const positions = GTO.POSITIONS_6MAX;
        const deck = GTO.shuffle(GTO.createDeck());
        const heroCards = [deck[0], deck[1]];
        const hand = GTO.normalizeHand(heroCards[0], heroCards[1]);
        const position = positions[Math.floor(Math.random() * positions.length)];

        // シナリオ決定
        const scenarios = ['RFI'];
        if (position !== 'UTG') scenarios.push('vs_RFI');
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        let raiserPosition = '';
        if (scenario === 'vs_RFI') {
            const heroIdx = positions.indexOf(position);
            const possible = positions.filter((p, i) => i < heroIdx && p !== 'SB' && p !== 'BB');
            raiserPosition = possible.length > 0
                ? possible[Math.floor(Math.random() * possible.length)]
                : 'BTN';
        }

        // 正解取得
        let gtoResult;
        if (scenario === 'RFI') {
            gtoResult = GTO.getRFIAction(hand, position);
        } else {
            gtoResult = GTO.getVsRFIAction(hand, position, raiserPosition);
        }

        // 選択肢生成
        let options;
        if (scenario === 'RFI') {
            options = [
                { action: 'fold', label: 'フォールド' },
                { action: 'raise', label: 'レイズ' }
            ];
        } else {
            options = [
                { action: 'fold', label: 'フォールド' },
                { action: 'call', label: 'コール' },
                { action: '3bet', label: '3ベット' }
            ];
        }

        state.currentQuestion = {
            type: 'preflop',
            heroCards, hand, position, scenario, raiserPosition,
            gtoResult,
            correctAction: gtoResult ? gtoResult.recommended : 'fold',
            options,
            explanation: gtoResult ? gtoResult.explanation : ''
        };
    }

    // === ポストフロップ問題生成 ===

    function generatePostflopQuestion() {
        const deck = GTO.shuffle(GTO.createDeck());
        const heroCards = [deck[0], deck[1]];
        const boardCards = [deck[2], deck[3], deck[4]];
        const streets = ['flop', 'turn', 'river'];
        const street = streets[Math.floor(Math.random() * streets.length)];

        if (street === 'turn') boardCards.push(deck[5]);
        if (street === 'river') { boardCards.push(deck[5]); boardCards.push(deck[6]); }

        const positions = ['BTN', 'CO', 'HJ', 'BB'];
        const position = positions[Math.floor(Math.random() * positions.length)];
        const facingBet = Math.random() < 0.4;

        const gtoResult = GTO.getPostflopAction(heroCards, boardCards, street, position, facingBet, true);

        let options;
        if (facingBet) {
            options = [
                { action: 'fold', label: 'フォールド' },
                { action: 'call', label: 'コール' },
                { action: 'raise', label: 'レイズ' }
            ];
        } else {
            options = [
                { action: 'check', label: 'チェック' },
                { action: 'bet_small', label: 'ベット小' },
                { action: 'bet_large', label: 'ベット大' }
            ];
        }

        const streetLabels = { flop: 'フロップ', turn: 'ターン', river: 'リバー' };

        state.currentQuestion = {
            type: 'postflop',
            heroCards, boardCards, position, street, facingBet,
            gtoResult,
            correctAction: gtoResult ? gtoResult.recommended : 'check',
            options,
            streetLabel: streetLabels[street],
            handLabel: gtoResult ? gtoResult.handLabel : '不明',
            boardLabel: gtoResult ? gtoResult.boardLabel : '不明',
            explanation: gtoResult ? gtoResult.explanation : ''
        };
    }

    // === 問題描画 ===

    function renderQuestion() {
        const q = state.currentQuestion;
        const container = document.getElementById('quiz-question-area');
        if (!container) return;

        // プログレス
        const progressEl = document.getElementById('quiz-progress');
        if (progressEl) {
            progressEl.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:0.8rem;color:var(--text-secondary);">問題 ${state.questionNum} / ${state.totalQuestions}</span>
                    <span style="font-family:var(--font-mono);font-weight:700;">スコア: ${state.score}</span>
                </div>
                <div style="height:4px;background:var(--bg-secondary);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${(state.questionNum / state.totalQuestions) * 100}%;background:var(--gradient-primary);border-radius:2px;transition:width 0.3s ease;"></div>
                </div>`;
        }

        // 問題内容
        let questionHtml = '';
        if (q.type === 'preflop') {
            const scenarioText = q.scenario === 'RFI'
                ? '全員フォールド、あなたの番です。'
                : `${q.raiserPosition} がオープンレイズ。`;

            questionHtml = `
                <div style="text-align:center;margin-bottom:12px;">
                    <div style="margin-bottom:8px;">${UI.positionBadgeHTML(q.position)}</div>
                    <div style="display:flex;gap:8px;justify-content:center;margin:12px 0;">
                        ${UI.createCardHTML(q.heroCards[0])} ${UI.createCardHTML(q.heroCards[1])}
                    </div>
                    <p style="font-size:0.85rem;color:var(--text-secondary);">${scenarioText}</p>
                    <p style="font-size:1rem;font-weight:600;margin-top:8px;">GTOの正しいアクションは？</p>
                </div>`;
        } else {
            const situationText = q.facingBet ? '相手がベット。あなたの番です。' : '相手はチェック。あなたの番です。';
            questionHtml = `
                <div style="text-align:center;margin-bottom:12px;">
                    <div style="margin-bottom:8px;">${UI.positionBadgeHTML(q.position)}
                        <span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">${q.streetLabel}</span>
                    </div>
                    <div style="display:flex;gap:8px;justify-content:center;margin:8px 0;">
                        ${UI.createCardHTML(q.heroCards[0])} ${UI.createCardHTML(q.heroCards[1])}
                    </div>
                    <div style="display:flex;gap:4px;justify-content:center;margin:8px 0;">
                        ${q.boardCards.map(c => UI.createCardHTML(c, true)).join('')}
                    </div>
                    <p style="font-size:0.8rem;color:var(--text-muted);">
                        ハンド: <strong>${q.handLabel}</strong> / ボード: <strong>${q.boardLabel}</strong>
                    </p>
                    <p style="font-size:0.85rem;color:var(--text-secondary);">${situationText}</p>
                    <p style="font-size:1rem;font-weight:600;margin-top:8px;">GTOの正しいアクションは？</p>
                </div>`;
        }

        container.innerHTML = questionHtml;

        // 選択肢ボタン
        const btnContainer = document.getElementById('quiz-answer-buttons');
        if (btnContainer) {
            btnContainer.innerHTML = q.options.map(opt => `
                <button class="action-btn quiz-option" data-action="${opt.action}"
                    onclick="Quiz.submitAnswer('${opt.action}')">
                    <span>${opt.label}</span>
                </button>
            `).join('');
        }

        // タイマー表示
        updateTimerDisplay();
    }

    // === 回答処理 ===

    function submitAnswer(action) {
        clearTimer();
        const q = state.currentQuestion;
        const correct = action === q.correctAction;

        if (correct) {
            state.score += getScoreForStreak();
            state.streak++;
            if (state.streak > state.bestStreak) state.bestStreak = state.streak;
        } else {
            state.streak = 0;
        }

        state.results.push({
            questionNum: state.questionNum,
            hand: q.hand || GTO.normalizeHand(q.heroCards[0], q.heroCards[1]),
            position: q.position,
            type: q.type,
            userAction: action,
            correctAction: q.correctAction,
            correct
        });

        // 正解/不正解表示
        showAnswerFeedback(action, q.correctAction, correct, q.explanation);
    }

    function getScoreForStreak() {
        if (state.streak >= 5) return 150;
        if (state.streak >= 3) return 120;
        return 100;
    }

    // === タイムアウト ===

    function handleTimeout() {
        clearTimer();
        state.streak = 0;
        const q = state.currentQuestion;

        state.results.push({
            questionNum: state.questionNum,
            hand: q.hand || GTO.normalizeHand(q.heroCards[0], q.heroCards[1]),
            position: q.position,
            type: q.type,
            userAction: 'timeout',
            correctAction: q.correctAction,
            correct: false
        });

        showAnswerFeedback('timeout', q.correctAction, false, q.explanation);
    }

    // === 回答フィードバック ===

    function showAnswerFeedback(userAction, correctAction, correct, explanation) {
        const actionLabels = {
            fold: 'フォールド', call: 'コール', raise: 'レイズ', check: 'チェック',
            '3bet': '3ベット', '4bet': '4ベット', bet_small: 'ベット小', bet_large: 'ベット大',
            timeout: '⏰ タイムアウト'
        };

        const emoji = correct ? '✅' : '❌';
        const msg = correct
            ? `正解！ +${getScoreForStreak()}pt ${state.streak >= 3 ? '🔥' + state.streak + '連続！' : ''}`
            : `不正解… 正解は「${actionLabels[correctAction] || correctAction}」`;

        const feedbackEl = document.getElementById('quiz-answer-feedback');
        if (feedbackEl) {
            feedbackEl.innerHTML = `
                <div class="glass-card" style="text-align:center;animation:slideUp 0.3s ease;">
                    <div style="font-size:2rem;margin-bottom:8px;">${emoji}</div>
                    <div style="font-size:1.1rem;font-weight:700;color:${correct ? 'var(--accent-success)' : 'var(--accent-danger)'};">
                        ${msg}
                    </div>
                    ${explanation ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin-top:8px;">💡 ${explanation}</p>` : ''}
                    <button class="btn btn-primary" style="margin-top:16px;width:100%;" onclick="Quiz.nextQuestion()">
                        ${state.questionNum < state.totalQuestions ? '次の問題 →' : '結果を見る 📊'}
                    </button>
                </div>`;
            feedbackEl.style.display = 'block';
        }

        // ボタン無効化
        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.action === correctAction) {
                btn.style.borderColor = 'var(--accent-success)';
                btn.style.background = 'rgba(16, 185, 129, 0.15)';
            }
            if (btn.dataset.action === userAction && !correct) {
                btn.style.borderColor = 'var(--accent-danger)';
                btn.style.background = 'rgba(239, 68, 68, 0.15)';
            }
        });
    }

    // === タイマー ===

    function startTimer() {
        state.timeLeft = state.timePerQuestion;
        updateTimerDisplay();
        state.timerId = setInterval(() => {
            state.timeLeft--;
            updateTimerDisplay();
            if (state.timeLeft <= 0) handleTimeout();
        }, 1000);
    }

    function clearTimer() {
        if (state.timerId) {
            clearInterval(state.timerId);
            state.timerId = null;
        }
    }

    function updateTimerDisplay() {
        const el = document.getElementById('quiz-timer');
        if (!el) return;
        if (!state.timerEnabled) {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';
        const pct = (state.timeLeft / state.timePerQuestion) * 100;
        const color = pct > 50 ? 'var(--accent-success)' : pct > 25 ? 'var(--accent-warning)' : 'var(--accent-danger)';
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-family:var(--font-mono);font-weight:700;font-size:1.2rem;color:${color};">${state.timeLeft}s</span>
                <div style="flex:1;height:4px;background:var(--bg-secondary);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width 1s linear;"></div>
                </div>
            </div>`;
    }

    // === クイズ終了 ===

    function finishQuiz() {
        state.active = false;
        clearTimer();

        const totalCorrect = state.results.filter(r => r.correct).length;
        const accuracy = state.totalQuestions > 0 ? (totalCorrect / state.totalQuestions * 100).toFixed(0) : 0;

        // 結果描画
        const container = document.getElementById('quiz-result-content');
        if (container) {
            const grade = accuracy >= 90 ? { emoji: '🏆', label: 'マスター', color: 'var(--accent-success)' }
                : accuracy >= 70 ? { emoji: '🥈', label: '上級者', color: 'var(--accent-secondary)' }
                    : accuracy >= 50 ? { emoji: '🥉', label: '中級者', color: 'var(--accent-warning)' }
                        : { emoji: '📚', label: '要復習', color: 'var(--accent-danger)' };

            const historyHtml = state.results.map(r => {
                const emoji = r.correct ? '✅' : '❌';
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;">
                    <span>${emoji} #${r.questionNum}
                        <strong style="font-family:var(--font-mono);">${r.hand}</strong>
                        ${UI.positionBadgeHTML(r.position)}
                    </span>
                </div>`;
            }).join('');

            container.innerHTML = `
                <div style="text-align:center;margin-bottom:var(--spacing-lg);">
                    <span style="font-size:3rem;">${grade.emoji}</span>
                    <h2 style="font-size:1.2rem;margin-top:8px;color:${grade.color};">${grade.label}</h2>
                </div>

                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${state.score}</span>
                        <span class="stat-label">スコア</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value ${parseFloat(accuracy) >= 70 ? 'positive' : 'negative'}">${accuracy}%</span>
                        <span class="stat-label">正答率</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${totalCorrect}/${state.totalQuestions}</span>
                        <span class="stat-label">正解数</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${state.bestStreak}🔥</span>
                        <span class="stat-label">最長連続</span>
                    </div>
                </div>

                <div class="glass-card" style="margin-top:var(--spacing-md);">
                    <h3 style="font-size:0.85rem;margin-bottom:8px;">回答履歴</h3>
                    ${historyHtml}
                </div>`;
        }

        UI.showScreen('quiz-result-screen');
    }

    // === 公開API ===
    return {
        start,
        nextQuestion,
        submitAnswer,
        getState: () => ({ ...state })
    };
})();
