/**
 * GTO Dojo v2 — AI モジュール (Local Rule-Based Engine)
 * Gemini APIを使用せず、GTOデータ（EV、頻度）とヒューリスティックなルールを
 * 用いて、即座に高品質な詳細解説をローカルで生成するエンジン。
 */

const AI = (() => {

    // === Card formatting ===

    const SUIT_MAP = { s: '♠', h: '♥', d: '♦', c: '♣' };

    function formatCard(c) {
        if (!c) return '';
        return c.charAt(0) + (SUIT_MAP[c.charAt(1)] || c.charAt(1));
    }

    function formatCards(cards) {
        if (!cards) return '';
        return cards.map(formatCard).join(' ');
    }

    function formatBoard(boardCards) {
        if (!boardCards || boardCards.length === 0) return 'なし';
        return formatCards(boardCards);
    }

    // === v2: ヴィランのアクション選択（ローカルGTO頻度ベース） ===

    function selectWeightedAction(actions) {
        if (!actions) return null;
        const rand = Math.random();
        let cumulative = 0;
        for (const [action, freq] of Object.entries(actions)) {
            cumulative += freq;
            if (rand < cumulative) return action;
        }
        return Object.keys(actions)[0];
    }

    async function getVillainPreflopAction(context) {
        const { villainCards, villainPosition, heroPosition, scenario } = context;
        if (!villainCards || villainCards.length < 2) return { action: 'call', raiseSize: 0, thinking: '手札情報がないためコールします。' };

        const hand = GTO.normalizeHand(villainCards[0], villainCards[1]);
        let gtoResult = null;

        if (scenario === 'RFI') {
            // Heroがオープンし、Villainがそれに直面している状況
            gtoResult = GTO.getVsRFIAction(hand, villainPosition, heroPosition);
        } else if (scenario === 'vs_RFI') {
            // Villainがオープンし、Heroに3betされた状況
            gtoResult = GTO.getVs3betAction(hand, villainPosition);
        }

        if (gtoResult && gtoResult.actions) {
            const selectedAction = selectWeightedAction(gtoResult.actions);
            if (selectedAction) {
                const finalAction = (selectedAction === 'raise' || selectedAction === '3bet' || selectedAction === '4bet') ? 'raise' : selectedAction;
                return {
                    action: finalAction,
                    raiseSize: 0, // 実際のサイズはgame.js側で計算
                    thinking: `【GTO頻度ボット】推奨:${gtoResult.recommended}の状況で、GTOの混合確率計算に基づき ${finalAction} を選択しました。`
                };
            }
        }

        return { action: 'call', raiseSize: 0, thinking: 'GTOツリー外の変則的な状況のため、デフォルトでコールを選択しました。' };
    }

    async function getVillainPostflopAction(context) {
        const { villainCards, boardCards, street, villainPosition, isVillainRaiser, facingBet } = context;
        if (!villainCards || !boardCards) return { action: 'check', thinking: '情報不足のためチェックします。' };

        try {
            // getPostflopAction(heroCards, boardCards, street, heroPosition, facingBet, isPreflpRaiser)
            // Villain目線で呼び出す
            const result = GTO.getPostflopAction(villainCards, boardCards, street, villainPosition, facingBet, isVillainRaiser);
            if (result && result.actions) {
                const selectedAction = selectWeightedAction(result.actions);
                if (selectedAction) {
                    return {
                        action: selectedAction,
                        thinking: `【GTO頻度ボット】ボード(${result.boardLabel})とハンド(${result.handLabel})のGTO頻度テーブルに基づき、適正な確率で ${GTO.getActionLabel(selectedAction)} をランダム選択しました。`
                    };
                }
            }
        } catch (e) {
            console.error('[AI] Villain Postflop Error:', e);
        }

        // フォールバック
        if (facingBet) {
            return { action: Math.random() < 0.6 ? 'call' : 'fold', thinking: 'GTOデータ欠損のため、簡易ロジックで対応しました。' };
        } else {
            return { action: Math.random() < 0.4 ? 'bet_small' : 'check', thinking: 'GTOデータ欠損のため、簡易ロジックで対応しました。' };
        }
    }

    // === ヘルパー: ハンドとボードの分析 ===

    function analyzeHandCategory(hand) {
        if (!hand || hand.length < 2) return { category: '不明/トラッシュ', desc: '参加するには少し弱いハンドです。' };
        const rank1 = hand.charAt(0);
        const rank2 = hand.charAt(1);
        const isSuited = hand.length > 2 && hand.charAt(2) === 's';
        const isPair = rank1 === rank2;

        const ranks = 'AKQJT98765432';
        const r1Val = ranks.indexOf(rank1);
        const r2Val = ranks.indexOf(rank2);

        if (isPair) {
            if (r1Val <= 2) return { category: 'プレミアム・ペア', desc: '最強クラスのポケットペアです。積極的にポットを膨らませてバリューを取りましょう。' };
            if (r1Val <= 6) return { category: 'ミドル・ペア', desc: '中程度のポケットペアです。セットが引ければ強烈ですが、オーバーカードが出るとプレイが難しくなります。' };
            return { category: 'スモール・ペア', desc: 'セットマイン向けです。フロップでセットにならなければ、基本は諦める前提でプレイします。' };
        }

        if (r1Val <= 4 && r2Val <= 4) {
            if (isSuited) return { category: 'プレミアム・スーテッド・ブロードウェイ', desc: 'トップペアや強力なフラッシュを作るポテンシャルが非常に高い強力なハンドです。' };
            return { category: 'ブロードウェイ', desc: 'トップペアを作りやすいハンドですが、AやKが落ちたときのキッカー負けには警戒が必要です。' };
        }

        if (isSuited) {
            if (Math.abs(r1Val - r2Val) <= 2) return { category: 'スーテッド・コネクター', desc: 'ストレートやフラッシュドローを作りやすく、マルチウェイ(多人数)や深いスタックで真価を発揮します。' };
            if (rank1 === 'A') return { category: 'Aスーテッド', desc: 'ナッツフラッシュ(最強のフラッシュ)を作れる強みがあり、ブラフ時のAブロッカーとしても優秀です。' };
            return { category: 'スーテッド・ギャッパー', desc: 'フラッシュの可能性はありますが、無理に参加するほどの強さはありません。' };
        }

        if (rank1 === 'A') return { category: 'Aオフスーツ', desc: 'Aのトップペアを作れますが、キッカー負けしやすいためポストフロップのプレイが難しいハンドです。' };
        if (Math.abs(r1Val - r2Val) <= 1) return { category: 'オフスーツ・コネクター', desc: 'ストレートの目はありますが、スーテッドに比べて勝率が格段に落ちます。' };

        return { category: 'マージナル/トラッシュ', desc: '参加するには弱いハンドです。フォールドが推奨されます。' };
    }

    function analyzeBoardTexture(boardCards) {
        if (!boardCards || boardCards.length < 3) return { texture: 'プリフロップ', desc: 'まだボードは開いていません。' };

        const suits = boardCards.map(c => c.charAt(1));
        const ranks = boardCards.map(c => c.charAt(0));

        // フラッシュドロー判定
        const suitCounts = {};
        suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
        const maxSuitCount = Math.max(...Object.values(suitCounts));

        // ペアボード判定
        const rankCounts = {};
        ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
        const maxRankCount = Math.max(...Object.values(rankCounts));

        let texture = [];
        let desc = [];

        if (maxSuitCount >= 3) {
            texture.push('モノトーン');
            desc.push('既にフラッシュが完成している可能性があるため、相手のアクションには厳重な警戒が必要です。');
        } else if (maxSuitCount === 2) {
            texture.push('ツートーン');
            desc.push('フラッシュドローが存在するウェットなボードです。ドローヘビーな展開になりやすいです。');
        } else {
            texture.push('レインボー');
            desc.push('フラッシュドローが存在しないため、比較的ドライでストレートな展開が見込まれます。');
        }

        if (maxRankCount === 3) {
            texture.push('トリップボード');
            desc.push('クワッズやフルハウスの可能性があり、極端に関与できるハンドが絞られる特異なボードです。');
        } else if (maxRankCount === 2) {
            texture.push('ペアボード');
            desc.push('フルハウスやトリップスの可能性があり、通常のフラッシュやストレートの価値が相対的に下がります。');
        } else {
            // ストレート系の判定(簡易)
            let isConnected = false;
            const rankVals = ranks.map(r => 'AKQJT98765432'.indexOf(r)).sort((a, b) => a - b);
            if (rankVals[2] - rankVals[0] <= 4) isConnected = true;

            if (isConnected) {
                texture.push('コネクテッド');
                desc.push('ストレートや強いドローが完成しやすく、非常にウェットで複雑なボードです。');
            } else {
                texture.push('ドライ');
                desc.push('ドローができにくく、トップペアなどの完成手がそのまま強さを発揮しやすいボードです。');
            }
        }

        return {
            texture: texture.join(' / '),
            desc: desc.join(' ')
        };
    }

    // === ヘルパー: EVロスや文脈から解説文を生成 ===

    function getPreflopAdvice(userAction, gtoAction, evLoss, isMatch, explanation) {
        const base = explanation || `${gtoAction} が推奨されるシチュエーションです。`;
        if (isMatch) {
            return `素晴らしい判断です。${base} 長期的な利益（+EV）を最大化する標準的なプレイです。`;
        }
        if (evLoss < 0.2) {
            return `悪くありませんが、${gtoAction} の方がわずかに優れています。${base}`;
        }
        if (evLoss < 0.5) {
            return `このポジションからの ${userAction} は少しリスクが高いです。${base}`;
        }
        return `大きなミスです（EVロス: ${evLoss.toFixed(2)}BB）。${userAction} は長期的に大きな損失に繋がります。素直に ${gtoAction} しましょう。${base}`;
    }

    function getPostflopAdvice(userAction, gtoAction, evLoss, isMatch, street, explanation) {
        const streetStr = { flop: 'フロップ', turn: 'ターン', river: 'リバー' }[street] || street;
        const base = explanation || `${gtoAction} が最も期待値の高いアクションです。`;

        if (isMatch) {
            return `完璧なプレイです。${base} ボードテクスチャとハンドの絡みを正しく理解できています。`;
        }
        if (evLoss < 0.3) {
            return `${streetStr}での ${userAction} はマージナルなミスです。${base} ${userAction} も状況によっては選ばれますが、頻度を見直しましょう。`;
        }
        if (evLoss < 1.0) {
            return `明確なミスです。ここでは ${gtoAction} を選ぶべきでした。相手のレンジに対して ${userAction} は不利に働きます。${base}`;
        }
        return `致命的なブラダー（大悪手）です（EVロス: ${evLoss.toFixed(2)}BB）。ボードの状況やレンジ・アドバンテージを大きく見誤っています。${base}`;
    }

    function getKeyInsight(evLoss, isMatch, gtoAction, explanation) {
        if (isMatch) return "GTOの基本に忠実な、バランスの取れたプレイができています。この調子で堅実なレンジを構築しましょう。";
        if (evLoss > 1.0) return `ボードと自分のレンジ、相手のレンジの絡みを再確認してください。なぜ ${gtoAction} が選ばれるのか、直感とのズレを修正することが重要です。`;
        return `GTOは多くの場合、複数アクションを混ぜる「混合戦略」を取ります。今回 ${gtoAction} の頻度が高い理由を考えてみましょう。`;
    }

    // === v2: ハンド全体の詳細解説（一括取得用） ===

    async function analyzeFullHand(resultData) {
        const { hand, heroCards, position, villainPosition, scenario, boardCards, villainCards, streetResults, totalEvLoss } = resultData;

        const actedStreets = streetResults.filter(r => r.userAction).map(r => r.street);
        if (actedStreets.length === 0) return null;

        const streetDetails = {};

        const handCategory = analyzeHandCategory(hand);
        const boardTexture = analyzeBoardTexture(boardCards);

        streetResults.forEach(r => {
            if (!r.userAction) return;

            const isPreflop = (r.street === 'preflop');
            const isMatch = r.match;
            const evLoss = r.evLoss || 0;
            const explanation = r.explanation || "";

            let whyBest = '';
            let whyPlayerWrong = '';

            if (isPreflop) {
                if (isMatch) {
                    whyBest = getPreflopAdvice(r.userAction, r.gtoAction, evLoss, isMatch, explanation);
                } else {
                    whyPlayerWrong = getPreflopAdvice(r.userAction, r.gtoAction, evLoss, isMatch, explanation);
                    whyBest = `推奨される ${r.gtoAction} は数学的な最適解です。${explanation}`;
                }
            } else {
                if (isMatch) {
                    whyBest = getPostflopAdvice(r.userAction, r.gtoAction, evLoss, isMatch, r.street, explanation);
                } else {
                    whyPlayerWrong = getPostflopAdvice(r.userAction, r.gtoAction, evLoss, isMatch, r.street, explanation);
                    whyBest = `この状況での ${r.gtoAction} はGTOが支持する最善手です。${explanation}`;
                }
            }

            streetDetails[r.street] = {
                whyBest: whyBest,
                whyPlayerWrong: whyPlayerWrong,
                keyInsight: getKeyInsight(evLoss, isMatch, r.gtoAction, explanation),
                handStrength: isPreflop ? `【${handCategory.category}】\n${handCategory.desc}` : `【ハンド評価: ${r.handLabel || handCategory.category}】\nあなたのハンドは現在のボードに対して上記のように分類されます。エクイティ（勝率）を冷静に見極めましょう。`,
                boardAnalysis: isPreflop ? "プリフロップなのでボード情報はありません。" : `【${boardTexture.texture}】\n${boardTexture.desc}\n強いドローや完成手がどの程度存在しうるか、相手のレンジと比較しながら評価してください。`,
                equityEstimate: isPreflop ? "プリフロップの勝率は未確定ですが、ハンドの地力ポテンシャルは十分にあります。" : "現状のエクイティとポットオッズを天秤にかけ、必要勝率を満たしているか計算する習慣をつけましょう。",
                rangeConsideration: "ポーカーは自分の手札だけでなく「自分のレンジ全体」をどうプレイしているか相手に悟らせないバランスが重要です。"
            };
        });

        // Overall Review Generation
        let overallGrade = 'C';
        if (totalEvLoss === 0) overallGrade = 'A';
        else if (totalEvLoss < 0.5) overallGrade = 'B';
        else if (totalEvLoss > 2.0) overallGrade = 'F';
        else if (totalEvLoss > 1.0) overallGrade = 'D';

        const summary = totalEvLoss === 0
            ? "完璧なハンドです！全てのストリートでGTOに沿った最適なアクションを選択できました。"
            : `全体で ${totalEvLoss.toFixed(2)}BB のEVロスがありました。いくつかのストリートで改善の余地があります。`;

        const keyMistake = totalEvLoss === 0
            ? ""
            : "大きなEVロスを生んだストリートのアクションを見直し、なぜGTOが別のアクションを推奨したのか考えましょう。";

        const overallReview = {
            overallGrade,
            summary,
            keyMistake,
            keyLearning: "各ストリートでのアクションは、以前のストリートでの自分のレンジに依存していることを忘れないでください。",
            improvementTip: "迷ったときは、自分のレンジ全体でどう戦うべきかを俯瞰して考える癖をつけましょう。",
            boardAnalysis: boardCards && boardCards.length > 0 ? "ポストフロップではテクスチャ（ウェットかドライか）によってアグレッシブさを変えるのが基本です。" : ""
        };

        return {
            streetDetails,
            overallReview
        };
    }

    // === 旧関数 (フォールバック互換性用) ===

    async function analyzeWithDetailedExplanation(context) { return null; }
    async function generateHandReview(context) { return null; }
    async function analyzePreflopAction(context) { return null; }
    async function analyzePostflopAction(context) { return null; }

    // === Public API ===
    return {
        analyzePreflopAction,
        analyzePostflopAction,
        analyzeWithDetailedExplanation,
        getVillainPreflopAction,
        getVillainPostflopAction,
        generateHandReview,
        analyzeFullHand,
        formatCard,
        formatCards,
        formatBoard
    };
})();
