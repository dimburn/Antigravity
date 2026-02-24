// PC専用コンポーネント: WBSエディタ
import React, { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, ChevronDown, ChevronRight, GripVertical, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge } from '@/components/shared/TaskStatusBadge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useTasks } from '@/hooks/useTasks';
import { useUIStore } from '@/store/uiStore';
import { flattenTaskTree, moveTask } from '@/lib/wbs';
import { cn } from '@/lib/utils';

export function WBSEditor() {
    const { projectId } = useOutletContext();
    const { tasks, taskTree, loading, addTask, deleteTask, batchUpdateTasks } = useTasks(projectId);
    const { expandedTaskIds, toggleTaskExpand, expandAllTasks, collapseAllTasks, openModal, selectTask } = useUIStore();
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // フラット化されたタスクリスト（表示用）
    const flatTasks = flattenTaskTree(taskTree);
    const visibleTasks = flatTasks.filter(task => {
        // ルートタスクは常に表示
        if (!task.parentId) return true;
        // 親が展開されているか確認
        let parent = flatTasks.find(t => t.id === task.parentId);
        while (parent) {
            if (!expandedTaskIds.has(parent.id)) return false;
            parent = flatTasks.find(t => t.id === parent.parentId);
        }
        return true;
    });

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        // ドラッグしたタスクとドロップ先タスクを取得
        const draggedTask = flatTasks.find(t => t.id === active.id);
        const overTask = flatTasks.find(t => t.id === over.id);

        if (!draggedTask || !overTask) return;

        // 同じ親を持つ兄弟間での移動を計算
        // overTaskと同じ親の中での新しい位置を計算
        const newParentId = overTask.parentId;
        const siblings = flatTasks.filter(t => t.parentId === newParentId);
        const overIndex = siblings.findIndex(t => t.id === over.id);
        const draggedIndex = siblings.findIndex(t => t.id === active.id);

        // 移動先のインデックスを計算
        let newIndex = overIndex;
        if (draggedIndex !== -1 && draggedIndex < overIndex) {
            // 同じグループ内で下に移動する場合
            newIndex = overIndex;
        }

        // moveTask関数でツリーを更新
        const updatedTree = moveTask(taskTree, active.id, newParentId, newIndex);
        const updatedFlatTasks = flattenTaskTree(updatedTree);

        // Firestoreに一括更新するためのデータを作成
        const updates = updatedFlatTasks.map(task => ({
            id: task.id,
            data: {
                parentId: task.parentId,
                order: task.order,
                level: task.level,
                wbsCode: task.wbsCode,
            }
        }));

        try {
            await batchUpdateTasks(updates);
        } catch (error) {
            console.error('Failed to update task order:', error);
        }
    };

    const handleAddChild = async (parentId) => {
        await addTask(parentId);
        // 親を展開
        if (!expandedTaskIds.has(parentId)) {
            toggleTaskExpand(parentId);
        }
    };

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ツールバー */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => expandAllTasks(flatTasks.map(t => t.id))}>
                        すべて展開
                    </Button>
                    <Button variant="ghost" size="sm" onClick={collapseAllTasks}>
                        すべて折りたたむ
                    </Button>
                </div>
                <div className="text-sm text-slate-400">
                    {tasks.length} タスク
                </div>
            </div>

            {/* ヘッダー行 */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">タスク</div>
                <div className="col-span-2">ステータス</div>
                <div className="col-span-2">担当者</div>
                <div className="col-span-2">進捗</div>
                <div className="col-span-1">アクション</div>
            </div>

            {/* タスクリスト */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={visibleTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-1">
                        {visibleTasks.length > 0 ? (
                            visibleTasks.map((task) => (
                                <WBSTreeItem
                                    key={task.id}
                                    task={task}
                                    hasChildren={flatTasks.some(t => t.parentId === task.id)}
                                    isExpanded={expandedTaskIds.has(task.id)}
                                    onToggle={() => toggleTaskExpand(task.id)}
                                    onEdit={() => openModal('task-edit', { ...task, projectId })}
                                    onDelete={() => deleteTask(task.id)}
                                    onAddChild={() => handleAddChild(task.id)}
                                    onSelect={() => selectTask(task.id)}
                                />
                            ))
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <p className="text-slate-400 mb-4">タスクがありません</p>
                                    <Button onClick={() => addTask()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        最初のタスクを追加
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </SortableContext>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-slate-700 rounded-lg p-4 shadow-xl opacity-90">
                            {flatTasks.find(t => t.id === activeId)?.name}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

// WBSツリーアイテム（ソータブル対応）

function WBSTreeItem({ task, hasChildren, isExpanded, onToggle, onEdit, onDelete, onAddChild, onSelect }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        paddingLeft: `${(task.level || 0) * 24 + 16}px`,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all cursor-pointer',
                isDragging && 'z-50 shadow-xl'
            )}
            onClick={onSelect}
        >
            {/* タスク名 */}
            <div className="col-span-5 flex items-center gap-2 min-w-0">
                {/* ドラッグハンドル */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <GripVertical className="h-4 w-4" />
                </div>

                {/* 展開ボタン */}
                {hasChildren ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className="p-1 hover:bg-slate-700 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                    </button>
                ) : (
                    <div className="w-6" />
                )}

                {/* WBSコード */}
                <span className="text-xs text-slate-500 font-mono min-w-[3rem]">
                    {task.wbsCode || '-'}
                </span>

                {/* タスク名 */}
                <span className="font-medium text-white truncate">{task.name}</span>
            </div>

            {/* ステータス */}
            <div className="col-span-2">
                <TaskStatusBadge status={task.status} showIcon={false} />
            </div>

            {/* 担当者 */}
            <div className="col-span-2">
                <span className="text-sm text-slate-400">
                    {task.assigneeName || '-'}
                </span>
            </div>

            {/* 進捗 */}
            <div className="col-span-2">
                <ProgressBar value={task.progress || 0} size="sm" showLabel={false} />
                <span className="text-xs text-slate-500">{task.progress || 0}%</span>
            </div>

            {/* アクション */}
            <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onAddChild(); }}
                    title="子タスクを追加"
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    title="編集"
                >
                    <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title="削除"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
