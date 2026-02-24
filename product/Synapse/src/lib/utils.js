// ユーティリティ関数

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * クラス名をマージするユーティリティ
 * Tailwindのクラス衝突を解決
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * 日付フォーマット
 * @param {Date} date 
 * @param {string} format - 'short' | 'long' | 'iso'
 */
export function formatDate(date, format = 'short') {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);

    switch (format) {
        case 'short':
            return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
        case 'long':
            return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
        case 'iso':
            return d.toISOString().split('T')[0];
        default:
            return d.toLocaleDateString('ja-JP');
    }
}

/**
 * 進捗率からステータス色を取得
 * @param {number} progress - 0-100
 */
export function getProgressColor(progress) {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-slate-500';
}

/**
 * ステータスの表示名を取得
 * @param {string} status 
 */
export function getStatusLabel(status) {
    const labels = {
        'not_started': '未着手',
        'in_progress': '進行中',
        'completed': '完了',
        'on_hold': '保留中',
    };
    return labels[status] || status;
}

/**
 * 優先度の表示名を取得
 * @param {string} priority 
 */
export function getPriorityLabel(priority) {
    const labels = {
        'low': '低',
        'medium': '中',
        'high': '高',
        'critical': '緊急',
    };
    return labels[priority] || priority;
}

/**
 * 遅延日数を計算
 * @param {Date} endDate 
 * @param {number} progress 
 */
export function getDelayDays(endDate, progress) {
    if (progress >= 100) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const diff = today - end;
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

/**
 * デバイスタイプを判定
 */
export function isMobileDevice() {
    return window.innerWidth < 1024;
}

/**
 * IDを生成
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
