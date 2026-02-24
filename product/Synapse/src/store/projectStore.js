// プロジェクト・タスクストア (Zustand)
import { create } from 'zustand';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildTaskTree, recalculateWbsCodes, createTask } from '@/lib/wbs';

/**
 * プロジェクトストア
 * プロジェクトとタスクの状態を管理
 */
export const useProjectStore = create((set, get) => ({
    // 状態
    projects: [],
    currentProject: null,
    tasks: [],
    taskTree: [],
    loading: false,
    error: null,

    // Unsubscribe関数を保持
    _unsubscribeProjects: null,
    _unsubscribeTasks: null,

    // ===== プロジェクト関連 =====

    /**
     * ユーザーのプロジェクト一覧を購読
     */
    subscribeToProjects: (userId) => {
        const currentUnsub = get()._unsubscribeProjects;
        // 既に購読中の場合は何もしない（重複購読を防止）
        if (currentUnsub) {
            return currentUnsub;
        }

        set({ loading: true });

        const q = query(
            collection(db, 'projects'),
            where('members', 'array-contains', userId)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const projects = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                set({ projects, loading: false });
            },
            (error) => {
                set({ error: error.message, loading: false });
            }
        );

        // unsubscribeをラップして_unsubscribeProjectsをクリアする
        const wrappedUnsubscribe = () => {
            unsubscribe();
            set({ _unsubscribeProjects: null });
        };

        set({ _unsubscribeProjects: wrappedUnsubscribe });
        return wrappedUnsubscribe;
    },

    /**
     * プロジェクトを作成
     */
    createProject: async (data, userId) => {
        try {
            const projectData = {
                name: data.name,
                description: data.description || '',
                ownerId: userId,
                members: [userId],
                startDate: data.startDate || new Date(),
                endDate: data.endDate || new Date(),
                status: 'active',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'projects'), projectData);
            return docRef.id;
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * プロジェクトを更新
     */
    updateProject: async (projectId, data) => {
        try {
            const projectRef = doc(db, 'projects', projectId);
            await updateDoc(projectRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * プロジェクトを削除
     */
    deleteProject: async (projectId) => {
        try {
            // TODO: サブコレクションのタスクも削除
            await deleteDoc(doc(db, 'projects', projectId));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * 現在のプロジェクトを設定
     */
    setCurrentProject: (project) => {
        set({ currentProject: project });
    },

    // ===== タスク関連 =====

    /**
     * プロジェクトのタスクを購読
     */
    subscribeToTasks: (projectId) => {
        const currentUnsub = get()._unsubscribeTasks;
        if (currentUnsub) currentUnsub();

        set({ loading: true, tasks: [], taskTree: [] });

        const q = query(
            collection(db, 'projects', projectId, 'tasks'),
            orderBy('order', 'asc')
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const tasks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // FirestoreのタイムスタンプをDateに変換
                    startDate: doc.data().startDate?.toDate?.() || doc.data().startDate,
                    endDate: doc.data().endDate?.toDate?.() || doc.data().endDate,
                    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                    updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
                }));

                const taskTree = buildTaskTree(tasks);
                set({ tasks, taskTree, loading: false });
            },
            (error) => {
                set({ error: error.message, loading: false });
            }
        );

        set({ _unsubscribeTasks: unsubscribe });
        return unsubscribe;
    },

    /**
     * タスクを追加
     */
    addTask: async (projectId, parentId = null) => {
        try {
            const { tasks } = get();
            const siblings = tasks.filter(t => t.parentId === parentId);
            const newOrder = siblings.length;
            const parentTask = parentId ? tasks.find(t => t.id === parentId) : null;
            const level = parentTask ? parentTask.level + 1 : 0;

            const taskData = createTask({
                parentId,
                order: newOrder,
                level,
            });

            // idは除外（Firestoreで自動生成）
            const { id, ...dataWithoutId } = taskData;

            const docRef = await addDoc(
                collection(db, 'projects', projectId, 'tasks'),
                {
                    ...dataWithoutId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }
            );

            return docRef.id;
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * タスクを更新
     */
    updateTask: async (projectId, taskId, data) => {
        try {
            const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
            await updateDoc(taskRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * タスクを削除
     */
    deleteTask: async (projectId, taskId) => {
        try {
            // 子タスクも再帰的に削除する場合は別途実装
            await deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * タスクを一括更新（ドラッグ＆ドロップ後など）
     */
    batchUpdateTasks: async (projectId, updates) => {
        try {
            const batch = writeBatch(db);

            updates.forEach(({ id, data }) => {
                const taskRef = doc(db, 'projects', projectId, 'tasks', id);
                batch.update(taskRef, {
                    ...data,
                    updatedAt: serverTimestamp(),
                });
            });

            await batch.commit();
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * 購読を解除
     */
    unsubscribeAll: () => {
        const { _unsubscribeProjects, _unsubscribeTasks } = get();
        if (_unsubscribeProjects) _unsubscribeProjects();
        if (_unsubscribeTasks) _unsubscribeTasks();
        set({
            _unsubscribeProjects: null,
            _unsubscribeTasks: null,
            projects: [],
            tasks: [],
            taskTree: [],
            currentProject: null,
        });
    },

    /**
     * エラーをクリア
     */
    clearError: () => set({ error: null }),
}));
