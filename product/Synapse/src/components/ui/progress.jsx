// Progress コンポーネント
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef(({ className, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        className={cn(
            'relative h-3 w-full overflow-hidden rounded-full bg-slate-700',
            className
        )}
        {...props}
    >
        <ProgressPrimitive.Indicator
            className={cn(
                'h-full transition-all duration-500 ease-out',
                value >= 100 ? 'bg-green-500' :
                    value >= 75 ? 'bg-blue-500' :
                        value >= 50 ? 'bg-yellow-500' :
                            value >= 25 ? 'bg-orange-500' : 'bg-slate-500',
                indicatorClassName
            )}
            style={{ width: `${value || 0}%` }}
        />
    </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
