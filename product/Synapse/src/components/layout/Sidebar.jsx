// レイアウト: サイドバー (PC版のみ)
import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderKanban,
    ListTree,
    BarChart3,
    Users,
    Settings,
    Plus,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

export function Sidebar() {
    const { sidebarOpen, toggleSidebar, openModal } = useUIStore();
    const { projects } = useProjects();
    const { projectId } = useParams();

    const mainNavItems = [
        { icon: LayoutDashboard, label: 'ダッシュボード', to: '/' },
        { icon: FolderKanban, label: 'プロジェクト', to: '/projects' },
    ];

    const projectNavItems = projectId ? [
        { icon: ListTree, label: 'WBS', to: `/projects/${projectId}/wbs` },
        { icon: BarChart3, label: 'ガントチャート', to: `/projects/${projectId}/gantt` },
        { icon: Users, label: 'メンバー', to: `/projects/${projectId}/members` },
    ] : [];

    return (
        <aside
            className={cn(
                'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-slate-900/95 backdrop-blur-md border-r border-slate-700/50 z-30 transition-all duration-300',
                sidebarOpen ? 'w-64' : 'w-16'
            )}
        >
            <div className="flex flex-col h-full">
                {/* メインナビゲーション */}
                <nav className="flex-1 p-3 space-y-1">
                    {mainNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                )
                            }
                        >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            {sidebarOpen && <span>{item.label}</span>}
                        </NavLink>
                    ))}

                    {/* プロジェクト区切り */}
                    {sidebarOpen && projects.length > 0 && (
                        <div className="pt-4 pb-2">
                            <div className="flex items-center justify-between px-3">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    プロジェクト
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => openModal('project-create')}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* プロジェクトリスト */}
                    {sidebarOpen && projects.slice(0, 5).map((project) => (
                        <NavLink
                            key={project.id}
                            to={`/projects/${project.id}/wbs`}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                                    isActive
                                        ? 'bg-slate-800 text-slate-200'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                )
                            }
                        >
                            <div className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
                            <span className="truncate">{project.name}</span>
                        </NavLink>
                    ))}

                    {/* プロジェクトナビゲーション */}
                    {projectNavItems.length > 0 && (
                        <>
                            <div className="my-4 border-t border-slate-700/50" />
                            {projectNavItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                        )
                                    }
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {sidebarOpen && <span>{item.label}</span>}
                                </NavLink>
                            ))}
                        </>
                    )}
                </nav>

                {/* フッター */}
                <div className="p-3 border-t border-slate-700/50">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-primary-600/20 text-primary-400'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            )
                        }
                    >
                        <Settings className="h-5 w-5 flex-shrink-0" />
                        {sidebarOpen && <span>設定</span>}
                    </NavLink>

                    {/* サイドバー開閉ボタン */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                        className="w-full mt-2 justify-center"
                    >
                        {sidebarOpen ? (
                            <ChevronLeft className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </aside>
    );
}
