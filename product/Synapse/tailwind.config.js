/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // プライマリカラー（青系）
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
                // アクセントカラー（紫系）
                accent: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#a855f7',
                    600: '#9333ea',
                    700: '#7c3aed',
                    800: '#6b21a8',
                    900: '#581c87',
                },
                // ステータスカラー
                status: {
                    'not-started': '#94a3b8',    // slate-400
                    'in-progress': '#3b82f6',    // blue-500
                    'completed': '#22c55e',      // green-500
                    'on-hold': '#f59e0b',        // amber-500
                    'delayed': '#ef4444',        // red-500
                },
                // 優先度カラー
                priority: {
                    low: '#94a3b8',
                    medium: '#3b82f6',
                    high: '#f59e0b',
                    critical: '#ef4444',
                },
            },
            // ガントチャート用のグリッド設定
            spacing: {
                'gantt-day': '40px',
                'gantt-week': '280px',
            },
            // レスポンシブブレークポイント
            screens: {
                'xs': '475px',
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px',
            },
            // アニメーション
            animation: {
                'slide-in': 'slideIn 0.3s ease-out',
                'fade-in': 'fadeIn 0.2s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                slideIn: {
                    '0%': { transform: 'translateX(-10px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
