// ページ: ログイン
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, User, Chrome, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function Login() {
    const { user, loading, error, signInWithGoogle, signInWithEmail, signUpWithEmail, clearError } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
    });

    // すでにログイン済みならダッシュボードへ
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();

        try {
            if (isSignUp) {
                await signUpWithEmail(formData.email, formData.password, formData.displayName);
            } else {
                await signInWithEmail(formData.email, formData.password);
            }
        } catch (err) {
            // エラーはストアで処理
        }
    };

    const handleGoogleSignIn = async () => {
        clearError();
        try {
            await signInWithGoogle();
        } catch (err) {
            // エラーはストアで処理
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
            {/* 背景装飾 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative z-10">
                <CardHeader className="text-center">
                    {/* ロゴ */}
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <span className="text-white font-bold text-2xl">S</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Synapse</CardTitle>
                    <CardDescription>
                        {isSignUp ? 'アカウントを作成してプロジェクト管理を始めましょう' : 'ログインしてプロジェクト管理を続けましょう'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Googleログイン */}
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                    >
                        <Chrome className="mr-2 h-5 w-5" />
                        Googleでログイン
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-800 px-2 text-slate-500">または</span>
                        </div>
                    </div>

                    {/* メール/パスワードフォーム */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                    type="text"
                                    placeholder="表示名"
                                    className="pl-10"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    required={isSignUp}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                                type="email"
                                placeholder="メールアドレス"
                                className="pl-10"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="パスワード"
                                className="pl-10 pr-10"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {error && (
                            <p className="text-sm text-red-400 text-center">{error}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '処理中...' : (isSignUp ? 'アカウント作成' : 'ログイン')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center">
                    <button
                        type="button"
                        className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            clearError();
                        }}
                    >
                        {isSignUp ? 'すでにアカウントをお持ちの方' : '新しいアカウントを作成'}
                    </button>
                </CardFooter>
            </Card>
        </div>
    );
}
