// ページ: ダッシュボード
import React from 'react';
import { Link } from 'react-router-dom';
import {
    FolderKanban,
    ListTodo,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { TaskStatusBadge } from '@/components/shared/TaskStatusBadge';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { formatDate } from '@/lib/utils';

export function Dashboard() {
    const { user } = useAuth();
    const { projects, loading } = useProjects();
    const { openModal } = useUIStore();
    const isDesktop = useIsDesktop();

    // 統計情報
    const stats = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalTasks: 0,
        completedTasks: 0,
        delayedTasks: 0,
        todayTasks: 0,
    };

    const progressPercent = stats.totalTasks > 0
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* ウェルカムヘッダー */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        おかえりなさい、{user?.displayName?.split(' ')[0] || 'ユーザー'}さん
                    </h1>
                    <p className="text-slate-400 mt-1">
                        {formatDate(new Date(), 'long')}
                    </p>
                </div>

                {isDesktop && (
                    <Button onClick={() => openModal('project-create')}>
                        <Plus className="h-4 w-4 mr-2" />
                        新規プロジェクト
                    </Button>
                )}
            </div>

            {/* 統計カード */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={FolderKanban}
                    label="アクティブプロジェクト"
                    value={stats.activeProjects}
                    color="primary"
                    to="/projects"
                />
                <StatCard
                    icon={ListTodo}
                    label="今日のタスク"
                    value={stats.todayTasks}
                    color="blue"
                    to="/projects"
                />
                <StatCard
                    icon={AlertTriangle}
                    label="遅延タスク"
                    value={stats.delayedTasks}
                    color="red"
                    to="/projects"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="完了タスク"
                    value={stats.completedTasks}
                    color="green"
                    to="/projects"
                />
            </div>

            {/* 全体進捗 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">全体進捗</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProgressBar value={progressPercent} size="lg" />
                    <p className="text-sm text-slate-400 mt-2">
                        {stats.completedTasks} / {stats.totalTasks} タスク完了
                    </p>
                </CardContent>
            </Card>

            {/* プロジェクト一覧 */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">最近のプロジェクト</h2>
                    <Link to="/projects" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                        すべて表示 <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="p-6">
                                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
                                    <div className="h-3 bg-slate-700 rounded w-1/2 mb-4" />
                                    <div className="h-2 bg-slate-700 rounded w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : projects.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.slice(0, 6).map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <FolderKanban className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 mb-4">プロジェクトがありません</p>
                            <Button onClick={() => openModal('project-create')}>
                                <Plus className="h-4 w-4 mr-2" />
                                最初のプロジェクトを作成
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// 統計カード
function StatCard({ icon: Icon, label, value, color, to }) {
    const colorClasses = {
        primary: 'from-primary-500/20 to-primary-600/10 border-primary-500/30 text-primary-400 hover:border-primary-500/50',
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400 hover:border-blue-500/50',
        red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400 hover:border-red-500/50',
        green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400 hover:border-green-500/50',
    };

    const Content = (
        <Card className={`bg-gradient-to-br ${colorClasses[color]} border transition-all hover:shadow-lg h-full`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{value}</p>
                        <p className="text-xs text-slate-400">{label}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (to) {
        return <Link to={to} className="block h-full">{Content}</Link>;
    }
    return Content;
}

// プロジェクトカード
function ProjectCard({ project }) {
    return (
        <Link to={`/projects/${project.id}/wbs`}>
            <Card className="card-hover h-full transition-all hover:border-primary-500/50 hover:shadow-md">
                <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-white truncate flex-1">{project.name}</h3>
                        <TaskStatusBadge status={project.status === 'active' ? 'in_progress' : 'completed'} showIcon={false} />
                    </div>

                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                        {project.description || '説明なし'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(project.endDate || project.updatedAt, 'short')}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
