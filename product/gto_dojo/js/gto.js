/**
 * GTO Dojo — GTO判定モジュール
 * プリフロップGTOレンジデータの管理と判定ロジック
 */

const GTO = (() => {
    let rangeData = null;

    // === カード・ハンド関連ユーティリティ ===

    const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const SUITS = ['s', 'h', 'd', 'c']; // spade, heart, diamond, club
    const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
    const RANK_ORDER = {};
    RANKS.forEach((r, i) => RANK_ORDER[r] = i);

    /** デッキ生成 */
    function createDeck() {
        const deck = [];
        for (const r of RANKS) {
            for (const s of SUITS) {
                deck.push(r + s);
            }
        }
        return deck;
    }

    /** デッキシャッフル (Fisher-Yates) */
    function shuffle(deck) {
        const d = [...deck];
        for (let i = d.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [d[i], d[j]] = [d[j], d[i]];
        }
        return d;
    }

    /** カード解析 */
    function parseCard(card) {
        return { rank: card[0], suit: card[1] };
    }

    /** 2枚のハンドを正規化されたハンド表記に変換 (e.g., "AKs", "JTo") */
    function normalizeHand(card1, card2) {
        const r1 = parseCard(card1);
        const r2 = parseCard(card2);
        const order1 = RANK_ORDER[r1.rank];
        const order2 = RANK_ORDER[r2.rank];

        let high, low, suited;
        if (order1 >= order2) {
            high = r1.rank;
            low = r2.rank;
        } else {
            high = r2.rank;
            low = r1.rank;
        }
        suited = r1.suit === r2.suit;

        if (high === low) {
            return high + low; // ポケットペア (e.g., "AA")
        }
        return high + low + (suited ? 's' : 'o');
    }

    // === GTOデータ読み込み ===

    async function loadRanges() {
        try {
            const res = await fetch('./data/preflop/cash_6max.json');
            rangeData = await res.json();
            console.log('[GTO] Range data loaded:', rangeData.meta.format);
            return true;
        } catch (e) {
            console.error('[GTO] Failed to load range data:', e);
            return false;
        }
    }

    function isLoaded() {
        return rangeData !== null;
    }

    // === GTO判定ロジック ===

    /** 6maxのポジション一覧 */
    const POSITIONS_6MAX = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    const POSITIONS_9MAX = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

    /**
     * RFI（レイズファーストイン）のGTO判定
     * @param {string} hand - 正規化ハンド (e.g., "AKs")
     * @param {string} position - ポジション (e.g., "UTG")
     * @returns {object} { actions: { raise: freq, fold: freq }, recommended: string }
     */
    function getRFIAction(hand, position) {
        if (!rangeData) return null;
        const posData = rangeData.ranges.RFI[position];
        if (!posData) return null;

        if (posData.raise.includes(hand)) {
            return {
                actions: { raise: 1.0, fold: 0.0 },
                recommended: 'raise',
                explanation: `${position}からの${hand}はオープンレイズです。`
            };
        }
        return {
            actions: { raise: 0.0, fold: 1.0 },
            recommended: 'fold',
            explanation: `${position}からの${hand}はフォールドが推奨です。`
        };
    }

    /**
     * vs RFI（3bet/call/fold）のGTO判定
     * @param {string} hand - 正規化ハンド
     * @param {string} heroPosition - ヒーローのポジション
     * @param {string} raiserPosition - レイザーのポジション
     * @returns {object}
     */
    function getVsRFIAction(hand, heroPosition, raiserPosition) {
        if (!rangeData) return null;
        const key = `${raiserPosition}_raise`;
        const scenario = rangeData.ranges.vs_RFI[key];
        if (!scenario) return null;
        const posData = scenario[heroPosition];
        if (!posData) return null;

        if (posData['3bet'] && posData['3bet'].includes(hand)) {
            return {
                actions: { '3bet': 1.0, call: 0.0, fold: 0.0 },
                recommended: '3bet',
                explanation: `${raiserPosition}のオープンに対して${heroPosition}の${hand}は3ベットです。`
            };
        }
        if (posData.call && posData.call.includes(hand)) {
            return {
                actions: { '3bet': 0.0, call: 1.0, fold: 0.0 },
                recommended: 'call',
                explanation: `${raiserPosition}のオープンに対して${heroPosition}の${hand}はコールです。`
            };
        }
        return {
            actions: { '3bet': 0.0, call: 0.0, fold: 1.0 },
            recommended: 'fold',
            explanation: `${raiserPosition}のオープンに対して${heroPosition}の${hand}はフォールドが推奨です。`
        };
    }

    /**
     * vs 3bet のGTO判定
     * @param {string} hand - 正規化ハンド
     * @param {string} openerPosition - オープナーのポジション
     * @returns {object}
     */
    function getVs3betAction(hand, openerPosition) {
        if (!rangeData) return null;
        const key = `${openerPosition}_open_vs_3bet`;
        const data = rangeData.ranges.vs_3bet[key];
        if (!data) return null;

        if (data['4bet'] && data['4bet'].includes(hand)) {
            return {
                actions: { '4bet': 1.0, call: 0.0, fold: 0.0 },
                recommended: '4bet',
                explanation: `3ベットに対して${openerPosition}の${hand}は4ベットです。`
            };
        }
        if (data.call && data.call.includes(hand)) {
            return {
                actions: { '4bet': 0.0, call: 1.0, fold: 0.0 },
                recommended: 'call',
                explanation: `3ベットに対して${openerPosition}の${hand}はコールです。`
            };
        }
        return {
            actions: { '4bet': 0.0, call: 0.0, fold: 1.0 },
            recommended: 'fold',
            explanation: `3ベットに対して${openerPosition}の${hand}はフォールドが推奨です。`
        };
    }

    /**
     * ユーザーアクションとGTO推奨を比較してEVロスを計算
     * @param {string} userAction - ユーザーの選んだアクション
     * @param {object} gtoResult - GTO判定結果
     * @returns {object} { match: boolean, evLoss: number, feedback: string }
     */
    function evaluateAction(userAction, gtoResult) {
        if (!gtoResult) {
            return { match: false, evLoss: 0, feedback: 'GTO判定不能', grade: 'unknown' };
        }

        // ユーザーアクションの正規化
        const normalized = normalizeUserAction(userAction);
        const recommended = gtoResult.recommended;

        if (normalized === recommended) {
            return {
                match: true,
                evLoss: 0,
                feedback: 'GTO通りのプレイです！',
                grade: 'correct',
                gtoAction: recommended,
                userAction: normalized,
                explanation: gtoResult.explanation
            };
        }

        // EVロスの簡易計算（アクションの重大度で差をつける）
        const evLoss = calculateEVLoss(normalized, recommended);

        let feedback;
        if (evLoss <= 0.5) {
            feedback = '悪くないですが、より良い選択がありました。';
        } else if (evLoss <= 1.5) {
            feedback = 'ミスです。GTO的にはより良い選択があります。';
        } else {
            feedback = '大きなミスです。正しいアクションを確認しましょう。';
        }

        return {
            match: false,
            evLoss,
            feedback,
            grade: evLoss <= 0.5 ? 'mixed' : 'incorrect',
            gtoAction: recommended,
            userAction: normalized,
            explanation: gtoResult.explanation
        };
    }

    /** ユーザーアクションを統一表記に正規化 */
    function normalizeUserAction(action) {
        const map = {
            'fold': 'fold',
            'call': 'call',
            'limp': 'call',
            'raise_small': 'raise',
            'raise_large': 'raise',
            'raise': 'raise',
            '3bet': '3bet',
            '4bet': '4bet',
            'allin': '4bet'
        };
        return map[action] || action;
    }

    /** EVロスの簡易計算 (BB単位) */
    function calculateEVLoss(userAction, gtoAction) {
        // アクション間のEVロスマトリックス (簡略化)
        const lossMatrix = {
            'fold': { 'raise': 2.5, 'call': 1.5, '3bet': 3.0, '4bet': 4.0 },
            'call': { 'raise': 0.5, 'fold': 0.8, '3bet': 1.5, '4bet': 2.0 },
            'raise': { 'fold': 1.5, 'call': 0.3, '3bet': 0.5, '4bet': 1.0 },
            '3bet': { 'fold': 2.0, 'call': 1.0, 'raise': 0.5, '4bet': 0.5 },
            '4bet': { 'fold': 3.0, 'call': 1.5, 'raise': 1.0, '3bet': 0.5 }
        };

        if (lossMatrix[userAction] && lossMatrix[userAction][gtoAction] !== undefined) {
            return lossMatrix[userAction][gtoAction];
        }
        return 1.0; // デフォルト
    }

    // === ポストフロップ戦略データ ===

    let postflopData = null;

    async function loadPostflopStrategies() {
        try {
            const res = await fetch('./data/postflop/strategies.json');
            postflopData = await res.json();
            console.log('[GTO] Postflop strategies loaded');
            return true;
        } catch (e) {
            console.error('[GTO] Failed to load postflop strategies:', e);
            return false;
        }
    }

    function isPostflopLoaded() {
        return postflopData !== null;
    }

    // === ボードテクスチャ分析 ===

    function analyzeBoardTexture(boardCards) {
        const cards = boardCards.map(parseCard);
        const ranks = cards.map(c => RANK_ORDER[c.rank]);
        const suits = cards.map(c => c.suit);

        // スート分析
        const suitCounts = {};
        suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
        const maxSuitCount = Math.max(...Object.values(suitCounts));
        const isMonotone = maxSuitCount >= 3;
        const isTwoTone = maxSuitCount === 2 && cards.length >= 3;

        // コネクト分析
        const sortedRanks = [...ranks].sort((a, b) => a - b);
        let maxGap = 0;
        let connectivity = 0;
        for (let i = 1; i < sortedRanks.length; i++) {
            const gap = sortedRanks[i] - sortedRanks[i - 1];
            maxGap = Math.max(maxGap, gap);
            if (gap <= 2) connectivity++;
        }
        const isConnected = connectivity >= 2 || (sortedRanks.length >= 3 && maxGap <= 2);

        // ペアボード
        const rankCounts = {};
        cards.forEach(c => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1; });
        const isPaired = Object.values(rankCounts).some(v => v >= 2);

        // ハイカード判定
        const hasHighCards = ranks.filter(r => r >= 9).length >= 2; // T以上
        const hasBroadway = ranks.filter(r => r >= 8).length >= 3; // T以上が3枚

        // テクスチャ分類
        if (isPaired) return 'paired';
        if (hasBroadway) return 'broadway';
        if (isMonotone) return 'wet_flush';
        if (isConnected && isTwoTone) return 'wet_connected';
        if (isConnected) return 'medium_connected';
        if (hasHighCards) return 'dry_high';
        return 'dry_low';
    }

    // === ハンド強度評価 ===

    function evaluateHandStrength(heroCards, boardCards) {
        const hero = heroCards.map(parseCard);
        const board = boardCards.map(parseCard);
        const allCards = [...hero, ...board];
        const allRanks = allCards.map(c => RANK_ORDER[c.rank]);
        const boardRanks = board.map(c => RANK_ORDER[c.rank]);
        const heroRanks = hero.map(c => RANK_ORDER[c.rank]);

        // ランクカウント
        const rankCounts = {};
        allCards.forEach(c => {
            rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
        });

        // スートカウント（フラッシュ判定）
        const suitCounts = {};
        allCards.forEach(c => {
            suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
        });
        const heroSuits = hero.map(c => c.suit);

        // フラッシュチェック
        const hasFlush = Object.entries(suitCounts).some(([s, count]) =>
            count >= 5 && heroSuits.includes(s)
        );

        // フラッシュドローチェック
        const hasFlushDraw = !hasFlush && Object.entries(suitCounts).some(([s, count]) =>
            count === 4 && heroSuits.includes(s)
        );

        // ストレートチェック（簡略）
        const uniqueRanks = [...new Set(allRanks)].sort((a, b) => a - b);
        let hasStraight = false;
        let hasStraightDraw = false;
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) {
                const straightRanks = uniqueRanks.slice(i, i + 5);
                if (heroRanks.some(r => straightRanks.includes(r))) {
                    hasStraight = true;
                }
            }
        }
        // OESD check
        if (!hasStraight) {
            for (let i = 0; i <= uniqueRanks.length - 4; i++) {
                if (uniqueRanks[i + 3] - uniqueRanks[i] <= 4) {
                    const nearRanks = uniqueRanks.slice(i, i + 4);
                    if (heroRanks.some(r => nearRanks.includes(r))) {
                        hasStraightDraw = true;
                    }
                }
            }
        }

        // Ace-high straight wrap
        if (uniqueRanks.includes(12)) { // A
            const lowRanks = uniqueRanks.filter(r => r <= 3); // 2,3,4,5
            if (lowRanks.length >= 3 && uniqueRanks.includes(0)) { // wheel
                if (heroRanks.some(r => r === 12 || r <= 3)) {
                    hasStraight = true;
                }
            }
        }

        // ペア系の判定
        const heroMatchesBoard = hero.filter(h =>
            board.some(b => b.rank === h.rank)
        );

        // ボード上のペア
        const boardRankCounts = {};
        board.forEach(c => { boardRankCounts[c.rank] = (boardRankCounts[c.rank] || 0) + 1; });

        const pocketPair = hero[0].rank === hero[1].rank;
        const boardHighRank = Math.max(...boardRanks);

        // セット（ポケットペア＋ボードにもう1枚）
        const hasSet = pocketPair && board.some(b => b.rank === hero[0].rank);

        // フルハウス / クアッズ
        const hasQuads = Object.values(rankCounts).some(v => v >= 4);
        const hasFullHouse = Object.values(rankCounts).filter(v => v >= 3).length >= 1 &&
            Object.values(rankCounts).filter(v => v >= 2).length >= 2;

        // トップペア
        const boardSorted = [...boardRanks].sort((a, b) => b - a);
        const topBoardRank = boardSorted[0];
        const secondBoardRank = boardSorted.length > 1 ? boardSorted[1] : -1;

        const hasTopPair = heroMatchesBoard.some(h => RANK_ORDER[h.rank] === topBoardRank);
        const hasSecondPair = heroMatchesBoard.some(h => RANK_ORDER[h.rank] === secondBoardRank);
        const hasBottomPair = heroMatchesBoard.length > 0 && !hasTopPair && !hasSecondPair;

        // キッカー判定
        const heroMaxRank = Math.max(...heroRanks);
        const goodKicker = heroMaxRank >= 10; // J以上

        // オーバーペア
        const hasOverpair = pocketPair && RANK_ORDER[hero[0].rank] > topBoardRank;

        // ツーペア
        const hasTwoPair = heroMatchesBoard.length >= 2 &&
            new Set(heroMatchesBoard.map(h => h.rank)).size >= 2;

        // === 強度分類 ===
        if (hasQuads || hasFullHouse || (hasFlush && hasStraight)) return 'nuts';
        if (hasFlush || hasStraight || hasSet) return 'nuts';
        if (hasOverpair || hasTwoPair || (hasTopPair && goodKicker)) return 'strong';
        if (hasTopPair || hasSecondPair) return 'medium';
        if (hasBottomPair || (pocketPair && !hasOverpair)) return 'weak';
        if (hasFlushDraw || hasStraightDraw) return 'draw';
        return 'air';
    }

    // === ポジション（IP/OOP）判定 ===

    function getRelativePosition(heroPosition, isPreflpRaiser) {
        // 簡略化：BTN/COはIP、他はOOP
        if (heroPosition === 'BTN' || heroPosition === 'CO') return 'IP';
        if (heroPosition === 'HJ' && isPreflpRaiser) return 'IP'; // HJオープンならBBに対してIP
        return 'OOP';
    }

    // === ポストフロップGTO判定 ===

    function getPostflopAction(heroCards, boardCards, street, heroPosition, facingBet, isPreflpRaiser) {
        if (!postflopData) return null;

        const handCategory = evaluateHandStrength(heroCards, boardCards);
        const relPos = getRelativePosition(heroPosition, isPreflpRaiser);
        const boardTexture = analyzeBoardTexture(boardCards);

        let strategy;
        if (facingBet) {
            strategy = postflopData.strategies.facing_bet[handCategory];
        } else {
            strategy = postflopData.strategies[street]?.[relPos]?.[handCategory];
        }

        if (!strategy) return null;

        // 最頻アクションを推奨
        let recommended;
        let maxFreq = 0;
        const actionMap = facingBet
            ? { fold: 'fold', call: 'call', raise: 'raise' }
            : { check: 'check', bet_small: 'bet_small', bet_large: 'bet_large' };

        for (const [action, freq] of Object.entries(actionMap)) {
            if ((strategy[action] || 0) > maxFreq) {
                maxFreq = strategy[action];
                recommended = action;
            }
        }

        const handInfo = postflopData.hand_categories[handCategory];
        const textureInfo = postflopData.board_textures[boardTexture];

        return {
            recommended,
            actions: { ...strategy },
            handCategory,
            handLabel: handInfo?.label || handCategory,
            boardTexture,
            boardLabel: textureInfo?.label || boardTexture,
            relativePosition: relPos,
            evBoost: strategy.ev_boost || 0,
            explanation: `${textureInfo?.label || ''}ボード / ${handInfo?.label || ''}（${relPos}） → ${getActionLabel(recommended)}が最頻`
        };
    }

    function getActionLabel(action) {
        const labels = {
            check: 'チェック', fold: 'フォールド', call: 'コール',
            bet_small: 'ベット小(1/3)', bet_large: 'ベット大(2/3+)',
            raise: 'レイズ'
        };
        return labels[action] || action;
    }

    /** ポストフロップアクション評価 */
    function evaluatePostflopAction(userAction, gtoResult, potSize) {
        if (!gtoResult) {
            return { match: false, evLoss: 0, feedback: 'GTO判定不能', grade: 'unknown' };
        }

        const recommended = gtoResult.recommended;

        // ユーザーアクションの正規化
        const normalizedUser = normalizePostflopAction(userAction);

        if (normalizedUser === recommended) {
            return {
                match: true,
                evLoss: 0,
                feedback: 'GTO通りのプレイです！',
                grade: 'correct',
                gtoAction: recommended,
                userAction: normalizedUser,
                explanation: gtoResult.explanation,
                handCategory: gtoResult.handCategory,
                handLabel: gtoResult.handLabel,
                boardTexture: gtoResult.boardTexture,
                boardLabel: gtoResult.boardLabel,
                frequencies: gtoResult.actions
            };
        }

        // EVロス計算
        const userFreq = gtoResult.actions[normalizedUser] || 0;
        const gtoFreq = gtoResult.actions[recommended] || 1;
        const freqDiff = gtoFreq - userFreq;
        const evLoss = Math.max(0, freqDiff * (potSize / 4) + Math.abs(gtoResult.evBoost) * freqDiff * 0.5);
        const roundedLoss = Math.round(evLoss * 100) / 100;

        let feedback;
        const grade = userFreq > 0.2 ? 'mixed' : 'incorrect';
        if (userFreq > 0.3) {
            feedback = `許容範囲ですが、${getActionLabel(recommended)}の方が頻度が高いです。`;
        } else if (userFreq > 0.1) {
            feedback = `この状況では${getActionLabel(recommended)}が推奨されます。`;
        } else {
            feedback = `大きなミスです。${getActionLabel(recommended)}が正しいアクションです。`;
        }

        return {
            match: false,
            evLoss: roundedLoss,
            feedback,
            grade,
            gtoAction: recommended,
            userAction: normalizedUser,
            explanation: gtoResult.explanation,
            handCategory: gtoResult.handCategory,
            handLabel: gtoResult.handLabel,
            boardTexture: gtoResult.boardTexture,
            boardLabel: gtoResult.boardLabel,
            frequencies: gtoResult.actions
        };
    }

    function normalizePostflopAction(action) {
        const map = {
            'check': 'check', 'fold': 'fold', 'call': 'call',
            'bet_small': 'bet_small', 'bet_medium': 'bet_small',
            'bet_large': 'bet_large', 'raise': 'raise',
            'allin': 'bet_large'
        };
        return map[action] || action;
    }

    // === 公開API ===
    return {
        RANKS,
        SUITS,
        SUIT_SYMBOLS,
        RANK_ORDER,
        POSITIONS_6MAX,
        POSITIONS_9MAX,
        createDeck,
        shuffle,
        parseCard,
        normalizeHand,
        loadRanges,
        isLoaded,
        getRFIAction,
        getVsRFIAction,
        getVs3betAction,
        evaluateAction,
        // ポストフロップ
        loadPostflopStrategies,
        isPostflopLoaded,
        analyzeBoardTexture,
        evaluateHandStrength,
        getRelativePosition,
        getPostflopAction,
        evaluatePostflopAction,
        getActionLabel
    };
})();
