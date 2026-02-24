// 認証フック
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * 認証状態を使用するフック
 * アプリ起動時に認証状態の監視を開始
 */
export function useAuth() {
    const {
        user,
        loading,
        error,
        initializeAuth,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        clearError,
    } = useAuthStore();

    useEffect(() => {
        // 認証状態の監視を開始
        const unsubscribe = initializeAuth();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initializeAuth]);

    return {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        clearError,
    };
}
