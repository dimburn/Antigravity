/**
 * GTO Dojo — 成績管理モジュール
 * localStorage を使用して成績データを永続化
 */

const Stats = (() => {
    const STORAGE_KEY = 'gto_dojo_stats';
    const SETTINGS_KEY = 'gto_dojo_settings';
    const SESSIONS_KEY = 'gto_dojo_sessions';

    let stats = loadStats();
    let settings = loadSettings();

    // === データ読み書き ===

    function loadStats() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : getDefaultStats();
        } catch {
            return getDefaultStats();
        }
    }

    function saveStats() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }

    function getDefaultStats() {
        return {
            totalHands: 0,
            gtoMatches: 0,
            totalEvLoss: 0,
            sessionCount: 0,
            byPosition: {},
            bySpot: {}
        };
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? JSON.parse(raw) : { playerName: 'Hero' };
        } catch {
            return { playerName: 'Hero' };
        }
    }

    function saveSetting(key, value) {
        settings[key] = value;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function getSetting(key) {
        return settings[key];
    }

    // === セッション管理 ===

    function getSessions() {
        try {
            const raw = localStorage.getItem(SESSIONS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveSession(session) {
        const sessions = getSessions();
        sessions.unshift(session);
        // 最新100セッションまで保持
        if (sessions.length > 100) sessions.length = 100;
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
        stats.sessionCount = sessions.length;
        saveStats();
    }

    // === ハンド結果の記録 ===

    function recordHand(result) {
        stats.totalHands++;

        if (result.match) {
            stats.gtoMatches++;
        }

        stats.totalEvLoss += result.evLoss || 0;

        // ポジション別
        const pos = result.position || 'unknown';
        if (!stats.byPosition[pos]) {
            stats.byPosition[pos] = { hands: 0, matches: 0, evLoss: 0 };
        }
        stats.byPosition[pos].hands++;
        if (result.match) stats.byPosition[pos].matches++;
        stats.byPosition[pos].evLoss += result.evLoss || 0;

        // スポット別
        const spot = result.spot || 'RFI';
        if (!stats.bySpot[spot]) {
            stats.bySpot[spot] = { hands: 0, matches: 0, evLoss: 0 };
        }
        stats.bySpot[spot].hands++;
        if (result.match) stats.bySpot[spot].matches++;
        stats.bySpot[spot].evLoss += result.evLoss || 0;

        saveStats();
    }

    // === 統計取得 ===

    function getGTORate() {
        if (stats.totalHands === 0) return null;
        return (stats.gtoMatches / stats.totalHands * 100).toFixed(1);
    }

    function getAvgEvLoss() {
        if (stats.totalHands === 0) return null;
        return (stats.totalEvLoss / stats.totalHands).toFixed(2);
    }

    function getTotalHands() {
        return stats.totalHands;
    }

    function getSessionCount() {
        return stats.sessionCount;
    }

    function getPositionStats() {
        return stats.byPosition;
    }

    function getSpotStats() {
        return stats.bySpot;
    }

    function getAllStats() {
        return { ...stats };
    }

    // === リセット ===

    function clearAll() {
        if (!confirm('全データをリセットしますか？この操作は元に戻せません。')) return;
        stats = getDefaultStats();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSIONS_KEY);
        saveStats();
        UI.showToast('データをリセットしました');
        UI.updateHomeStats();
        UI.updateStatsScreen();
    }

    // === 公開API ===
    return {
        recordHand,
        saveSession,
        getSessions,
        getGTORate,
        getAvgEvLoss,
        getTotalHands,
        getSessionCount,
        getPositionStats,
        getSpotStats,
        getAllStats,
        saveSetting,
        getSetting,
        clearAll
    };
})();
