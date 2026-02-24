/**
 * GTO Dojo — ゲームエンジン v2
 * プリフロップ＋ポストフロップ シミュレーション & 連戦モード
 */

const Game = (() => {
    // === ゲーム状態 ===
    let state = {
        active: false,
        mode: 'single',     // 'single' or 'session'
        gameType: 'cash',
        tableSize: '6max',
        stackDepth: 100,
        currentStack: 100,  // 連戦モード用
        handNum: 0,
        deck: [],
        heroCards: [],
        boardCards: [],      // フロップ〜リバー
        heroPosition: '',
        scenario: '',        // 'RFI', 'vs_RFI', 'vs_3bet'
        raiserPosition: '',
        pot: 1.5,
        street: 'preflop',   // 'preflop','flop','turn','river'
        isPreflpRaiser: false,
        facingBet: false,
        preflopResult: null,  // プリフロップの結果
        sessionResults: [],
        streetResults: [],    // 現在のハンドのストリート別結果
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

        // データ読み込み
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
        state.facingBet = false;
        state.isPreflpRaiser = false;

        // デッキシャッフル
        state.deck = GTO.shuffle(GTO.createDeck());

        // ヒーローカード配布
        state.heroCards = [state.deck[0], state.deck[1]];

        //ボードカードを事前に確保（重複防止）
        state.boardCards = [];
        // flop: deck[2..4], turn: deck[5], river: deck[6]

        // ランダムポジション
        const positions = state.tableSize === '6max' ? positions6max : GTO.POSITIONS_9MAX;
        state.heroPosition = positions[Math.floor(Math.random() * positions.length)];

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
            street: 'プリフロップ',
            stack: state.mode === 'session' ? state.currentStack.toFixed(0) : state.stackDepth,
            pot: state.pot.toFixed(1)
        });

        // シナリオに応じたUIセットアップ
        setupScenarioUI();
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
            } else {
                state.raiserPosition = 'BTN';
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
            UI.showVillainAction('あなたの前のプレイヤーは全員フォールドしました');
            UI.renderActionButtons('RFI');
        } else if (state.scenario === 'vs_RFI') {
            UI.showVillainAction(`${state.raiserPosition} が2.5BBにレイズしました`);
            UI.renderActionButtons('vs_RFI');
        } else if (state.scenario === 'vs_3bet') {
            UI.showVillainAction(`あなたの2.5xオープンに対して、相手が3ベット（8BB）しました`);
            UI.renderActionButtons('vs_3bet');
        }
    }

    // === プリフロップ アクション処理 ===

    function handleAction(action) {
        if (state.street === 'preflop') {
            handlePreflopAction(action);
        } else {
            handlePostflopAction(action);
        }
    }

    function handlePreflopAction(action) {
        const hand = GTO.normalizeHand(state.heroCards[0], state.heroCards[1]);
        let gtoResult;

        if (state.scenario === 'RFI') {
            gtoResult = GTO.getRFIAction(hand, state.heroPosition);
        } else if (state.scenario === 'vs_RFI') {
            gtoResult = GTO.getVsRFIAction(hand, state.heroPosition, state.raiserPosition);
            if (action === 'raise_small' || action === 'raise_large') action = '3bet';
        } else if (state.scenario === 'vs_3bet') {
            gtoResult = GTO.getVs3betAction(hand, state.heroPosition);
            if (action === 'raise_small' || action === 'allin') action = '4bet';
        }

        const evaluation = GTO.evaluateAction(action, gtoResult);

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
        const normalizedAction = evaluation.userAction;
        if (normalizedAction === 'fold') {
            finishHand(evaluation, hand);
            return;
        }

        // raiseした場合はヒーローがプリフロップレイザー
        if (['raise', '3bet', '4bet'].includes(normalizedAction)) {
            state.isPreflpRaiser = true;
        }

        // ポット更新
        if (state.scenario === 'RFI') {
            state.pot = 6.5;  // 2.5x open + call
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

    function advanceToFlop(preflopEval, hand) {
        state.street = 'flop';
        // フロップカード: deck[2], deck[3], deck[4]
        state.boardCards = [state.deck[2], state.deck[3], state.deck[4]];

        // UIでプリフロップ結果をコンパクト表示 + フロップ表示
        UI.showPreflopMiniResult(preflopEval);
        UI.displayBoard(state.boardCards);
        UI.updateGameInfo({
            street: 'フロップ',
            pot: state.pot.toFixed(1)
        });

        // ヴィランアクション決定（ランダム）
        decideFacingBet();
        setupPostflopUI();
    }

    function advanceToTurn() {
        state.street = 'turn';
        state.boardCards.push(state.deck[5]);

        UI.displayBoard(state.boardCards);
        UI.updateGameInfo({
            street: 'ターン',
            pot: state.pot.toFixed(1)
        });

        decideFacingBet();
        setupPostflopUI();
    }

    function advanceToRiver() {
        state.street = 'river';
        state.boardCards.push(state.deck[6]);

        UI.displayBoard(state.boardCards);
        UI.updateGameInfo({
            street: 'リバー',
            pot: state.pot.toFixed(1)
        });

        decideFacingBet();
        setupPostflopUI();
    }

    // === ヴィランアクション（ベットされているかの決定）===

    function decideFacingBet() {
        // ヒーローがIPならチェックバック判定、OOPならベットされる確率
        const relPos = GTO.getRelativePosition(state.heroPosition, state.isPreflpRaiser);
        if (relPos === 'IP') {
            // OOPの相手がベットする確率 (~35%)
            state.facingBet = Math.random() < 0.35;
        } else {
            // 先にアクション → 自分からのアクション (facing bet = false)
            state.facingBet = false;
        }
    }

    function setupPostflopUI() {
        const handStr = GTO.evaluateHandStrength(state.heroCards, state.boardCards);
        const handLabel = GTO.isPostflopLoaded() ? '' : '';

        if (state.facingBet) {
            const betSize = (state.pot * (0.33 + Math.random() * 0.34)).toFixed(1);
            UI.showVillainAction(`相手が ${betSize}BB ベットしました`);
            UI.renderActionButtons('facing_bet');
        } else {
            UI.showVillainAction('相手はチェックしました。あなたの番です。');
            UI.renderActionButtons('postflop_action');
        }
    }

    // === ポストフロップ アクション処理 ===

    function handlePostflopAction(action) {
        const gtoResult = GTO.getPostflopAction(
            state.heroCards,
            state.boardCards,
            state.street,
            state.heroPosition,
            state.facingBet,
            state.isPreflpRaiser
        );

        const evaluation = GTO.evaluatePostflopAction(action, gtoResult, state.pot);

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
        // checkの場合はポット変化なし

        // 次のストリートへ
        if (state.street === 'flop') {
            showStreetResult(evaluation, () => advanceToTurn());
        } else if (state.street === 'turn') {
            showStreetResult(evaluation, () => advanceToRiver());
        } else if (state.street === 'river') {
            const hand = GTO.normalizeHand(state.heroCards[0], state.heroCards[1]);
            finishHand(evaluation, hand);
        }
    }

    // === ストリート結果表示 ===

    function showStreetResult(evaluation, nextCallback) {
        UI.showStreetFeedback(evaluation, state.street, () => {
            nextCallback();
        });
    }

    // === ハンド終了 ===

    function finishHand(lastEvaluation, hand) {
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

        // 結果画面表示
        UI.renderFullResult({
            lastEvaluation,
            hand,
            position: state.heroPosition,
            scenario: state.scenario,
            streetResults: state.streetResults,
            totalEvLoss,
            allMatch,
            boardCards: [...state.boardCards]
        });
        UI.showScreen('result-screen');
    }

    // === 次のハンド ===

    function nextHand() {
        // 連戦モードでスタックが0以下になったらセッション終了
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

        // セッションサマリー画面表示
        UI.renderSessionSummary(sessionData, state.sessionResults);
        UI.showScreen('session-summary-screen');
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
