// WBS関連のユーティリティ関数

/**
 * タスクリストをツリー構造に変換
 * @param {Array} tasks - フラットなタスクリスト
 * @returns {Array} ツリー構造のタスク
 */
export function buildTaskTree(tasks) {
    const taskMap = new Map();
    const tree = [];

    // まずすべてのタスクをマップに登録
    tasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [] });
    });

    // 親子関係を構築
    tasks.forEach(task => {
        const node = taskMap.get(task.id);
        if (task.parentId && taskMap.has(task.parentId)) {
            taskMap.get(task.parentId).children.push(node);
        } else {
            tree.push(node);
        }
    });

    // 各階層をorderでソート
    const sortByOrder = (nodes) => {
        nodes.sort((a, b) => a.order - b.order);
        nodes.forEach(node => {
            if (node.children.length > 0) {
                sortByOrder(node.children);
            }
        });
    };

    sortByOrder(tree);
    return tree;
}

/**
 * ツリー構造をフラットなリストに変換
 * @param {Array} tree - ツリー構造のタスク
 * @returns {Array} フラットなタスクリスト
 */
export function flattenTaskTree(tree) {
    const result = [];

    const traverse = (nodes, level = 0) => {
        nodes.forEach(node => {
            const { children, ...task } = node;
            result.push({ ...task, level });
            if (children && children.length > 0) {
                traverse(children, level + 1);
            }
        });
    };

    traverse(tree);
    return result;
}

/**
 * WBSコードを生成
 * @param {string} parentWbsCode - 親タスクのWBSコード
 * @param {number} childIndex - 子タスクの順番（0始まり）
 * @returns {string} WBSコード
 */
export function generateWbsCode(parentWbsCode, childIndex) {
    const index = childIndex + 1;
    if (!parentWbsCode) {
        return String(index);
    }
    return `${parentWbsCode}.${index}`;
}

/**
 * WBSコードを再計算
 * @param {Array} tree - ツリー構造のタスク
 * @returns {Array} WBSコード更新済みのツリー
 */
export function recalculateWbsCodes(tree) {
    const updateCodes = (nodes, parentCode = '') => {
        return nodes.map((node, index) => {
            const wbsCode = generateWbsCode(parentCode, index);
            return {
                ...node,
                wbsCode,
                children: node.children?.length > 0
                    ? updateCodes(node.children, wbsCode)
                    : [],
            };
        });
    };

    return updateCodes(tree);
}

/**
 * タスクの移動を処理
 * @param {Array} tree - ツリー構造
 * @param {string} taskId - 移動するタスクのID
 * @param {string} newParentId - 新しい親タスクのID（nullならルート）
 * @param {number} newIndex - 新しい位置
 * @returns {Array} 更新されたツリー
 */
export function moveTask(tree, taskId, newParentId, newIndex) {
    // タスクを探して削除
    let movedTask = null;

    const removeTask = (nodes) => {
        return nodes.filter(node => {
            if (node.id === taskId) {
                movedTask = { ...node };
                return false;
            }
            if (node.children) {
                node.children = removeTask(node.children);
            }
            return true;
        });
    };

    let newTree = removeTask([...tree]);

    if (!movedTask) return tree;

    // 新しい位置に挿入
    if (newParentId === null) {
        // ルートレベルに挿入
        newTree.splice(newIndex, 0, { ...movedTask, parentId: null });
    } else {
        // 親タスクの子として挿入
        const insertIntoParent = (nodes) => {
            return nodes.map(node => {
                if (node.id === newParentId) {
                    const children = [...(node.children || [])];
                    children.splice(newIndex, 0, { ...movedTask, parentId: newParentId });
                    return { ...node, children };
                }
                if (node.children) {
                    return { ...node, children: insertIntoParent(node.children) };
                }
                return node;
            });
        };
        newTree = insertIntoParent(newTree);
    }

    // order値を再計算
    const updateOrder = (nodes) => {
        return nodes.map((node, index) => ({
            ...node,
            order: index,
            children: node.children ? updateOrder(node.children) : [],
        }));
    };

    return recalculateWbsCodes(updateOrder(newTree));
}

/**
 * 新しいタスクを作成
 * @param {Object} data - タスクデータ
 * @returns {Object} タスクオブジェクト
 */
export function createTask(data = {}) {
    return {
        id: data.id || null, // Firestoreで生成
        wbsCode: data.wbsCode || '',
        name: data.name || '新しいタスク',
        description: data.description || '',
        parentId: data.parentId || null,
        order: data.order || 0,
        level: data.level || 0,
        assigneeId: data.assigneeId || null,
        startDate: data.startDate || new Date(),
        endDate: data.endDate || new Date(),
        plannedHours: data.plannedHours || 0,
        actualHours: data.actualHours || 0,
        progress: data.progress || 0,
        status: data.status || 'not_started',
        priority: data.priority || 'medium',
        dependencies: data.dependencies || [],
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
    };
}
