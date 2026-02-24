/**
 * GTO Dojo — アプリ初期化 v2
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[GTO Dojo] Initializing...');

    // GTOデータ読み込み（プリフロップ＋ポストフロップ）
    const [preflopOk, postflopOk] = await Promise.all([
        GTO.loadRanges(),
        GTO.loadPostflopStrategies()
    ]);

    if (preflopOk) console.log('[GTO Dojo] Preflop data ready');
    else console.warn('[GTO Dojo] Preflop data failed');

    if (postflopOk) console.log('[GTO Dojo] Postflop data ready');
    else console.warn('[GTO Dojo] Postflop data failed');

    if (!preflopOk || !postflopOk) {
        UI.showToast('⚠️ 一部のGTOデータの読み込みに失敗しました');
    }

    // ホーム画面スタッツ初期化
    UI.updateHomeStats();

    // Service Worker 登録
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            console.log('[GTO Dojo] Service Worker registered:', reg.scope);
        } catch (e) {
            console.warn('[GTO Dojo] Service Worker registration failed:', e);
        }
    }

    console.log('[GTO Dojo] Ready! 🥋');
});
