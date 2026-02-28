/**
 * GTO Dojo v2 — ゲームエンジン
 * AIヴィラン対戦版: ヴィランに実際の手札を配り、AIが判断
 * ショーダウン、詳細解説、全アクションEV比較を搭載
 */

const Game = (() => {
    // === ゲーム状態 ===
    let state = {
        active: false,
        processing: false,
        mode: 'single',
        gameType: 'cash',
        tableSize: '6max',
        stackDepth: 100,
        currentStack: 100,
        handNum: 0,
        deck: [],
        heroCards: [],
        villainCards: [],    // v2: ヴィランの手札
        boardCards: [],
        heroPosition: '',
        villainPosition: '', // v2: ヴィランのポジション
        scenario: '',
        raiserPosition: '',
        pot: 1.5,
        street: 'preflop',
        isPreflpRaiser: false,
        facingBet: false,
        preflopResult: null,
        sessionResults: [],
        streetResults: [],
        actionHistory: [],   // v2: アクション履歴
        villainActedThisStreet: false,
    };

    const positions6max = GTO.POSITIONS_6MAX;

    // === ゲーム開始 ===

    function start() {
        state.gameType = UI.getToggleValue('gameType') || 'cash';
        state.tableSize = UI.getToggleValue('tableSize') || '6max';
        state.stackDepth = parseInt(UI.getToggleValue('stackDepth') || '100');
        state.mode = UI.getToggleValue('playMode') || 'single';
        state.active = true;
        state.handNum = 0;
        state.currentStack = state.stackDepth;
        state.sessionResults = [];

        // データ読み込み（フォールバック用）
        const promises = [];
        if (!GTO.isLoaded()) promises.push(GTO.loadRanges());
        if (!GTO.isPostflopLoaded()) promises.push(GTO.loadPostflopStrategies());

        if (promises.length > 0) {
            UI.showToast('GTOデータ読み込み中...');
            Promise.all(promises).then(() => dealNewHand());
        } else {
            dealNewHand();
        }
    }

    // === ハンド配布 ===

    function dealNewHand() {
        state.handNum++;
        state.street = 'preflop';
        state.preflopResult = null;
        state.streetResults = [];
        state.actionHistory = [];
        state.facingBet = false;
        state.isPreflpRaiser = false;
        state.processing = false;
        state.villainActedThisStreet = false;

        // デッキシャッフル
        state.deck = GTO.shuffle(GTO.createDeck());

        // ヒーローカード配布
        state.heroCards = [state.deck[0], state.deck[1]];
        // v2: ヴィランカード配布
        state.villainCards = [state.deck[7], state.deck[8]];
        state.boardCards = [];

        // ランダムポジション
        const positions = state.tableSize === '6max' ? positions6max : GTO.POSITIONS_9MAX;
        state.heroPosition = positions[Math.floor(Math.random() * positions.length)];

        // v2: ヴィランのポジション決定
        assignVillainPosition(positions);

        // シナリオ決定
        determineScenario();

        // 画面表示
        UI.showScreen('game-screen');
        UI.displayHeroCards(state.heroCards[0], state.heroCards[1]);
        UI.clearBoard();

        // ゲーム情報更新
        UI.updateGameInfo({
            handNum: state.handNum,
            position: state.heroPosition,
            villainPosition: state.villainPosition,
            street: 'プリフロップ',
            stack: state.mode === 'session' ? state.currentStack.toFixed(0) : state.stackDepth,
            pot: state.pot.toFixed(1)
        });

        setupScenarioUI();
    }

    // === v2: ヴィランポジション割り当て ===

    function assignVillainPosition(positions) {
        const posOrder = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
        const heroIdx = posOrder.indexOf(state.heroPosition);

        if (state.scenario === 'RFI') {
            // RFI: ヒーローがオープン → ヴィランはブラインド（BB or SB）
            const blinds = positions.filter(p => p === 'BB' || p === 'SB');
            state.villainPosition = blinds.length > 0
                ? blinds[Math.floor(Math.random() * blinds.length)]
                : 'BB';
        } else if (state.scenario === 'vs_RFI') {
            // vs_RFI: ヴィランがオープンレイズ済み → ヴィランはヒーローより前のポジション
            const earlierPositions = positions.filter(p => {
                const pIdx = posOrder.indexOf(p);
                return pIdx < heroIdx && p !== 'SB' && p !== 'BB';
            });
            state.villainPosition = earlierPositions.length > 0
                ? earlierPositions[Math.floor(Math.random() * earlierPositions.length)]
                : (state.raiserPosition || 'UTG');
        } else if (state.scenario === 'vs_3bet') {
            // vs_3bet: ヒーローがオープン後に3ベットされた → ヴィランはヒーローより後のポジションかブラインド
            const laterPositions = positions.filter(p => {
                const pIdx = posOrder.indexOf(p);
                return pIdx !== heroIdx && (pIdx > heroIdx || p === 'BB' || p === 'SB');
            });
            state.villainPosition = laterPositions.length > 0
                ? laterPositions[Math.floor(Math.random() * laterPositions.length)]
                : 'BB';
        } else {
            // フォールバック
            const otherPositions = positions.filter(p => p !== state.heroPosition);
            state.villainPosition = otherPositions[Math.floor(Math.random() * otherPositions.length)];
        }
    }

    // === シナリオ決定 ===

    function determineScenario() {
        const positions = state.tableSize === '6max' ? positions6max : GTO.POSITIONS_9MAX;
        const heroIdx = positions.indexOf(state.heroPosition);

        if (state.heroPosition === 'BB' || state.heroPosition === 'SB') {
            state.scenario = 'vs_RFI';
            const possibleRaisers = positions.filter((p, i) => i < heroIdx && p !== 'SB' && p !== 'BB');
            if (possibleRaisers.length > 0) {
                state.raiserPosition = possibleRaisers[Math.floor(Math.random() * possibleRaisers.length)];
                state.villainPosition = state.raiserPosition;
            } else {
                state.raiserPosition = 'BTN';
                state.villainPosition = 'BTN';
            }
            state.pot = 5.5;
            return;
        }

        const roll = Math.random();
        if (roll < 0.70) {
            state.scenario = 'RFI';
            state.raiserPosition = '';
            state.pot = 1.5;
        } else if (roll < 0.95) {
            state.scenario = 'vs_RFI';
            const possibleRaisers = positions.filter((p, i) => i < heroIdx && p !== 'SB' && p !== 'BB');
            if (possibleRaisers.length > 0) {
                state.raiserPosition = possibleRaisers[Math.floor(Math.random() * possibleRaisers.length)];
                state.villainPosition = state.raiserPosition;
                state.pot = 4.0;
            } else {
                state.scenario = 'RFI';
                state.raiserPosition = '';
                state.pot = 1.5;
            }
        } else {
            state.scenario = 'vs_3bet';
            state.raiserPosition = '';
            state.pot = 12.0;
        }
    }

    // === シナリオUI ===

    function setupScenarioUI() {
        if (state.scenario === 'RFI') {
            UI.hideVillainAction();
            UI.showVillainAction(`👤 あなたの前のプレイヤーは全員フォールドしました`);
            UI.renderActionButtons('RFI');
        } else if (state.scenario === 'vs_RFI') {
            UI.showVillainAction(`👤 ${state.raiserPosition} が2.5BBにレイズしました`);
            UI.renderActionButtons('vs_RFI');
        } else if (state.scenario === 'vs_3bet') {
            UI.showVillainAction(`👤 あなたの2.5xオープンに対して、相手が3ベット（8BB）しました`);
            UI.renderActionButtons('vs_3bet');
        }
    }

    // === アクション処理（エントリポイント） ===

    function handleAction(action) {
        if (state.processing) return;

        if (state.street === 'preflop') {
            handlePreflopAction(action);
        } else {
            handlePostflopAction(action);
        }
    }

    async function handlePreflopAction(action) {
        const hand = GTO.normalizeHand(state.heroCards[0], state.heroCards[1]);

        // アクション正規化
        if (state.scenario === 'vs_RFI' && (action === 'raise_small' || action === 'raise_large')) action = '3bet';
        if (state.scenario === 'vs_3bet' && (action === 'raise_small' || action === 'allin')) action = '4bet';

        state.processing = true;

        // アクション履歴に追加
        state.actionHistory.push({
            street: 'preflop',
            player: 'hero',
            action: action,
            position: state.heroPosition
        });

        // GTO即時判定（AIなし）
        let gtoResult;
        if (state.scenario === 'RFI') {
            gtoResult = GTO.getRFIAction(hand, state.heroPosition);
        } else if (state.scenario === 'vs_RFI') {
            gtoResult = GTO.getVsRFIAction(hand, state.heroPosition, state.raiserPosition);
        } else if (state.scenario === 'vs_3bet') {
            gtoResult = GTO.getVs3betAction(hand, state.heroPosition);
        }
        const evaluation = GTO.evaluateAction(action, gtoResult);

        state.processing = false;

        // 成績記録
        Stats.recordHand({
            match: evaluation.match,
            evLoss: evaluation.evLoss,
            position: state.heroPosition,
            spot: state.scenario
        });

        state.streetResults.push({
            street: 'preflop',
            ...evaluation
        });

        state.preflopResult = evaluation;

        // フォールドの場合はハンド終了
        const normalizedAction = evaluation.userAction || action;
        if (normalizedAction === 'fold') {
            finishHand(evaluation, hand);
            return;
        }

        // raiseした場合はヒーローがプリフロップレイザー
        if (['raise', '3bet', '4bet', 'raise_small', 'raise_large'].includes(normalizedAction)) {
            state.isPreflpRaiser = true;
        }

        // ポット更新
        if (state.scenario === 'RFI') {
            state.pot = 6.5;
        } else if (state.scenario === 'vs_RFI') {
            if (normalizedAction === 'call') state.pot = 7.0;
            if (normalizedAction === '3bet') state.pot = 20.0;
        } else if (state.scenario === 'vs_3bet') {
            if (normalizedAction === 'call') state.pot = 17.0;
            if (normalizedAction === '4bet') state.pot = 35.0;
        }

        // ポストフロップへ進む
        advanceToFlop(evaluation, hand);
    }

    // === ポストフロップ進行 ===

    async function advanceToFlop(preflopEval, hand) {
        state.street = 'flop';
        state.boardCards = [state.deck[2], state.deck[3], state.deck[4]];
        state.villainActedThisStreet = false;

        UI.showPreflopMiniResult(preflopEval);
        UI.displayBoard(state.boardCards);
        UI.updateGameInfo({
            street: 'フロップ',
            pot: state.pot.toFixed(1)
        });

        await decideVillainAction();
        setupPostflopUI();
    }

    async function advanceToTurn() {
        state.street = 'turn';
        state.boardCards.push(state.deck[5]);
        state.villainActedThisStreet = false;

        // 直前のストリート（フロップ）結果を表示
        const lastResult = state.streetResults[state.streetResults.length - 1];
        if (lastResult) UI.showPreflopMiniResult(lastResult);

        UI.displayBoard(state.boardCards);
        UI.updateGameInfo({
            street: 'ターン',
            pot: state.pot.toFixed(1)
        });

        await decideVillainAction();
        setupPostflopUI();
    }

    async function advanceToRiver() {
        state.street = 'river';
        state.boardCards.push(state.deck[6]);
        state.villainActedThisStreet = false;

        // 直前のストリート（ターン）結果を表示
        const lastResult = state.streetResults[state.streetResults.length - 1];
        if (lastResult) UI.showPreflopMiniResult(lastResult);

        UI.displayBoard(state.boardCards);
        UI.updateGameInfo({
            street: 'リバー',
            pot: state.pot.toFixed(1)
        });

        await decideVillainAction();
        setupPostflopUI();
    }

    // === v2: ヴィランアクション（AI + 手札ベース） ===

    async function decideVillainAction() {
        const relPos = GTO.getRelativePosition(state.heroPosition, state.isPreflpRaiser);

        if (relPos === 'OOP') {
            // OOP → 自分が先にアクション → ヴィランは後で
            state.facingBet = false;
            return;
        }

        // IPの場合、ヴィランが先にアクション
        UI.showAILoading(true, '🎭 ヴィランが考え中...');

        const villainResult = await AI.getVillainPostflopAction({
            villainCards: state.villainCards,
            boardCards: [...state.boardCards],
            street: state.street,
            villainPosition: state.villainPosition,
            heroPosition: state.heroPosition,
            isVillainRaiser: !state.isPreflpRaiser,
            potSize: state.pot,
            stackDepth: state.stackDepth,
            heroActedFirst: false,
            heroAction: null
        });

        UI.showAILoading(false);

        const villainAction = villainResult?.action || 'check';
        state.villainActedThisStreet = true;

        // アクション履歴に追加
        state.actionHistory.push({
            street: state.street,
            player: 'villain',
            action: villainAction,
            position: state.villainPosition,
            thinking: villainResult?.thinking || ''
        });

        if (villainAction === 'bet_small' || villainAction === 'bet_large') {
            state.facingBet = true;
        } else {
            state.facingBet = false;
        }
    }

    function setupPostflopUI() {
        if (state.facingBet) {
            const lastVillainAction = state.actionHistory.filter(a => a.player === 'villain' && a.street === state.street).pop();
            const betMultiplier = lastVillainAction?.action === 'bet_large' ? 0.66 : 0.33;
            const betSize = (state.pot * betMultiplier).toFixed(1);
            UI.showVillainAction(`🎭 ヴィランが ${betSize}BB ベットしました`);
            UI.renderActionButtons('facing_bet');
        } else {
            if (state.villainActedThisStreet) {
                UI.showVillainAction('🎭 ヴィランはチェックしました。あなたの番です。');
            } else {
                UI.showVillainAction('あなたが先にアクションです。');
            }
            UI.renderActionButtons('postflop_action');
        }
    }

    // === ポストフロップ アクション処理 ===

    async function handlePostflopAction(action) {
        state.processing = true;

        // アクション履歴に追加
        state.actionHistory.push({
            street: state.street,
            player: 'hero',
            action: action,
            position: state.heroPosition
        });

        // GTO即時判定（AIなし）
        const gtoResult = GTO.getPostflopAction(
            state.heroCards, state.boardCards, state.street,
            state.heroPosition, state.facingBet, state.isPreflpRaiser
        );
        const evaluation = GTO.evaluatePostflopAction(action, gtoResult, state.pot);

        state.processing = false;

        // ストリート結果記録
        state.streetResults.push({
            street: state.street,
            ...evaluation
        });

        // 成績記録
        Stats.recordHand({
            match: evaluation.match,
            evLoss: evaluation.evLoss,
            position: state.heroPosition,
            spot: `${state.scenario}_${state.street}`
        });

        // フォールドの場合はハンド終了
        if (action === 'fold') {
            const hand = GTO.normalizeHand(state.heroCards[0], state.heroCards[1]);
            finishHand(evaluation, hand);
            return;
        }

        // ポット更新
        if (action === 'bet_small' || action === 'call') {
            state.pot += state.pot * 0.33;
        } else if (action === 'bet_large' || action === 'raise') {
            state.pot += state.pot * 0.75;
        }

        // ヒーローがOOPでアクションした後、ヴィランの反応を処理
        const relPos = GTO.getRelativePosition(state.heroPosition, state.isPreflpRaiser);
        if (relPos === 'OOP' && action !== 'check') {
            // ヴィランの反応（コール/レイズ/フォールド）を決定
            await handleVillainResponse(action);
        }

        // 次のストリートへ（フィードバックなしで直接進む）
        if (state.street === 'flop') {
            advanceToTurn();
        } else if (state.street === 'turn') {
            advanceToRiver();
        } else if (state.street === 'river') {
            const hand = GTO.normalizeHand(state.heroCards[0], state.heroCards[1]);
            finishHand(evaluation, hand);
        }
    }

    // === v2: ヒーローベット後のヴィラン反応 ===

    async function handleVillainResponse(heroAction) {
        UI.showAILoading(true, '🎭 ヴィランが考え中...');

        const villainResult = await AI.getVillainPostflopAction({
            villainCards: state.villainCards,
            boardCards: [...state.boardCards],
            street: state.street,
            villainPosition: state.villainPosition,
            heroPosition: state.heroPosition,
            isVillainRaiser: !state.isPreflpRaiser,
            potSize: state.pot,
            stackDepth: state.stackDepth,
            heroActedFirst: true,
            heroAction: heroAction
        });

        UI.showAILoading(false);

        const villainAction = villainResult?.action || 'call';

        state.actionHistory.push({
            street: state.street,
            player: 'villain',
            action: villainAction,
            position: state.villainPosition,
            thinking: villainResult?.thinking || ''
        });

        // ヴィランのアクションを表示
        const actionLabels = {
            'fold': 'フォールド', 'call': 'コール', 'raise': 'レイズ',
            'check': 'チェック', 'bet_small': 'ベット小', 'bet_large': 'ベット大'
        };
        const villainLabel = actionLabels[villainAction] || villainAction;
        UI.showVillainAction(`🎭 ヴィランが ${villainLabel} しました`);

        if (villainAction === 'fold') {
            // ヴィランがフォールド → ハンド終了（ヒーロー勝利）
            const hand = GTO.normalizeHand(state.heroCards[0], state.heroCards[1]);
            const lastEval = state.streetResults[state.streetResults.length - 1];
            finishHand(lastEval || { match: true, evLoss: 0 }, hand, 'villain_fold');
        }
    }

    // === ストリート結果表示 ===

    function showStreetResult(evaluation, nextCallback) {
        UI.showStreetFeedback(evaluation, state.street, () => {
            nextCallback();
        });
    }

    // === v2: ハンド終了（ショーダウン + AI総合レビュー） ===

    async function finishHand(lastEvaluation, hand, endReason) {
        // 全ストリート結果集計
        const totalEvLoss = state.streetResults.reduce((sum, r) => sum + (r.evLoss || 0), 0);
        const allMatch = state.streetResults.every(r => r.match);
        const matchCount = state.streetResults.filter(r => r.match).length;

        // 連戦モードの場合スタック更新
        if (state.mode === 'session') {
            state.currentStack -= totalEvLoss;
        }

        // セッション結果に記録
        state.sessionResults.push({
            handNum: state.handNum,
            hand: hand,
            position: state.heroPosition,
            scenario: state.scenario,
            streets: state.streetResults.map(r => ({
                street: r.street,
                userAction: r.userAction,
                gtoAction: r.gtoAction,
                match: r.match,
                evLoss: r.evLoss
            })),
            totalEvLoss,
            allMatch,
            matchCount,
            totalStreets: state.streetResults.length
        });

        // v2: 結果画面を表示（ヴィラン手札 + 詳細EV解説）
        const resultData = {
            lastEvaluation,
            hand,
            heroCards: [...state.heroCards],
            position: state.heroPosition,
            villainPosition: state.villainPosition,
            scenario: state.scenario,
            streetResults: state.streetResults,
            totalEvLoss,
            allMatch,
            boardCards: [...state.boardCards],
            villainCards: [...state.villainCards],
            actionHistory: [...state.actionHistory],
            endReason: endReason || 'showdown'
        };

        UI.renderFullResult(resultData);
        UI.showScreen('result-screen');

        // v2: ハンド全体の成績を記録（VPIP/PFR計算用）
        Stats.recordFullHand(state);

        // 非同期でAI詳細解説と総合レビューを一括取得
        AI.analyzeFullHand(resultData).then(result => {
            if (result && !result.error && result.streetDetails) {
                UI.updateAIDetailedAnalysis(result.streetDetails);
                UI.appendAIHandReview(result.overallReview);
            } else {
                const errMsg = result && result.error ? result.error : null;
                UI.updateAIDetailedAnalysis(null, errMsg);
                UI.appendAIHandReview(null, errMsg);
            }
        }).catch(e => {
            console.error('[Game] AI feedback error:', e);
            UI.updateAIDetailedAnalysis(null, e.message);
            UI.appendAIHandReview(null, e.message);
        });
    }

    // === 次のハンド ===

    function nextHand() {
        if (state.mode === 'session' && state.currentStack <= 0) {
            UI.showToast('スタックがなくなりました！');
            endSession();
            return;
        }
        dealNewHand();
    }

    // === セッション終了 ===

    function endSession() {
        state.active = false;

        const totalHands = state.sessionResults.length;
        if (totalHands === 0) {
            UI.showScreen('home-screen');
            return;
        }

        const perfectHands = state.sessionResults.filter(r => r.allMatch).length;
        const totalStreetDecisions = state.sessionResults.reduce((sum, r) => sum + r.totalStreets, 0);
        const matchedDecisions = state.sessionResults.reduce((sum, r) => sum + r.matchCount, 0);
        const totalEvLoss = state.sessionResults.reduce((sum, r) => sum + r.totalEvLoss, 0);

        const sessionData = {
            id: Date.now(),
            date: new Date().toISOString(),
            gameType: state.gameType,
            tableSize: state.tableSize,
            stackDepth: state.stackDepth,
            mode: state.mode,
            hands: totalHands,
            perfectHands,
            gtoRate: totalStreetDecisions > 0 ? (matchedDecisions / totalStreetDecisions * 100).toFixed(1) : 0,
            evLoss: totalEvLoss.toFixed(2),
            decisions: totalStreetDecisions
        };

        Stats.saveSession(sessionData);

        UI.renderSessionSummary(sessionData, state.sessionResults);
        UI.showScreen('session-summary-screen');
    }

    // === フォールバック解説生成関数群 ===

    function getHandCategory(hand) {
        if (!hand) return 'unknown';
        const rank1 = hand[0], rank2 = hand.length > 1 ? hand[1] : '';
        const suited = hand.includes('s');
        const pair = rank1 === rank2;
        const highRanks = 'AKQJ';
        const premiumPairs = 'AA KK QQ JJ'.split(' ');
        const medPairs = 'TT 99 88 77'.split(' ');
        const lowPairs = '66 55 44 33 22'.split(' ');

        if (premiumPairs.includes(hand.substring(0, 2))) return 'premium_pair';
        if (pair && medPairs.some(p => hand.startsWith(p))) return 'medium_pair';
        if (pair) return 'small_pair';
        if (rank1 === 'A' && rank2 === 'K') return 'premium_broadway';
        if (highRanks.includes(rank1) && highRanks.includes(rank2)) return suited ? 'broadway_suited' : 'broadway_offsuit';
        if (rank1 === 'A' && suited) return 'ace_suited';
        if (rank1 === 'A') return 'ace_offsuit';
        if (suited) {
            const gap = 'AKQJT98765432'.indexOf(rank1) - 'AKQJT98765432'.indexOf(rank2);
            if (gap <= 2) return 'suited_connector';
            return 'suited_gapper';
        }
        return 'trash';
    }

    function buildHandStrengthDesc(hand) {
        const cat = getHandCategory(hand);
        const descs = {
            'premium_pair': `${hand}はプレミアムポケットペアです。プリフロップで最も強いハンドの一つであり、ほぼ全てのポジションからレイズ/リレイズが推奨されます。`,
            'medium_pair': `${hand}はミドルポケットペアです。セットマイニングの価値が高く、ポジションがあれば積極的にプレイできますが、大きなレイズに対してはコールに留めることが多いです。`,
            'small_pair': `${hand}はスモールポケットペアです。主にセットマイニング目的でプレイします。フロップでセットが完成する確率は約11.8%で、インプライドオッズが重要になります。`,
            'premium_broadway': `${hand}はプレミアムブロードウェイハンドです。スーテッドでもオフスーテッドでも非常に強い手で、レイズ/3ベットの候補です。`,
            'broadway_suited': `${hand}はスーテッドブロードウェイです。ハイカードの強さに加え、フラッシュやストレートのドロー可能性があり、プレイアビリティが高いです。`,
            'broadway_offsuit': `${hand}はオフスーテッドブロードウェイです。ハイカードの強さはありますが、スーテッドと比べてポストフロップでのプレイアビリティが劣るため、ポジションが重要になります。`,
            'ace_suited': `${hand}はスーテッドAceです。ナッツフラッシュの可能性があり、トップペア+キッカーの可能性も高いため、多くの状況で積極的にプレイできます。`,
            'ace_offsuit': `${hand}はオフスーテッドAceです。トップペアの可能性はありますが、キッカーの問題やドミネートされるリスクがあります。ポジションによって大きくプレイが変わります。`,
            'suited_connector': `${hand}はスーテッドコネクターです。ストレート、フラッシュ、ツーペアなど多くの可能性がありますが、ハイカードとしての強さは低いため、ポジションとインプライドオッズが重要です。`,
            'suited_gapper': `${hand}はスーテッドギャッパーです。フラッシュのドロー可能性はありますが、ストレート完成の確率はコネクターより低く、慎重なプレイが必要です。`,
            'trash': `${hand}は弱いハンドです。ほとんどの状況でフォールドが推奨されます。このようなハンドでポットに参加することは、長期的に損失につながります。`
        };
        return descs[cat] || `${hand}は標準的なハンドです。`;
    }

    function buildFallbackWhyBest(hand, position, scenario, gtoAction, raiserPos) {
        const cat = getHandCategory(hand);
        const posLabel = { 'UTG': 'UTG（最もアーリー）', 'HJ': 'ハイジャック', 'CO': 'カットオフ', 'BTN': 'ボタン（最もレイト）', 'SB': 'スモールブラインド', 'BB': 'ビッグブラインド' }[position] || position;

        if (scenario === 'RFI') {
            if (gtoAction === 'raise') {
                return `${posLabel}からの${hand}はオープンレイズが推奨されます。` +
                    (cat === 'premium_pair' ? 'プレミアムハンドでリンプインは、相手に安くフロップを見せることになり、本来得られるべきバリューを逃してしまいます。レイズでポットを作り、相手のコールミスから利益を得ましょう。' :
                        cat.includes('pair') ? 'ポケットペアはポジションがあればオープンレイズで積極的にプレイできます。フロップでのセットメイクに加え、ポストフロップでのブラフ候補としても機能します。' :
                            cat.includes('broadway') || cat.includes('ace') ? 'ハイカードの強さがあるため、レイズでプリフロップのイニシアチブを取ることが重要です。ポストフロップでのC-betも効果的に打てます。' :
                                cat === 'suited_connector' ? 'スーテッドコネクターはレイトポジションからのオープンに適しています。ポジションアドバンテージとドロー可能性を活かしたプレイが可能です。' :
                                    'このハンドはこのポジションからのオープンレンジに含まれています。ポジションとスタックの深さを考慮し、レイズでイニシアチブを取ることが推奨されます。');
            } else {
                return `${posLabel}からの${hand}はフォールドが推奨されます。このポジションからオープンするにはハンドが弱すぎます。アーリーポジションほどオープンレンジはタイトにする必要があり、このハンドでエントリーすると、後ろから3ベットされた時に困難な状況に陥ります。長期的にはチップを失うプレイになるため、より良い手が来るのを待ちましょう。`;
            }
        }

        if (scenario === 'vs_RFI') {
            if (gtoAction === 'call') {
                return `${raiserPos || '相手'}のオープンレイズに対して、${hand}でのコール（フラット）が推奨されます。このハンドはレイザーのレンジに対して十分なエクイティがありますが、3ベットするには少し弱いためフラットコールが最適です。ポジションがある場合はポストフロップでのプレイアビリティが高く、インプライドオッズも活かせます。`;
            } else if (gtoAction === '3bet') {
                return `${raiserPos || '相手'}のオープンに対して、${hand}は3ベットが推奨されます。` +
                    (cat === 'premium_pair' || cat === 'premium_broadway' ? 'プレミアムハンドで3ベットすることで、相手のレンジに対して大きなエッジをポットに反映させます。フラットコールだとマルチウェイになりやすく、ハンドの収益性が下がります。' :
                        'このハンドは3ベットレンジに含まれるべきです。3ベットすることでフォールドエクイティを得られ、コールされてもポジションやハンドの可能性を活かしてプレイできます。');
            } else {
                return `${raiserPos || '相手'}のオープンに対して、${hand}はフォールドが推奨されます。このハンドはオープンレイザーのレンジに対して十分なエクイティがなく、コールしてもポストフロップで難しい判断を迫られることが多いです。特にアウトオブポジションの場合、ポストフロップでのディスアドバンテージが大きく、長期的にはフォールドが利益的です。`;
            }
        }

        if (scenario === 'vs_3bet') {
            if (gtoAction === 'call') {
                return `3ベットに対して、${hand}はコールが推奨されます。このハンドは一定のエクイティがあり、完全にフォールドするには強すぎますが、4ベットするほどの強さはありません。ポジションとインプライドオッズを活かしてポストフロップでプレイしましょう。`;
            } else if (gtoAction === '4bet') {
                return `3ベットに対して、${hand}は4ベットが推奨されます。プレミアムハンドでは相手の3ベットレンジに対して大きなエッジがあるため、ポットを大きくすることが利益的です。バリュー4ベットとして相手のコール/5ベットミスから利益を得ましょう。`;
            } else {
                return `3ベットに対して、${hand}はフォールドが推奨されます。3ベットに対するディフェンスレンジにこのハンドは含まれません。3ベットされた時点でポットオッズを計算しても、このハンドのエクイティでは長期的に利益が出ません。`;
            }
        }
        return `${gtoAction}が推奨されるアクションです。`;
    }

    function buildFallbackWhyWrong(hand, position, scenario, userAction, gtoAction, raiserPos) {
        const actionLabels = { 'fold': 'フォールド', 'call': 'コール', 'raise': 'レイズ', '3bet': '3ベット', '4bet': '4ベット', 'limp': 'リンプ' };
        const userLabel = actionLabels[userAction] || userAction;
        const gtoLabel = actionLabels[gtoAction] || gtoAction;

        if (userAction === 'fold' && gtoAction !== 'fold') {
            return `${hand}でフォールドすると、このハンドが持つエクイティを完全に放棄してしまいます。このハンドは${gtoLabel}することでプラスEVのプレイが可能です。フォールドしすぎると相手にエクスプロイトされ、ブラインドスチールやベットに対して降りすぎるプレイヤーだと認識されてしまいます。適切なディフェンス頻度を保つことが重要です。`;
        }
        if (userAction === 'call' && gtoAction === 'raise') {
            return `${hand}をコールすることでポットでのイニシアチブを放棄してしまいます。レイズすることで相手にプレッシャーをかけ、フォールドエクイティを得られるうえ、ポストフロップでもC-betなど積極的なプレイが可能になります。コールはマルチウェイを招きやすく、ハンドのエクイティが薄まります。`;
        }
        if (userAction === 'call' && gtoAction === '3bet') {
            return `${hand}をフラットコールすると、このハンドの真の価値を引き出せません。3ベットすることでプリフロップでポットサイズをコントロールし、相手のレンジから弱いハンドをフォールドさせることができます。コールだけではポストフロップで不利な状況に陥りやすくなります。`;
        }
        if ((userAction === 'raise' || userAction === '3bet' || userAction === '4bet') && gtoAction === 'fold') {
            return `${hand}でのレイズ/リレイズはプリフロップの時点でハンドが弱すぎます。相手のレンジに対してエクイティが不足しており、レイズしても利益が出ません。相手にコール/リレイズされた場合、ポストフロップで非常に不利な状況でプレイすることを強いられます。このハンドは見送るべきです。`;
        }
        if ((userAction === 'raise' || userAction === '3bet') && gtoAction === 'call') {
            return `${hand}でのレイズは少しアグレッシブすぎます。このハンドはレイザーのレンジに対してコールで十分なエクイティがあり、フラットコールでインプライドオッズを活かす方がEVが高いです。レイズすると相手のレンジがタイトになり、不利な状況でのプレイを増やしてしまいます。`;
        }

        return `${userLabel}ではなく${gtoLabel}が最適なアクションです。GTO戦略では、このハンドとポジションの組み合わせでは${gtoLabel}がレンジバランス的にも期待値的にも優れています。`;
    }

    function buildFallbackInsight(hand, position, scenario, gtoAction) {
        if (scenario === 'RFI') {
            return `ポジションが後ろになるほどオープンレンジは広がります。${position}では、このハンドが${gtoAction === 'raise' ? 'レンジに含まれる' : 'レンジ外'}ことを覚えておきましょう。`;
        }
        if (scenario === 'vs_RFI') {
            return `オープンレイザーに対するアクションは、自分のポジション、相手のオープンポジション、そしてハンドの3つの要素で決まります。3ベットレンジとフラットレンジの使い分けが重要です。`;
        }
        if (scenario === 'vs_3bet') {
            return `3ベットに直面した時は、ハンドのエクイティだけでなく、ポストフロップでのプレイアビリティも考慮しましょう。スーテッドハンドやコネクターはコールに適しており、プレミアムハンドは4ベットのバリューがあります。`;
        }
        return `このスポットでのGTO推奨は${gtoAction}です。`;
    }

    function buildRangeConsideration(hand, position, scenario, gtoAction) {
        const cat = getHandCategory(hand);
        if (scenario === 'RFI') {
            if (gtoAction === 'raise') {
                return `${position}からのオープンレンジにこのハンドは含まれます。レンジ全体のバランスを保つためには、バリューハンドだけでなく適度なブラフ候補も含める必要があり、${cat.includes('suited') ? 'スーテッドハンドはブロッカーやバックドアドローとしてブラフレンジに適しています。' : 'このハンドはバリュー/セミブラフの役割を果たします。'}`;
            }
            return `${position}からのオープンレンジにこのハンドは含まれません。レンジを広げすぎるとポストフロップで利益的にプレイできないハンドが増え、全体の期待値が下がります。`;
        }
        if (scenario === 'vs_RFI') {
            return `ディフェンスレンジのバランスとして、コール/3ベット/フォールドを適切に混ぜることが重要です。フォールドしすぎると相手のスチールが利益的になりすぎますが、弱いハンドまでディフェンスするとポストフロップで苦しみます。${hand}は${gtoAction === 'fold' ? 'フォールドレンジ' : gtoAction === 'call' ? 'コール（フラット）レンジ' : '3ベットレンジ'}に含まれます。`;
        }
        return `3ベットに対するレンジ構成では、バリュー4ベット、コール、そしてフォールドを適切に混ぜてバランスをとります。${hand}はこの状況で${gtoAction}するのが最もバランスの良いプレイです。`;
    }

    // === 公開API ===
    return {
        start,
        handleAction,
        nextHand,
        endSession,
        getState: () => ({ ...state })
    };
})();
