// ページ: プロジェクト詳細（PC版メイン）
import React from 'react';
import { useParams, NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { ListTree, BarChart3, Users, Settings, Download, Upload, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject, useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useUIStore } from '@/store/uiStore';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

export function ProjectDetail() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { projects, loading: projectsLoading } = useProjects(); // プロジェクト一覧の購読を開始
    const { project } = useProject(projectId);
    const { addTask } = useTasks(projectId);
    const { openModal } = useUIStore();
    const { deleteProject } = useProjects();
    const isDesktop = useIsDesktop();
    const [showMenu, setShowMenu] = React.useState(false);

    // モバイルデバイスの場合はモバイル版にリダイレクト
    if (!isDesktop) {
        return <Navigate to={`/projects/${projectId}/mobile`} replace />;
    }

    // プロジェクト一覧がまだ読み込み中の場合（初回ロード時のみ）
    if (projects.length === 0 && projectsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-400">プロジェクトを読み込み中...</p>
                </div>
            </div>
        );
    }

    // プロジェクトが見つからない場合
    if (!project) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-slate-400 mb-4">プロジェクトが見つかりません</p>
                    <p className="text-slate-500 text-sm">プロジェクトID: {projectId}</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { to: `/projects/${projectId}/wbs`, label: 'WBS', icon: ListTree },
        { to: `/projects/${projectId}/gantt`, label: 'ガントチャート', icon: BarChart3 },
        { to: `/projects/${projectId}/members`, label: 'メンバー', icon: Users },
    ];

    return (
        <div className="space-y-6">
            {/* プロジェクトヘッダー */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                        <p className="text-slate-400 mt-1">{project.description || '説明なし'}</p>
                    </div>

                    {/* プロジェクトメニュー（編集・削除） */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute left-0 mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                                    <button
                                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                                        onClick={() => {
                                            setShowMenu(false);
                                            openModal('project-edit', project);
                                        }}
                                    >
                                        <Edit className="h-4 w-4" />
                                        プロジェクト編集
                                    </button>
                                    <button
                                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 rounded-b-lg"
                                        onClick={() => {
                                            setShowMenu(false);
                                            if (confirm('このプロジェクトを削除しますか？')) {
                                                deleteProject(project.id);
                                                // ダッシュボードにリダイレクト
                                                navigate('/', { replace: true });
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        プロジェクト削除
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => openModal('csv-import')}>
                        <Upload className="h-4 w-4 mr-2" />
                        CSVインポート
                    </Button>
                    <Button variant="outline" onClick={() => openModal('csv-export')}>
                        <Download className="h-4 w-4 mr-2" />
                        CSVエクスポート
                    </Button>
                    <Button onClick={async () => await addTask()}>
                        <Plus className="h-4 w-4 mr-2" />
                        タスク追加
                    </Button>
                </div>
            </div>

            {/* タブナビゲーション */}
            <div className="border-b border-slate-700/50">
                <nav className="flex gap-1">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.to}
                            to={tab.to}
                            end={tab.end}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                    isActive
                                        ? 'border-primary-500 text-primary-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                )
                            }
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* コンテンツ（子ルート） */}
            <Outlet context={{ projectId, project }} />
        </div>
    );
}
