// 認証ストア (Zustand)
import { create } from 'zustand';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

/**
 * 認証ストア
 * ユーザーのログイン状態を管理
 */
export const useAuthStore = create((set, get) => ({
    // 状態
    user: null,
    loading: true,
    error: null,

    // アクション

    /**
     * 認証状態の監視を開始
     */
    initializeAuth: () => {
        return onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Firestoreからユーザー詳細を取得
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};

                set({
                    user: {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || userData.displayName || 'ユーザー',
                        photoURL: firebaseUser.photoURL || userData.photoURL || null,
                    },
                    loading: false,
                    error: null,
                });
            } else {
                set({ user: null, loading: false, error: null });
            }
        });
    },

    /**
     * Googleでサインイン
     */
    signInWithGoogle: async () => {
        set({ loading: true, error: null });
        try {
            const result = await signInWithPopup(auth, googleProvider);

            // ユーザー情報をFirestoreに保存
            await setDoc(doc(db, 'users', result.user.uid), {
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL,
                updatedAt: new Date(),
            }, { merge: true });

        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * メール/パスワードでサインイン
     */
    signInWithEmail: async (email, password) => {
        set({ loading: true, error: null });
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * メール/パスワードでアカウント作成
     */
    signUpWithEmail: async (email, password, displayName) => {
        set({ loading: true, error: null });
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // ユーザー情報をFirestoreに保存
            await setDoc(doc(db, 'users', result.user.uid), {
                displayName: displayName,
                email: result.user.email,
                photoURL: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * サインアウト
     */
    logout: async () => {
        try {
            await signOut(auth);
            set({ user: null, error: null });
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    /**
     * エラーをクリア
     */
    clearError: () => set({ error: null }),
}));
