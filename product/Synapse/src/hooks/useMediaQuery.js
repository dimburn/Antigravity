// メディアクエリフック
import { useState, useEffect } from 'react';

/**
 * メディアクエリを監視するフック
 * @param {string} query - CSSメディアクエリ
 * @returns {boolean} マッチするかどうか
 */
export function useMediaQuery(query) {
    // 初期値をクライアントサイドで正確に設定
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const media = window.matchMedia(query);

        // 初期値を設定
        setMatches(media.matches);

        // リスナーを設定
        const listener = (event) => {
            setMatches(event.matches);
        };

        media.addEventListener('change', listener);

        return () => {
            media.removeEventListener('change', listener);
        };
    }, [query]);

    return matches;
}

/**
 * PC表示かどうかを判定
 * @returns {boolean}
 */
export function useIsDesktop() {
    return useMediaQuery('(min-width: 1024px)');
}

/**
 * タブレット表示かどうかを判定
 * @returns {boolean}
 */
export function useIsTablet() {
    return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * モバイル表示かどうかを判定
 * @returns {boolean}
 */
export function useIsMobile() {
    return useMediaQuery('(max-width: 767px)');
}
