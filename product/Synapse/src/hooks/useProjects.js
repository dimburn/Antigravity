// プロジェクトフック
import { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from './useAuth';

/**
 * プロジェクト一覧を使用するフック
 */
export function useProjects() {
    const { user } = useAuth();
    const {
        projects,
        loading,
        error,
        subscribeToProjects,
        createProject,
        updateProject,
        deleteProject,
        clearError,
    } = useProjectStore();

    useEffect(() => {
        if (user?.uid) {
            const unsubscribe = subscribeToProjects(user.uid);
            return () => unsubscribe?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]); // subscribeToProjectsを依存配列から除外して無限ループを防止

    return {
        projects,
        loading,
        error,
        createProject: (data) => createProject(data, user?.uid),
        updateProject,
        deleteProject,
        clearError,
    };
}

/**
 * 特定のプロジェクトを使用するフック
 * @param {string} projectId 
 */
export function useProject(projectId) {
    const {
        projects,
        updateProject,
    } = useProjectStore();

    // projectsから直接プロジェクトを検索
    const project = projects.find(p => p.id === projectId) || null;

    return {
        project,
        updateProject: (data) => updateProject(projectId, data),
    };
}
