// PC専用コンポーネント: CSVハンドラー
import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { exportTasksToCSV, importTasksFromCSV, downloadCSV } from '@/lib/csv';

export function CSVImportModal({ projectId }) {
    const { modalState, closeModal, addToast } = useUIStore();
    const { tasks, batchUpdateTasks, addTask } = useProjectStore();
    const fileInputRef = useRef(null);

    const isOpen = modalState.type === 'csv-import';
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);

        try {
            const importedTasks = await importTasksFromCSV(selectedFile);
            setPreview(importedTasks.slice(0, 5)); // 最初の5件をプレビュー
        } catch (err) {
            setError(err.message);
            setPreview([]);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const importedTasks = await importTasksFromCSV(file);

            // TODO: インポート処理（Firestoreへの保存）
            // 現時点では簡易的にログ出力
            console.log('Imported tasks:', importedTasks);

            addToast({
                title: 'インポート完了',
                description: `${importedTasks.length}件のタスクをインポートしました`,
                type: 'success',
            });

            closeModal();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={closeModal}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        <Upload className="h-5 w-5 inline mr-2" />
                        CSVインポート
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* ファイル選択 */}
                    <div
                        className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {file ? (
                            <div className="space-y-2">
                                <FileSpreadsheet className="h-12 w-12 text-primary-400 mx-auto" />
                                <p className="text-white font-medium">{file.name}</p>
                                <p className="text-sm text-slate-400">
                                    クリックして別のファイルを選択
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="h-12 w-12 text-slate-500 mx-auto" />
                                <p className="text-slate-300">CSVファイルをドロップまたはクリック</p>
                                <p className="text-sm text-slate-500">
                                    .csv形式のファイルをアップロード
                                </p>
                            </div>
                        )}
                    </div>

                    {/* エラー表示 */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* プレビュー */}
                    {preview.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-slate-300 mb-2">
                                プレビュー（最初の5件）
                            </p>
                            <div className="bg-slate-800/50 rounded-lg p-3 max-h-40 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-500">
                                            <th className="pb-2">WBS</th>
                                            <th className="pb-2">タスク名</th>
                                            <th className="pb-2">ステータス</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-300">
                                        {preview.map((task, i) => (
                                            <tr key={i}>
                                                <td className="py-1 font-mono text-xs">{task.wbsCode}</td>
                                                <td className="py-1">{task.name}</td>
                                                <td className="py-1">{task.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 注意事項 */}
                    <div className="text-xs text-slate-500">
                        <p>※ WBSコード、タスク名、説明、担当者、開始日、終了日、予定時間、実績時間、進捗率、ステータス、優先度 の列が必要です</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={closeModal}>
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || loading || !!error}
                    >
                        {loading ? 'インポート中...' : 'インポート'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CSVExportModal({ projectId }) {
    const { modalState, closeModal, addToast } = useUIStore();
    const { tasks } = useProjectStore();

    const isOpen = modalState.type === 'csv-export';
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);

        try {
            const csv = exportTasksToCSV(tasks);
            const filename = `wbs_export_${new Date().toISOString().split('T')[0]}.csv`;
            downloadCSV(csv, filename);

            addToast({
                title: 'エクスポート完了',
                description: `${tasks.length}件のタスクをエクスポートしました`,
                type: 'success',
            });

            closeModal();
        } catch (err) {
            addToast({
                title: 'エクスポート失敗',
                description: err.message,
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={closeModal}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        <Download className="h-5 w-5 inline mr-2" />
                        CSVエクスポート
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <FileSpreadsheet className="h-10 w-10 text-primary-400" />
                            <div>
                                <p className="font-medium text-white">WBSデータをCSVでエクスポート</p>
                                <p className="text-sm text-slate-400">{tasks.length}件のタスク</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500">
                            Excelなどのスプレッドシートソフトで開くことができます。
                            BOM付きUTF-8形式で出力されるため、日本語も正しく表示されます。
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={closeModal}>
                        キャンセル
                    </Button>
                    <Button onClick={handleExport} disabled={loading || tasks.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        {loading ? 'エクスポート中...' : 'ダウンロード'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
