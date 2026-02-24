// PC専用コンポーネント: プロジェクト作成/編集モーダル
import React, { useState, useEffect } from 'react';
import { Calendar, FileText, X, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/store/uiStore';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

export function ProjectModal() {
    const { modalState, closeModal } = useUIStore();
    const { createProject, updateProject } = useProjects();

    const isCreateMode = modalState.type === 'project-create';
    const isEditMode = modalState.type === 'project-edit';
    const isOpen = isCreateMode || isEditMode;
    const existingProject = modalState.data;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'active',
    });
    const [loading, setLoading] = useState(false);

    // 編集モードの場合、既存データで初期化
    useEffect(() => {
        if (isEditMode && existingProject) {
            setFormData({
                name: existingProject.name || '',
                description: existingProject.description || '',
                startDate: formatDateForInput(existingProject.startDate),
                endDate: formatDateForInput(existingProject.endDate),
                status: existingProject.status || 'active',
            });
        } else if (isCreateMode) {
            // 新規作成時はデフォルト値
            const today = new Date();
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            setFormData({
                name: '',
                description: '',
                startDate: formatDateForInput(today),
                endDate: formatDateForInput(nextMonth),
                status: 'active',
            });
        }
    }, [isCreateMode, isEditMode, existingProject]);

    const formatDateForInput = (date) => {
        if (!date) return '';
        // Firestore Timestampの場合はtoDate()で変換
        if (date?.toDate) {
            date = date.toDate();
        }
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const projectData = {
                name: formData.name,
                description: formData.description,
                startDate: formData.startDate ? new Date(formData.startDate) : null,
                endDate: formData.endDate ? new Date(formData.endDate) : null,
                status: formData.status,
            };

            if (isCreateMode) {
                await createProject(projectData);
            } else if (isEditMode && existingProject) {
                await updateProject(existingProject.id, projectData);
            }

            closeModal();
        } catch (error) {
            console.error('Project save error:', error);
        } finally {
            setLoading(false);
        }
    };

    // モーダルが開いていない場合は何も表示しない
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-slate-100">
                            {isCreateMode ? '新規プロジェクト' : 'プロジェクト編集'}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8 text-slate-400 hover:text-white">
                            <span className="sr-only">閉じる</span>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* プロジェクト名 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                プロジェクト名 <span className="text-red-400">*</span>
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="プロジェクト名を入力"
                                required
                                autoFocus
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
                                placeholder="プロジェクトの説明を入力"
                                rows={3}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 resize-none"
                            />
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

                        {/* ステータス（編集モードのみ） */}
                        {isEditMode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    ステータス
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: 'active' })}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all',
                                            formData.status === 'active'
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        )}
                                    >
                                        <Clock className="h-4 w-4" />
                                        進行中
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: 'completed' })}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all',
                                            formData.status === 'completed'
                                                ? 'bg-green-500/20 border-green-500 text-green-400'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        )}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        完了
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={closeModal} disabled={loading}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={loading || !formData.name}>
                                {loading ? '保存中...' : (isCreateMode ? '作成' : '保存')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
