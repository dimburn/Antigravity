// レイアウト: ヘッダー
import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/shared/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { useIsDesktop } from '@/hooks/useMediaQuery';

export function Header() {
    const { user, logout } = useAuth();
    const { toggleSidebar } = useUIStore();
    const isDesktop = useIsDesktop();

    return (
        <header className="h-16 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
            <div className="h-full px-4 flex items-center justify-between">
                {/* 左側: メニューボタン(モバイル) + ロゴ */}
                <div className="flex items-center gap-3">
                    {isDesktop && (
                        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                            <Menu className="h-5 w-5" />
                        </Button>
                    )}

                    <Link to="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">S</span>
                        </div>
                        <span className="text-lg font-semibold text-white hidden sm:inline">Synapse</span>
                    </Link>
                </div>

                {/* 右側: 通知 + ユーザーメニュー */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                    </Button>

                    <div className="flex items-center gap-3 ml-2">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-slate-200">{user?.displayName}</p>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>

                        <Avatar
                            src={user?.photoURL}
                            fallback={user?.displayName}
                            size="md"
                        />

                        <Button variant="ghost" size="icon" onClick={logout} title="ログアウト">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
