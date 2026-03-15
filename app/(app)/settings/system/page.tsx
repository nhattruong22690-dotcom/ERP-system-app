'use client'

import React, { useState, useEffect } from 'react'
import { useApp, isPageAllowed } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function SystemSettingsPage() {
    const { state, currentUser, updateSystemConfig, mounted } = useApp()
    const router = useRouter()
    
    // Local state for form
    const [fontFamily, setFontFamily] = useState('Inter')
    const [fontSizeScale, setFontSizeScale] = useState(100)
    const [theme, setTheme] = useState<'light' | 'dark' | 'luxury-gold'>('light')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

    // Auth check
    useEffect(() => {
        if (mounted && !isPageAllowed(currentUser, '/settings/system')) {
            router.replace('/')
        }
    }, [currentUser, mounted, router])

    // Load initial values
    useEffect(() => {
        if (state.systemConfig) {
            setFontFamily(state.systemConfig.fontFamily || 'Inter')
            setFontSizeScale(state.systemConfig.fontSizeScale || 100)
            setTheme(state.systemConfig.theme || 'light')
        }
    }, [state.systemConfig])

    if (!mounted || !currentUser || currentUser.role !== 'admin') {
        return <div className="p-8 text-center text-slate-400">Đang tải cấu hình...</div>
    }

    const handleSave = async () => {
        setLoading(true)
        setMessage(null)
        const success = await updateSystemConfig({
            fontFamily,
            fontSizeScale,
            theme
        })
        setLoading(false)
        if (success) {
            setMessage({ text: 'Đã lưu cấu hình hệ thống thành công!', type: 'success' })
        } else {
            setMessage({ text: 'Có lỗi xảy ra khi lưu cấu hình.', type: 'error' })
        }
    }

    return (
        <div className="page-container luxury-scrollbar animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-main)] mb-2">Cài Đặt Hệ Thống</h1>
                <p className="text-[var(--color-text-soft)]">Tùy chỉnh giao diện và trải nghiệm người dùng trên toàn bộ website.</p>
            </header>

            <div className="max-w-4xl space-y-6">
                {/* Font Family Section */}
                <section className="luxury-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <span className="material-icons-round">font_download</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Phông chữ (Font Family)</h2>
                            <p className="text-sm text-slate-500">Chọn phông chữ hiển thị cho toàn bộ website (Hỗ trợ tiếng Việt).</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { name: 'Inter', description: 'Hiện đại, dễ đọc' },
                            { name: 'Be Vietnam Pro', description: 'Thanh lịch, tối ưu tiếng Việt' },
                            { name: 'Roboto', description: 'Tiêu chuẩn quốc tế' }
                        ].map(font => (
                            <button
                                key={font.name}
                                onClick={() => setFontFamily(font.name)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${
                                    fontFamily === font.name 
                                    ? 'border-[var(--color-gold-muted)] bg-amber-50/50' 
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                }`}
                            >
                                <div className="font-bold text-lg" style={{ fontFamily: font.name === 'Be Vietnam Pro' ? 'var(--font-be-vietnam)' : font.name }}>
                                    {font.name}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">{font.description}</div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Font Size Section */}
                <section className="luxury-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <span className="material-icons-round">format_size</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Kích cỡ chữ (Font Scaling)</h2>
                            <p className="text-sm text-slate-500">Điều chỉnh kích thước văn bản theo tỷ lệ phần trăm (Mặc định 100%).</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 w-full">
                            <input 
                                type="range" 
                                min="80" 
                                max="150" 
                                step="5"
                                value={fontSizeScale}
                                onChange={(e) => setFontSizeScale(Number(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[var(--color-gold-muted)]"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-2">
                                <span>Nhỏ (80%)</span>
                                <span>Tiêu chuẩn (100%)</span>
                                <span>Lớn (150%)</span>
                            </div>
                        </div>
                        <div className="w-24 text-center">
                            <div className="text-2xl font-bold text-[var(--color-gold-muted)]">{fontSizeScale}%</div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100 italic text-center" style={{ fontSize: `${16 * (fontSizeScale/100)}px` }}>
                        "Nội dung này sẽ thay đổi kích thước khi bạn kéo thanh trượt trên."
                    </div>
                </section>

                {/* Theme Section */}
                <section className="luxury-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <span className="material-icons-round">palette</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Chủ đề (Theme)</h2>
                            <p className="text-sm text-slate-500">Thay đổi màu sắc chủ đạo của toàn bộ giao diện.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'light', name: 'Sáng', class: 'bg-white border-slate-200' },
                            { id: 'dark', name: 'Tối', class: 'bg-slate-900 border-slate-800 text-white' },
                            { id: 'luxury-gold', name: 'Luxury Gold', class: 'bg-[#FAF8F8] border-[#C5A059] border-opacity-30' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id as any)}
                                className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${
                                    theme === t.id 
                                    ? 'border-[var(--color-gold-muted)] ring-2 ring-[var(--color-gold-muted)] ring-opacity-20' 
                                    : 'border-slate-100 hover:border-slate-200'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-lg border ${t.class} flex items-center justify-center`}>
                                    <span className="material-icons-round text-lg">
                                        {t.id === 'light' ? 'light_mode' : t.id === 'dark' ? 'dark_mode' : 'diamond'}
                                    </span>
                                </div>
                                <div className="font-bold">{t.name}</div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Actions */}
                <div className="flex items-center justify-between pt-6">
                    <div>
                        {message && (
                            <div className={`px-4 py-2 rounded-lg text-sm font-medium animate-buzz ${
                                message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-8 py-3 bg-[var(--color-gold-muted)] text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {loading ? (
                            <span className="animate-spin material-icons-round">sync</span>
                        ) : (
                            <span className="material-icons-round">save</span>
                        )}
                        Lưu Thay Đổi
                    </button>
                </div>
            </div>
        </div>
    )
}
