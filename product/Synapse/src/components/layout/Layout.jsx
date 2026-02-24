// レイアウト: 全体レイアウト
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useUIStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import { ProjectModal } from '@/components/pc/ProjectModal';
import { TaskEditModal } from '@/components/pc/TaskEditModal';
import { CSVImportModal, CSVExportModal } from '@/components/pc/CSVHandler';

export function Layout() {
    const isDesktop = useIsDesktop();
    const { sidebarOpen } = useUIStore();
    const { currentProject } = useProjectStore();
    const projectId = currentProject?.id;

    return (
        <div className="min-h-screen bg-slate-950">
            {/* ヘッダー */}
            <Header />

            {/* PC版: サイドバー */}
            {isDesktop && <Sidebar />}

            {/* メインコンテンツ */}
            <main
                className={cn(
                    'min-h-[calc(100vh-4rem)] transition-all duration-300',
                    // PC版: サイドバーの幅に応じてマージン調整
                    isDesktop && (sidebarOpen ? 'ml-64' : 'ml-16'),
                    // モバイル版: ボトムナビ分のパディング
                    !isDesktop && 'pb-20'
                )}
            >
                <div className="p-4 lg:p-6">
                    <Outlet />
                </div>
            </main>

            {/* モバイル版: ボトムナビゲーション */}
            {!isDesktop && <MobileNav />}

            {/* グローバルモーダル */}
            <ProjectModal />
            <TaskEditModal />
            {projectId && (
                <>
                    <CSVImportModal projectId={projectId} />
                    <CSVExportModal projectId={projectId} />
                </>
            )}
        </div>
    );
}
