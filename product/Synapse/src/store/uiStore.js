// UIストア (Zustand)
import { create } from 'zustand';

/**
 * UIストア
 * サイドバー開閉、モーダル状態、タスク選択などのUI状態を管理
 */
export const useUIStore = create((set, get) => ({
    // サイドバー状態
    sidebarOpen: true,

    // モーダル状態
    modalState: {
        type: null, // 'task-edit' | 'project-create' | 'task-create' | 'csv-import' | null
        data: null,
    },

    // 選択中のタスク
    selectedTaskId: null,

    // 展開されているタスク（WBSツリー用）
    expandedTaskIds: new Set(),

    // モバイルフィルター
    mobileFilter: 'today', // 'today' | 'delayed' | 'mine' | 'all'

    // トースト通知
    toasts: [],

    // ===== アクション =====

    /**
     * サイドバーの開閉
     */
    toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    /**
     * モーダルを開く
     */
    openModal: (type, data = null) => set({ modalState: { type, data } }),

    /**
     * モーダルを閉じる
     */
    closeModal: () => set({ modalState: { type: null, data: null } }),

    /**
     * タスクを選択
     */
    selectTask: (taskId) => set({ selectedTaskId: taskId }),

    /**
     * タスクの展開/折りたたみ
     */
    toggleTaskExpand: (taskId) => set(state => {
        const newSet = new Set(state.expandedTaskIds);
        if (newSet.has(taskId)) {
            newSet.delete(taskId);
        } else {
            newSet.add(taskId);
        }
        return { expandedTaskIds: newSet };
    }),

    /**
     * すべてのタスクを展開
     */
    expandAllTasks: (taskIds) => set({ expandedTaskIds: new Set(taskIds) }),

    /**
     * すべてのタスクを折りたたむ
     */
    collapseAllTasks: () => set({ expandedTaskIds: new Set() }),

    /**
     * モバイルフィルターを変更
     */
    setMobileFilter: (filter) => set({ mobileFilter: filter }),

    /**
     * トースト通知を追加
     */
    addToast: (toast) => {
        const id = Date.now();
        set(state => ({
            toasts: [...state.toasts, { ...toast, id }],
        }));

        // 自動で消去
        setTimeout(() => {
            get().removeToast(id);
        }, toast.duration || 3000);

        return id;
    },

    /**
     * トースト通知を削除
     */
    removeToast: (id) => set(state => ({
        toasts: state.toasts.filter(t => t.id !== id),
    })),
}));
