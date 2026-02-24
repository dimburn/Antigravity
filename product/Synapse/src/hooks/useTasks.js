// タスクフック
import { useEffect, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from './useAuth';
import { isToday, isPast, startOfDay } from 'date-fns';

/**
 * タスクを使用するフック
 * @param {string} projectId 
 */
export function useTasks(projectId) {
    const {
        tasks,
        taskTree,
        loading,
        error,
        subscribeToTasks,
        addTask,
        updateTask,
        deleteTask,
        batchUpdateTasks,
        clearError,
    } = useProjectStore();

    useEffect(() => {
        if (projectId) {
            const unsubscribe = subscribeToTasks(projectId);
            return () => unsubscribe?.();
        }
    }, [projectId, subscribeToTasks]);

    return {
        tasks,
        taskTree,
        loading,
        error,
        addTask: (parentId = null) => addTask(projectId, parentId),
        updateTask: (taskId, data) => updateTask(projectId, taskId, data),
        deleteTask: (taskId) => deleteTask(projectId, taskId),
        batchUpdateTasks: (updates) => batchUpdateTasks(projectId, updates),
        clearError,
    };
}

/**
 * フィルター済みタスクを取得するフック（モバイル用）
 * @param {string} projectId 
 * @param {string} filter - 'today' | 'delayed' | 'mine' | 'all'
 */
export function useFilteredTasks(projectId, filter = 'all') {
    const { tasks, loading, error } = useTasks(projectId);
    const { user } = useAuth();

    const filteredTasks = useMemo(() => {
        if (!tasks || tasks.length === 0) return [];

        const today = startOfDay(new Date());

        switch (filter) {
            case 'today':
                // 今日が期限のタスク、または今日進行中のタスク
                return tasks.filter(task => {
                    if (task.status === 'completed') return false;
                    const endDate = new Date(task.endDate);
                    const startDate = new Date(task.startDate);
                    return isToday(endDate) || (startDate <= today && endDate >= today);
                });

            case 'delayed':
                // 期限超過で未完了のタスク
                return tasks.filter(task => {
                    if (task.status === 'completed') return false;
                    const endDate = new Date(task.endDate);
                    return isPast(endDate) && !isToday(endDate);
                });

            case 'mine':
                // 自分が担当のタスク
                return tasks.filter(task =>
                    task.assigneeId === user?.uid && task.status !== 'completed'
                );

            case 'all':
            default:
                return tasks.filter(task => task.status !== 'completed');
        }
    }, [tasks, filter, user?.uid]);

    // 統計情報
    const stats = useMemo(() => {
        const today = startOfDay(new Date());

        return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            delayed: tasks.filter(t => {
                if (t.status === 'completed') return false;
                const endDate = new Date(t.endDate);
                return isPast(endDate) && !isToday(endDate);
            }).length,
            todayDue: tasks.filter(t => {
                if (t.status === 'completed') return false;
                return isToday(new Date(t.endDate));
            }).length,
        };
    }, [tasks]);

    return {
        tasks: filteredTasks,
        stats,
        loading,
        error,
    };
}
