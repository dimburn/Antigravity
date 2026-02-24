// PC専用コンポーネント: タスク編集モーダル
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Flag, FileText } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useUIStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { statusOptions } from '@/components/shared/TaskStatusBadge';
import { cn } from '@/lib/utils';

const priorityOptions = [
    { value: 'low', label: '低', color: 'bg-slate-500' },
    { value: 'medium', label: '中', color: 'bg-blue-500' },
    { value: 'high', label: '高', color: 'bg-amber-500' },
    { value: 'critical', label: '緊急', color: 'bg-red-500' },
];

export function TaskEditModal() {
    const { modalState, closeModal } = useUIStore();
    const { updateTask } = useProjectStore();

    const isOpen = modalState.type === 'task-edit';
    const task = modalState.data;
    const projectId = task?.projectId;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        progress: 0,
        startDate: '',
        endDate: '',
        plannedHours: 0,
        actualHours: 0,
    });

    // タスクデータでフォームを初期化
    useEffect(() => {
        if (task) {
            setFormData({
                name: task.name || '',
                description: task.description || '',
                status: task.status || 'not_started',
                priority: task.priority || 'medium',
                progress: task.progress || 0,
                startDate: formatDateForInput(task.startDate),
                endDate: formatDateForInput(task.endDate),
                plannedHours: task.plannedHours || 0,
                actualHours: task.actualHours || 0,
            });
        }
    }, [task]);

    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toISOString().split('T')[0];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        await updateTask(projectId, task.id, {
            ...formData,
            startDate: formData.startDate ? new Date(formData.startDate) : null,
            endDate: formData.endDate ? new Date(formData.endDate) : null,
        });

        closeModal();
    };

    // モーダルが開いていない場合は何も表示しない
    if (!isOpen) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={closeModal}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>タスク編集</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* タスク名 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            タスク名
                        </label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="タスク名を入力"
                            required
                        />
                    </div>

                    {/* 説明 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            <FileText className="h-4 w-4 inline mr-1" />
                            説明
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="タスクの説明を入力"
                            rows={3}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 resize-none"
                        />
                    </div>

                    {/* ステータス */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            ステータス
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: option.value })}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                        formData.status === option.value
                                            ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 優先度 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            <Flag className="h-4 w-4 inline mr-1" />
                            優先度
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {priorityOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority: option.value })}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                                        formData.priority === option.value
                                            ? 'bg-slate-700 ring-2 ring-primary-400 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    )}
                                >
                                    <div className={cn('h-2 w-2 rounded-full', option.color)} />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 日付 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                開始日
                            </label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                終了日
                            </label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 進捗 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            進捗率: {formData.progress}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.progress}
                            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <Progress value={formData.progress} className="mt-2" />
                    </div>

                    {/* 工数 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Clock className="h-4 w-4 inline mr-1" />
                                予定工数 (時間)
                            </label>
                            <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.plannedHours}
                                onChange={(e) => setFormData({ ...formData, plannedHours: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Clock className="h-4 w-4 inline mr-1" />
                                実績工数 (時間)
                            </label>
                            <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.actualHours}
                                onChange={(e) => setFormData({ ...formData, actualHours: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={closeModal}>
                            キャンセル
                        </Button>
                        <Button type="submit">
                            保存
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
