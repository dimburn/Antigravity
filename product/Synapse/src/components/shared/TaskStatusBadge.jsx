// 共有コンポーネント: タスクステータスバッジ
import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusLabel } from '@/lib/utils';
import { Circle, Clock, CheckCircle2, PauseCircle } from 'lucide-react';

const statusConfig = {
    not_started: {
        icon: Circle,
        className: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    },
    in_progress: {
        icon: Clock,
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    completed: {
        icon: CheckCircle2,
        className: 'bg-green-500/20 text-green-300 border-green-500/30',
    },
    on_hold: {
        icon: PauseCircle,
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
};

export function TaskStatusBadge({ status, showIcon = true, className }) {
    const config = statusConfig[status] || statusConfig.not_started;
    const Icon = config.icon;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                config.className,
                className
            )}
        >
            {showIcon && <Icon className="h-3.5 w-3.5" />}
            {getStatusLabel(status)}
        </span>
    );
}

// ステータス選択用のオプション
export const statusOptions = [
    { value: 'not_started', label: '未着手' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' },
    { value: 'on_hold', label: '保留中' },
];
