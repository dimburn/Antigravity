// PC専用コンポーネント: ガントチャート
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTasks } from '@/hooks/useTasks';
import { flattenTaskTree } from '@/lib/wbs';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isToday,
    isWeekend,
    addMonths,
    subMonths,
    differenceInDays,
    isSameMonth,
    startOfDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function GanttChart() {
    const { projectId } = useOutletContext();
    const { taskTree, loading, updateTask } = useTasks(projectId);
    const scrollRef = useRef(null);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayWidth, setDayWidth] = useState(40); // 1日の幅（px）

    // 表示期間
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // フラット化されたタスク
    const flatTasks = flattenTaskTree(taskTree);

    // ズーム
    const handleZoomIn = () => setDayWidth(Math.min(80, dayWidth + 10));
    const handleZoomOut = () => setDayWidth(Math.max(20, dayWidth - 10));

    // 月の移動
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    // 今日の位置にスクロール
    React.useEffect(() => {
        if (scrollRef.current) {
            const today = new Date();
            if (isSameMonth(today, currentDate)) {
                const dayIndex = differenceInDays(today, monthStart);
                scrollRef.current.scrollLeft = dayIndex * dayWidth - 200;
            }
        }
    }, [currentDate, dayWidth]);

    if (loading) {
        return (
            <div className="h-96 bg-slate-800/50 rounded-lg animate-pulse" />
        );
    }

    return (
        <Card className="overflow-hidden">
            {/* ツールバー */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold text-white min-w-[140px] text-center">
                        {format(currentDate, 'yyyy年 M月', { locale: ja })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleToday} className="ml-2">
                        <Calendar className="h-4 w-4 mr-1" />
                        今日
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400">{dayWidth}px</span>
                    <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* ガントチャート本体 */}
            <div className="flex">
                {/* タスク名列（固定） */}
                <div className="flex-shrink-0 w-64 border-r border-slate-700/50">
                    {/* ヘッダー */}
                    <div className="h-16 px-4 flex items-center border-b border-slate-700/50 bg-slate-800/30">
                        <span className="text-sm font-medium text-slate-400">タスク</span>
                    </div>

                    {/* タスク行 */}
                    {flatTasks.map((task) => (
                        <div
                            key={task.id}
                            className="h-12 px-4 flex items-center border-b border-slate-700/30 hover:bg-slate-800/30"
                            style={{ paddingLeft: `${(task.level || 0) * 16 + 16}px` }}
                        >
                            <span className="text-sm text-white truncate">{task.name}</span>
                        </div>
                    ))}

                    {flatTasks.length === 0 && (
                        <div className="h-24 flex items-center justify-center text-slate-500 text-sm">
                            タスクがありません
                        </div>
                    )}
                </div>

                {/* チャート部分（スクロール可能） */}
                <div className="flex-1 overflow-x-auto" ref={scrollRef}>
                    <div style={{ width: days.length * dayWidth, minWidth: '100%' }}>
                        {/* 日付ヘッダー */}
                        <div className="h-16 flex border-b border-slate-700/50 bg-slate-800/30">
                            {/* 週ヘッダー */}
                            <div className="absolute flex h-8">
                                {/* TODO: 週単位のヘッダー */}
                            </div>

                            {/* 日ヘッダー */}
                            <div className="flex h-full items-end py-1">
                                {days.map((day) => (
                                    <div
                                        key={day.toISOString()}
                                        className={cn(
                                            'flex flex-col items-center justify-end',
                                            isToday(day) && 'bg-primary-500/20',
                                            isWeekend(day) && 'bg-slate-800/50'
                                        )}
                                        style={{ width: dayWidth }}
                                    >
                                        <span className={cn(
                                            'text-xs',
                                            isToday(day) ? 'text-primary-400 font-bold' : 'text-slate-500'
                                        )}>
                                            {format(day, 'EEE', { locale: ja })}
                                        </span>
                                        <span className={cn(
                                            'text-sm font-medium',
                                            isToday(day) ? 'text-primary-400' : 'text-slate-300'
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ガントバー行 */}
                        <div className="relative">
                            {/* 今日の線 */}
                            {isSameMonth(new Date(), currentDate) && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                    style={{
                                        left: differenceInDays(startOfDay(new Date()), monthStart) * dayWidth + dayWidth / 2,
                                    }}
                                />
                            )}

                            {/* グリッド線 */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {days.map((day) => (
                                    <div
                                        key={day.toISOString()}
                                        className={cn(
                                            'h-full border-r border-slate-700/30',
                                            isWeekend(day) && 'bg-slate-800/30'
                                        )}
                                        style={{ width: dayWidth }}
                                    />
                                ))}
                            </div>

                            {/* タスクバー */}
                            {flatTasks.map((task) => (
                                <GanttBar
                                    key={task.id}
                                    task={task}
                                    monthStart={monthStart}
                                    dayWidth={dayWidth}
                                    onResize={(newStart, newEnd) => {
                                        updateTask(projectId, task.id, {
                                            startDate: newStart,
                                            endDate: newEnd,
                                        });
                                    }}
                                />
                            ))}

                            {flatTasks.length === 0 && (
                                <div className="h-24" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ガントバーコンポーネント（インタラクティブ版）
function GanttBar({ task, monthStart, dayWidth, onResize }) {
    const [dragState, setDragState] = useState(null); // { type: 'move' | 'resize-start' | 'resize-end', startX, originalStart, originalEnd }
    const barRef = useRef(null);

    const taskStart = task.startDate?.toDate ? task.startDate.toDate() : new Date(task.startDate);
    const taskEnd = task.endDate?.toDate ? task.endDate.toDate() : new Date(task.endDate);

    // 開始位置と幅を計算
    const startOffset = differenceInDays(taskStart, monthStart);
    const duration = differenceInDays(taskEnd, taskStart) + 1;

    // 月の範囲外のタスクは表示しない（完全に範囲外の場合）
    const monthEnd = endOfMonth(monthStart);
    if (taskEnd < monthStart || taskStart > monthEnd) {
        return <div className="h-12" />;
    }

    // バーの位置調整
    const left = Math.max(0, startOffset) * dayWidth;
    const width = Math.max(1, Math.min(duration, differenceInDays(monthEnd, taskStart) + 1)) * dayWidth - 8;

    // 進捗に応じた色
    const getBarColor = () => {
        if (task.status === 'completed') return 'bg-green-500';
        if (task.status === 'on_hold') return 'bg-amber-500';
        return 'bg-primary-500';
    };

    // ドラッグ開始
    const handleMouseDown = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({
            type,
            startX: e.clientX,
            originalStart: new Date(taskStart),
            originalEnd: new Date(taskEnd),
        });
    };

    // ドラッグ中
    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / dayWidth);

            if (deltaDays === 0) return;

            let newStart = dragState.originalStart;
            let newEnd = dragState.originalEnd;

            if (dragState.type === 'move') {
                newStart = new Date(dragState.originalStart);
                newStart.setDate(newStart.getDate() + deltaDays);
                newEnd = new Date(dragState.originalEnd);
                newEnd.setDate(newEnd.getDate() + deltaDays);
            } else if (dragState.type === 'resize-start') {
                newStart = new Date(dragState.originalStart);
                newStart.setDate(newStart.getDate() + deltaDays);
                // 開始日が終了日を超えないように
                if (newStart >= dragState.originalEnd) {
                    newStart = new Date(dragState.originalEnd);
                    newStart.setDate(newStart.getDate() - 1);
                }
            } else if (dragState.type === 'resize-end') {
                newEnd = new Date(dragState.originalEnd);
                newEnd.setDate(newEnd.getDate() + deltaDays);
                // 終了日が開始日より前にならないように
                if (newEnd <= dragState.originalStart) {
                    newEnd = new Date(dragState.originalStart);
                    newEnd.setDate(newEnd.getDate() + 1);
                }
            }

            // リアルタイム更新（視覚的フィードバック用）
            if (barRef.current) {
                const newStartOffset = differenceInDays(newStart, monthStart);
                const newDuration = differenceInDays(newEnd, newStart) + 1;
                const newLeft = Math.max(0, newStartOffset) * dayWidth + 4;
                const newWidth = Math.max(newDuration * dayWidth - 8, 20);
                barRef.current.style.left = `${newLeft}px`;
                barRef.current.style.width = `${newWidth}px`;
            }
        };

        const handleMouseUp = (e) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / dayWidth);

            let newStart = new Date(dragState.originalStart);
            let newEnd = new Date(dragState.originalEnd);

            if (dragState.type === 'move') {
                newStart.setDate(newStart.getDate() + deltaDays);
                newEnd.setDate(newEnd.getDate() + deltaDays);
            } else if (dragState.type === 'resize-start') {
                newStart.setDate(newStart.getDate() + deltaDays);
                if (newStart >= newEnd) {
                    newStart = new Date(newEnd);
                    newStart.setDate(newStart.getDate() - 1);
                }
            } else if (dragState.type === 'resize-end') {
                newEnd.setDate(newEnd.getDate() + deltaDays);
                if (newEnd <= newStart) {
                    newEnd = new Date(newStart);
                    newEnd.setDate(newEnd.getDate() + 1);
                }
            }

            // Firestoreに保存
            if (deltaDays !== 0) {
                onResize(newStart, newEnd);
            }

            setDragState(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, dayWidth, monthStart, onResize]);

    return (
        <div className="h-12 relative">
            <div
                ref={barRef}
                className={cn(
                    'absolute top-2 h-8 rounded-md transition-colors',
                    'hover:ring-2 hover:ring-white/30',
                    dragState ? 'cursor-grabbing ring-2 ring-white/50' : 'cursor-grab',
                    getBarColor()
                )}
                style={{
                    left: left + 4,
                    width: Math.max(width, 20),
                }}
                title={`${task.name}: ${format(taskStart, 'M/d')} - ${format(taskEnd, 'M/d')}`}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
                {/* 左リサイズハンドル */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-md"
                    onMouseDown={(e) => handleMouseDown(e, 'resize-start')}
                />

                {/* 進捗表示 */}
                <div
                    className="h-full rounded-md bg-white/20 pointer-events-none"
                    style={{ width: `${task.progress || 0}%` }}
                />

                {/* タスク名（幅が十分な場合） */}
                {width > 80 && (
                    <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-white truncate pointer-events-none">
                        {task.name}
                    </span>
                )}

                {/* 右リサイズハンドル */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-md"
                    onMouseDown={(e) => handleMouseDown(e, 'resize-end')}
                />
            </div>
        </div>
    );
}
