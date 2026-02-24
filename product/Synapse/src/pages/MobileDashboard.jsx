// ページ: モバイルダッシュボード
import React from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, AlertTriangle, User, ListTodo, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TaskStatusBadge, statusOptions } from '@/components/shared/TaskStatusBadge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useFilteredTasks } from '@/hooks/useTasks';
import { useProject } from '@/hooks/useProjects';
import { useUIStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { formatDate, getDelayDays } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function MobileDashboard() {
    const { projectId } = useParams();
    const { project } = useProject(projectId);
    const { mobileFilter, setMobileFilter, openModal } = useUIStore();
    const { tasks, stats, loading } = useFilteredTasks(projectId, mobileFilter);

    const filters = [
        { value: 'today', label: '今日', icon: CalendarDays, count: stats.todayDue },
        { value: 'delayed', label: '遅延', icon: AlertTriangle, count: stats.delayed },
        { value: 'mine', label: '担当', icon: User, count: 0 },
        { value: 'all', label: '全て', icon: ListTodo, count: stats.total - stats.completed },
    ];

    return (
        <div className="space-y-4 pb-4">
            {/* プロジェクト名 */}
            <div className="text-center py-2">
                <h1 className="text-lg font-semibold text-white">{project?.name || 'プロジェクト'}</h1>
                <p className="text-xs text-slate-500">{formatDate(new Date(), 'long')}</p>
            </div>

            {/* 進捗サマリー */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">全体進捗</span>
                        <span className="text-sm text-slate-400">
                            {stats.completed} / {stats.total}
                        </span>
                    </div>
                    <ProgressBar
                        value={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
                        showLabel={false}
                        size="md"
                    />
                </CardContent>
            </Card>

            {/* フィルタータブ */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setMobileFilter(filter.value)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                            mobileFilter === filter.value
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        )}
                    >
                        <filter.icon className="h-4 w-4" />
                        {filter.label}
                        {filter.count > 0 && (
                            <span className={cn(
                                'px-1.5 py-0.5 text-xs rounded-full',
                                mobileFilter === filter.value
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-700 text-slate-300'
                            )}>
                                {filter.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* タスクリスト */}
            <div className="space-y-3">
                {loading ? (
                    // ローディングスケルトン
                    [...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-slate-700 rounded w-1/2 mb-3" />
                                <div className="h-2 bg-slate-700 rounded w-full" />
                            </CardContent>
                        </Card>
                    ))
                ) : tasks.length > 0 ? (
                    tasks.map((task) => (
                        <MobileTaskCard
                            key={task.id}
                            task={task}
                            projectId={projectId}
                        />
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <ListTodo className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">タスクがありません</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// モバイルタスクカード
function MobileTaskCard({ task, projectId }) {
    const { updateTask } = useProjectStore();
    const [showActions, setShowActions] = React.useState(false);

    const delayDays = getDelayDays(task.endDate, task.progress);
    const isDelayed = delayDays > 0;

    const handleStatusChange = async (newStatus) => {
        await updateTask(projectId, task.id, { status: newStatus });
        setShowActions(false);
    };

    const handleProgressChange = async (delta) => {
        const newProgress = Math.min(100, Math.max(0, task.progress + delta));
        await updateTask(projectId, task.id, {
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : task.status === 'not_started' ? 'in_progress' : task.status
        });
    };

    return (
        <Card className={cn(
            'transition-all',
            isDelayed && 'border-red-500/50 bg-red-500/5'
        )}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500 font-mono">{task.wbsCode}</span>
                            {isDelayed && (
                                <span className="text-xs text-red-400 font-medium">
                                    {delayDays}日遅延
                                </span>
                            )}
                        </div>
                        <h3 className="font-medium text-white truncate">{task.name}</h3>
                    </div>
                    <TaskStatusBadge status={task.status} showIcon={false} />
                </div>

                <ProgressBar value={task.progress} size="sm" className="mb-3" />

                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>期限: {formatDate(task.endDate, 'short')}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-primary-400"
                        onClick={() => setShowActions(!showActions)}
                    >
                        クイックアクション
                        <ChevronRight className={cn('h-4 w-4 ml-1 transition-transform', showActions && 'rotate-90')} />
                    </Button>
                </div>

                {/* クイックアクション */}
                {showActions && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                        {/* ステータス変更 */}
                        <div>
                            <p className="text-xs text-slate-500 mb-2">ステータス変更</p>
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleStatusChange(option.value)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                            task.status === option.value
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 進捗更新 */}
                        <div>
                            <p className="text-xs text-slate-500 mb-2">進捗率 ({task.progress}%)</p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleProgressChange(-10)}
                                    disabled={task.progress <= 0}
                                >
                                    -10%
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleProgressChange(10)}
                                    disabled={task.progress >= 100}
                                >
                                    +10%
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleStatusChange('completed')}
                                    className="ml-auto"
                                >
                                    <Check className="h-4 w-4 mr-1" />
                                    完了
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
