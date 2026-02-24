// メインアプリケーション
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { ProjectList } from '@/pages/ProjectList';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { MobileDashboard } from '@/pages/MobileDashboard';
import { WBSEditor } from '@/components/pc/WBSEditor';
import { GanttChart } from '@/components/pc/GanttChart';
import { TaskEditModal } from '@/components/pc/TaskEditModal';
import { ProjectModal } from '@/components/pc/ProjectModal';
import { CSVImportModal, CSVExportModal } from '@/components/pc/CSVHandler';
import { useAuth } from '@/hooks/useAuth';
import { useProjectStore } from '@/store/projectStore';

// 認証が必要なルートのラッパー
function PrivateRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-10 w-10 border-2 border-primary-500 border-t-transparent rounded-full" />
                    <p className="text-slate-400">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

// メンバー管理ページ（プレースホルダー）
function MembersPage() {
    return (
        <div className="text-center py-12 text-slate-400">
            <p>メンバー管理機能は今後実装予定です</p>
        </div>
    );
}

// 設定ページ（プレースホルダー）
function SettingsPage() {
    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold text-white mb-6">設定</h1>
            <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <h3 className="font-medium text-white mb-2">アプリ情報</h3>
                    <p className="text-sm text-slate-400">Synapse WBS Project Manager v0.1.0</p>
                </div>
            </div>
        </div>
    );
}

// マイタスクページ（モバイル用）
function MyTasksPage() {
    return (
        <div className="text-center py-12 text-slate-400">
            <p>プロジェクトを選択してタスクを確認してください</p>
        </div>
    );
}

function App() {
    const { unsubscribeAll } = useProjectStore();

    // クリーンアップ
    useEffect(() => {
        return () => {
            unsubscribeAll();
        };
    }, [unsubscribeAll]);

    return (
        <BrowserRouter>
            <Routes>
                {/* 公開ルート */}
                <Route path="/login" element={<Login />} />

                {/* 認証が必要なルート */}
                <Route element={<PrivateRoute />}>
                    <Route element={<Layout />}>
                        {/* ダッシュボード */}
                        <Route path="/" element={<Dashboard />} />

                        {/* プロジェクト */}
                        <Route path="/projects" element={<ProjectList />} />
                        <Route path="/projects/:projectId" element={<ProjectDetail />}>
                            {/* プロジェクト詳細の子ルート（PC版） */}
                            <Route index element={<WBSEditor />} />
                            <Route path="wbs" element={<WBSEditor />} />
                            <Route path="gantt" element={<GanttChart />} />
                            <Route path="members" element={<MembersPage />} />
                        </Route>

                        {/* モバイル版プロジェクトダッシュボード */}
                        <Route path="/projects/:projectId/mobile" element={<MobileDashboard />} />

                        {/* マイタスク（モバイル用） */}
                        <Route path="/my-tasks" element={<MyTasksPage />} />

                        {/* 設定 */}
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Route>

                {/* 404リダイレクト */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
