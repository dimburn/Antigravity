// レイアウト: モバイルナビゲーション
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { icon: LayoutDashboard, label: 'ホーム', to: '/' },
    { icon: FolderKanban, label: 'プロジェクト', to: '/projects' },
    { icon: User, label: 'マイタスク', to: '/my-tasks' },
    { icon: Settings, label: '設定', to: '/settings' },
];

export function MobileNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 z-40 lg:hidden">
            <div className="h-full grid grid-cols-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            cn(
                                'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all duration-200',
                                isActive
                                    ? 'text-primary-400'
                                    : 'text-slate-500'
                            )
                        }
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
