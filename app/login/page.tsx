'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/auth'
import { Eye, EyeOff, TrendingUp, Lock, User } from 'lucide-react'

export default function LoginPage() {
    const { login } = useApp()
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [loading, setLoading] = useState(false)

    const { state: appState, refresh } = useApp()
    const { supabase } = require('@/lib/supabase/supabase')

    async function handleForgotPassword() {
        if (!username) {
            setError('Vui lòng nhập tên đăng nhập để lấy lại mật khẩu')
            return
        }

        if (appState.users.length === 0) {
            setError('Đang tải danh sách người dùng, vui lòng thử lại sau giây lát...')
            return
        }

        const lowerInput = username.toLowerCase().trim()
        const user = appState.users.find(u =>
            u.username.toLowerCase() === lowerInput || u.id.toLowerCase() === lowerInput
        )
        if (!user) {
            setError('Người dùng không tồn tại. Vui lòng kiểm tra lại Tên đăng nhập.')
            return
        }

        if (!user.email) {
            setError('Tài khoản này chưa cập nhật email. Vui lòng liên hệ Admin.')
            return
        }

        setLoading(true)
        setError('')
        setSuccessMsg('')

        // Generate a random password: 6 random digits
        const newPass = Math.floor(100000 + Math.random() * 900000).toString()

        try {
            const { error: upError } = await supabase
                .from('users')
                .update({ password: newPass })
                .eq('id', user.id)

            if (upError) throw upError

            // Send actual email via our secure API route
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.email,
                    newPassword: newPass,
                    displayName: user.displayName || user.username
                })
            })

            const apiRes = await res.json()
            if (!res.ok) {
                console.error('Email API failed:', apiRes)
                throw new Error(apiRes.error || 'Lỗi gửi email')
            }

            setSuccessMsg(`Mật khẩu mới đã được gửi về email ${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}.`)
            refresh() // Update local state so the new password works immediately
        } catch (e: any) {
            console.error('Forgot Password Flow Error:', e)
            setError(e.message === 'Lỗi gửi email' ? 'Không thể gửi email, vui lòng liên hệ Admin' : 'Có lỗi xảy ra khi khôi phục mật khẩu')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        await new Promise(r => setTimeout(r, 400))
        const res = login(username, password)
        setLoading(false)
        if (res.success) {
            router.replace('/dashboard')
        } else {
            setError(res.error || 'Tên đăng nhập hoặc mật khẩu không đúng')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-[#0A0C10]">
            {/* Luxury Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-muted/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="w-full max-w-[480px] relative z-10 animate-modal-up">
                {/* Brand Identity */}
                <div className="text-center mb-10">
                    <div className="relative inline-block group">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-gold-muted/20 to-transparent rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="mb-6 mx-auto flex items-center justify-center">
                            <img src="/logo.png" alt="Xinh Group" className="w-[120px] h-[120px] object-contain filter drop-shadow-lg" />
                        </div>
                    </div>

                    <h1 className="text-[8px] font-black tracking-[0.4em] text-white uppercase mb-2">presents</h1>
                    <h2 className="text-4xl md:text-3xl font-serif font-black text-gold-muted tracking-tighter mb-2 bold">
                        ERP SYSTEM
                    </h2>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-gold-muted to-transparent mx-auto"></div>
                </div>

                {/* Login Card */}
                <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[40px] p-8 md:p-12 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-gold-muted transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Tên đăng nhập"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-gold-muted/50 focus:ring-4 focus:ring-gold-muted/5 transition-all font-medium placeholder:text-white/20"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mật khẩu</label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-[10px] font-bold text-gold-muted/60 hover:text-gold-muted transition-colors uppercase tracking-widest"
                                >
                                    Quên mật khẩu?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-gold-muted transition-colors" size={18} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Mật khẩu"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white outline-none focus:border-gold-muted/50 focus:ring-4 focus:ring-gold-muted/5 transition-all font-medium placeholder:text-white/20"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                >
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs font-medium animate-shake text-center">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-medium text-center">
                                {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gold-muted hover:bg-gold-muted/90 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-gold-muted/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Đăng nhập</span>
                                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-ping"></div>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Bạn có chắc chắn muốn dọn dẹp hệ thống? Mọi dữ liệu tạm thời trong trình duyệt sẽ bị xóa và khôi phục về mặc định.')) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            className="text-[9px] font-bold text-white/20 hover:text-white/40 uppercase tracking-[0.2em] transition-colors"
                        >
                            Khôi phục hệ thống
                        </button>
                    </div>
                </div>

                {/* Footer Credits */}
                <div className="text-center mt-12 space-y-2 opacity-30 group hover:opacity-100 transition-opacity">
                    <p className="text-[9px] font-black text-white uppercase tracking-[0.5em]">ERP System</p>
                    <p className="text-[8px] font-bold text-white/60 uppercase tracking-[0.3em]">v1.0 • Designed by VincentTruong </p>
                </div>
            </div>
        </div>
    )
}
