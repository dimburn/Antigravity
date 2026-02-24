// CSV変換ユーティリティ
import Papa from 'papaparse';
import { formatDate } from './utils';

/**
 * タスクをCSV形式でエクスポート
 * @param {Array} tasks - タスクリスト
 * @returns {string} CSV文字列
 */
export function exportTasksToCSV(tasks) {
    const headers = [
        'WBSコード',
        'タスク名',
        '説明',
        '担当者',
        '開始日',
        '終了日',
        '予定時間',
        '実績時間',
        '進捗率',
        'ステータス',
        '優先度',
    ];

    const rows = tasks.map(task => [
        task.wbsCode,
        task.name,
        task.description || '',
        task.assigneeName || '',
        formatDate(task.startDate, 'iso'),
        formatDate(task.endDate, 'iso'),
        task.plannedHours || 0,
        task.actualHours || 0,
        task.progress || 0,
        task.status,
        task.priority,
    ]);

    return Papa.unparse({
        fields: headers,
        data: rows,
    }, {
        quotes: true,
        header: true,
    });
}

/**
 * CSVファイルからタスクをインポート
 * @param {File} file - CSVファイル
 * @returns {Promise<Array>} タスクリスト
 */
export function importTasksFromCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const tasks = results.data.map((row, index) => ({
                        wbsCode: row['WBSコード'] || String(index + 1),
                        name: row['タスク名'] || '未設定',
                        description: row['説明'] || '',
                        assigneeName: row['担当者'] || '',
                        startDate: row['開始日'] ? new Date(row['開始日']) : new Date(),
                        endDate: row['終了日'] ? new Date(row['終了日']) : new Date(),
                        plannedHours: parseFloat(row['予定時間']) || 0,
                        actualHours: parseFloat(row['実績時間']) || 0,
                        progress: parseInt(row['進捗率']) || 0,
                        status: row['ステータス'] || 'not_started',
                        priority: row['優先度'] || 'medium',
                    }));
                    resolve(tasks);
                } catch (error) {
                    reject(new Error('CSVのパースに失敗しました: ' + error.message));
                }
            },
            error: (error) => {
                reject(new Error('CSVの読み込みに失敗しました: ' + error.message));
            },
        });
    });
}

/**
 * CSVファイルをダウンロード
 * @param {string} csvContent - CSV文字列
 * @param {string} filename - ファイル名
 */
export function downloadCSV(csvContent, filename = 'tasks.csv') {
    // BOMを追加してExcelでの文字化けを防止
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
