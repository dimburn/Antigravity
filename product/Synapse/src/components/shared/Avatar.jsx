// 共有コンポーネント: アバター
import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export function Avatar({ src, alt, fallback, size = 'md', className }) {
    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
    };

    // fallbackの頭文字を取得
    const initials = fallback
        ? fallback.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '';

    if (src) {
        return (
            <img
                src={src}
                alt={alt || fallback}
                className={cn(
                    'rounded-full object-cover ring-2 ring-slate-700',
                    sizeClasses[size],
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                'rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white font-medium ring-2 ring-slate-700',
                sizeClasses[size],
                className
            )}
        >
            {initials || <User className="h-1/2 w-1/2" />}
        </div>
    );
}
