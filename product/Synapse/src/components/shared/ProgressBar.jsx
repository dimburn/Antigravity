// 共有コンポーネント: プログレスバー
import React from 'react';
import { cn } from '@/lib/utils';

export function ProgressBar({ value = 0, showLabel = true, size = 'md', className }) {
    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    const getColor = (progress) => {
        if (progress >= 100) return 'bg-green-500';
        if (progress >= 75) return 'bg-blue-500';
        if (progress >= 50) return 'bg-yellow-500';
        if (progress >= 25) return 'bg-orange-500';
        return 'bg-slate-500';
    };

    return (
        <div className={cn('w-full', className)}>
            {showLabel && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400">進捗</span>
                    <span className="text-xs font-medium text-slate-300">{value}%</span>
                </div>
            )}
            <div className={cn('w-full bg-slate-700 rounded-full overflow-hidden', sizeClasses[size])}>
                <div
                    className={cn('h-full rounded-full transition-all duration-500 ease-out', getColor(value))}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
            </div>
        </div>
    );
}
