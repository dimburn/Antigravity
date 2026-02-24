// ページ: プロジェクト一覧
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Clock, Users, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { TaskStatusBadge } from '@/components/shared/TaskStatusBadge';
import { useProjects } from '@/hooks/useProjects';
import { useUIStore } from '@/store/uiStore';
import { formatDate } from '@/lib/utils';

export function ProjectList() {
    const { projects, loading, deleteProject } = useProjects();
    const { openModal } = useUIStore();

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">プロジェクト</h1>
                    <p className="text-slate-400 mt-1">{projects.length} プロジェクト</p>
                </div>

                <Button onClick={() => openModal('project-create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    新規作成
                </Button>
            </div>

            {/* プロジェクトリスト */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-5 bg-slate-700 rounded w-3/4 mb-3" />
                                <div className="h-3 bg-slate-700 rounded w-1/2 mb-4" />
                                <div className="h-2 bg-slate-700 rounded w-full mb-2" />
                                <div className="h-2 bg-slate-700 rounded w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : projects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onEdit={() => openModal('project-edit', project)}
                            onDelete={() => {
                                if (confirm('このプロジェクトを削除しますか？')) {
                                    deleteProject(project.id);
                                }
                            }}
                        />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-12 text-center">
                        <FolderKanban className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">プロジェクトがありません</h3>
                        <p className="text-slate-400 mb-6">最初のプロジェクトを作成して始めましょう</p>
                        <Button onClick={() => openModal('project-create')}>
                            <Plus className="h-4 w-4 mr-2" />
                            プロジェクトを作成
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// プロジェクトカード
function ProjectCard({ project, onEdit, onDelete }) {
    const [showMenu, setShowMenu] = React.useState(false);

    return (
        <Card className="card-hover group relative">
            <CardContent className="p-5">
                {/* メニューボタン */}
                <div className="absolute top-3 right-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowMenu(!showMenu);
                        }}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>

                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                                <button
                                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowMenu(false);
                                        onEdit();
                                    }}
                                >
                                    <Edit className="h-4 w-4" />
                                    編集
                                </button>
                                <button
                                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 rounded-b-lg"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowMenu(false);
                                        onDelete();
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    削除
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <Link to={`/projects/${project.id}/wbs`}>
                    <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/30">
                            <FolderKanban className="h-5 w-5 text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">{project.name}</h3>
                            <TaskStatusBadge
                                status={project.status === 'active' ? 'in_progress' : 'completed'}
                                showIcon={false}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-4 line-clamp-2 min-h-[2.5rem]">
                        {project.description || '説明なし'}
                    </p>

                    <ProgressBar value={project.progress || 0} showLabel={false} size="sm" />

                    <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(project.endDate || project.updatedAt, 'short')}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {project.members?.length || 1}
                        </span>
                    </div>
                </Link>
            </CardContent>
        </Card>
    );
}
