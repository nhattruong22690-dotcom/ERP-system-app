'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/auth'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import PageHeader from '@/components/PageHeader'
import {
    Bell, Plus, Edit2, Trash2, Save, X,
    AlertTriangle, Info, Calendar, Clock,
    Monitor, RefreshCw, CheckCircle2, Search, Zap
} from 'lucide-react'

interface Notification {
    id: string
    content: string
    type: 'info' | 'warning' | 'event'
    is_active: boolean
    priority: number
    show_on_login: boolean
    show_on_day: boolean
    show_interval: boolean
    interval_minutes: number
    expires_at: string | null
    created_at: string
}

export default function NotificationSettingsPage() {
    const { currentUser } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()

    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Notification | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Form State
    const [form, setForm] = useState<Partial<Notification>>({
        content: '',
        type: 'info',
        is_active: true,
        priority: 0,
        show_on_login: true,
        show_on_day: false,
        show_interval: false,
        interval_minutes: 60,
        expires_at: null
    })

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('global_notifications')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            showToast('Lỗi', 'Không thể tải danh sách thông báo', 'error' as any)
        } else {
            setNotifications(data || [])
        }
        setLoading(false)
    }

    const handleOpenCreate = () => {
        setEditing(null)
        setForm({
            content: '',
            type: 'info',
            is_active: true,
            priority: 0,
            show_on_login: true,
            show_on_day: false,
            show_interval: false,
            interval_minutes: 60,
            expires_at: null
        })
        setShowForm(true)
    }

    const handleOpenEdit = (n: Notification) => {
        setEditing(n)
        setForm({ ...n })
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.content?.trim()) {
            await showAlert('Vui lòng nhập nội dung thông báo')
            return
        }

        const dataToSave = {
            ...form,
            id: editing?.id || `notif-${Math.random().toString(36).slice(2, 9)}`,
            created_at: editing?.created_at || new Date().toISOString()
        }

        const { error } = await supabase
            .from('global_notifications')
            .upsert(dataToSave)

        if (error) {
            showToast('Lỗi', 'Không thể lưu thông báo', 'error' as any)
            console.error(error)
        } else {
            showToast('Thành công', 'Đã lưu thông báo mới')
            setShowForm(false)
            fetchNotifications()
        }
    }

    const handleDelete = async (id: string) => {
        if (await showConfirm('Bạn có chắc chắn muốn xoá thông báo này?')) {
            const { error } = await supabase
                .from('global_notifications')
                .delete()
                .eq('id', id)

            if (error) {
                showToast('Lỗi', 'Không thể xoá thông báo', 'error' as any)
            } else {
                showToast('Thành công', 'Đã xoá thông báo')
                fetchNotifications()
            }
        }
    }

    const filteredNotifs = notifications.filter(n =>
        n.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-text-soft">Bạn không có quyền truy cập trang này.</p>
            </div>
        )
    }

    return (
        <div className="page-container bg-[#FAF8F6]">
            <PageHeader
                icon={Bell}
                title="Cấu hình thông báo"
                subtitle="Notification Management"
                description="Quản lý tin nhắn chạy chữ và thông báo hệ thống"
                actions={
                    <button
                        onClick={handleOpenCreate}
                        className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all duration-300 flex items-center gap-2 active:scale-95"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        Thêm thông báo mới
                    </button>
                }
            />

            <div className="px-10 py-12 pb-32 max-w-[1400px] mx-auto animate-fade-in text-text-main">
                {/* Search Bar */}
                <div className="bg-white/80 backdrop-blur-md rounded-[24px] border border-gold-light/30 shadow-luxury p-4 flex items-center gap-4 mb-8">
                    <Search className="text-gold-muted/50 ml-2" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm nội dung thông báo..."
                        className="bg-transparent border-none outline-none flex-1 text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Notifications List */}
                <div className="grid grid-cols-1 gap-6">
                    {loading ? (
                        <div className="py-20 text-center text-text-soft opacity-50">Đang tải dữ liệu...</div>
                    ) : filteredNotifs.length === 0 ? (
                        <div className="py-20 text-center text-text-soft opacity-50 bg-white rounded-[32px] border border-dashed border-gold-light/40">
                            Chưa có thông báo nào được tạo.
                        </div>
                    ) : (
                        filteredNotifs.map(n => (
                            <div key={n.id} className="bg-white p-6 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${n.type === 'warning' ? 'bg-rose-50 text-rose-500' :
                                            n.type === 'event' ? 'bg-indigo-50 text-indigo-500' : 'bg-gold-light/20 text-gold-muted'
                                            }`}>
                                            {n.type === 'warning' ? <AlertTriangle size={24} strokeWidth={1.5} /> : <Info size={24} strokeWidth={1.5} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${n.type === 'warning' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    n.type === 'event' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gold-light/30 text-gold-muted border-gold-light/50'
                                                    }`}>
                                                    {n.type}
                                                </span>
                                                {n.is_active ? (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> Đang chạy
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-soft opacity-40">Đã tắt</span>
                                                )}
                                            </div>
                                            <p className="text-[15px] font-bold text-text-main truncate">{n.content}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden md:block">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-text-soft/40 mb-1">Chế độ hiển thị</div>
                                            <div className="flex gap-2 justify-end">
                                                {n.show_on_login && <div title="Hiện khi đăng nhập" className="w-6 h-6 rounded-lg bg-beige-soft flex items-center justify-center text-gold-muted"><Monitor size={12} /></div>}
                                                {n.show_on_day && <div title="Mỗi ngày 1 lần" className="w-6 h-6 rounded-lg bg-beige-soft flex items-center justify-center text-gold-muted"><Calendar size={12} /></div>}
                                                {n.show_interval && <div title={`Lặp lại ${n.interval_minutes}p`} className="w-6 h-6 rounded-lg bg-beige-soft flex items-center justify-center text-gold-muted"><RefreshCw size={12} /></div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={async () => {
                                                    const { error } = await supabase
                                                        .from('global_notifications')
                                                        .update({ last_triggered_at: new Date().toISOString() })
                                                        .eq('id', n.id)

                                                    if (error) showToast('Lỗi', 'Không thể bắn tin', 'error' as any)
                                                    else showToast('Thành công', 'Đã bắn tin tới tất cả user!')
                                                }}
                                                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2"
                                                title="Bắn tin ngay lập tức cho tất cả User"
                                            >
                                                <Zap size={14} fill="currentColor" /> Bắn tin
                                            </button>
                                            <button
                                                onClick={() => handleOpenEdit(n)}
                                                className="p-3 rounded-xl bg-beige-soft text-gold-muted hover:bg-gold-light transition-all"
                                            >
                                                <Edit2 size={18} strokeWidth={1.5} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(n.id)}
                                                className="p-3 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                                            >
                                                <Trash2 size={18} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-modal-up border border-gold-light/20 relative my-auto">
                        {/* Modal Header */}
                        <div className="px-12 pt-12 flex justify-between items-start shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Bell size={14} className="text-gold-muted" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-soft/60 italic">Cấu hình thông báo</span>
                                </div>
                                <h3 className="text-3xl font-serif font-black text-text-main tracking-tighter uppercase italic">
                                    {editing ? 'Hiệu chỉnh' : 'Tạo mới'} <span className="text-gold-muted">Thông báo</span>
                                </h3>
                            </div>
                            <button onClick={() => setShowForm(false)} className="w-12 h-12 rounded-2xl bg-white text-text-soft hover:text-rose-500 flex items-center justify-center transition-all shadow-sm border border-gold-light/20">
                                <X size={22} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-12 space-y-8 overflow-y-auto">
                            {/* Content */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest pl-2">Nội dung chạy chữ *</label>
                                <textarea
                                    className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[24px] px-6 py-5 text-[15px] font-bold text-text-main outline-none transition-all shadow-sm italic min-h-[100px] resize-none"
                                    placeholder="VD: Chào mừng bạn đến với hệ thống Xinh Group..."
                                    value={form.content || ''}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest pl-2">Loại thông báo</label>
                                    <select
                                        className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[20px] px-6 py-4 text-[14px] font-bold text-text-main outline-none appearance-none cursor-pointer"
                                        value={form.type || 'info'}
                                        onChange={e => setForm({ ...form, type: e.target.value as any })}
                                    >
                                        <option value="info">Thông tin (Info)</option>
                                        <option value="warning">Cảnh báo (Warning)</option>
                                        <option value="event">Sự kiện (Event)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest pl-2">Độ ưu tiên (Priority)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[20px] px-6 py-4 text-[14px] font-bold text-text-main outline-none"
                                        value={form.priority || 0}
                                        onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* Display Modes (Multi-select via checkboxes) */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest pl-2">Chế độ hiển thị (Có thể chọn nhiều)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setForm({ ...form, show_on_login: !form.show_on_login })}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${form.show_on_login ? 'bg-gold-light/10 border-gold-muted' : 'border-gold-light/20 grayscale opacity-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Monitor size={18} className="text-gold-muted" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Khi đăng nhập</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${form.show_on_login ? 'bg-gold-muted text-white' : 'border border-gold-light/40'}`}>
                                            {form.show_on_login && <CheckCircle2 size={12} />}
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setForm({ ...form, show_on_day: !form.show_on_day })}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${form.show_on_day ? 'bg-gold-light/10 border-gold-muted' : 'border-gold-light/20 grayscale opacity-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Calendar size={18} className="text-gold-muted" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Mỗi ngày 1 lần</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${form.show_on_day ? 'bg-gold-muted text-white' : 'border border-gold-light/40'}`}>
                                            {form.show_on_day && <CheckCircle2 size={12} />}
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setForm({ ...form, show_interval: !form.show_interval })}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${form.show_interval ? 'bg-gold-light/10 border-gold-muted' : 'border-gold-light/20 grayscale opacity-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <RefreshCw size={18} className="text-gold-muted" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Lặp lại liên tục</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${form.show_interval ? 'bg-gold-muted text-white' : 'border border-gold-light/40'}`}>
                                            {form.show_interval && <CheckCircle2 size={12} />}
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-2xl border transition-all ${form.show_interval ? 'bg-beige-soft/50 border-gold-light/40' : 'bg-gray-50 border-transparent opacity-30 pointer-events-none'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-gold-muted">Cách nhau (phút):</span>
                                            <input
                                                type="number"
                                                className="w-16 bg-transparent border-b border-gold-muted text-right text-sm font-black outline-none"
                                                value={form.interval_minutes || 60}
                                                onChange={e => setForm({ ...form, interval_minutes: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-[24px]">
                                <div className="flex items-center gap-3">
                                    <Monitor size={16} className="text-text-soft" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-text-soft">Trạng thái kích hoạt</span>
                                </div>
                                <div
                                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${form.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${form.is_active ? 'left-7' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-12 bg-beige-soft/30 border-t border-gold-light/10 flex gap-4 shrink-0">
                            <button className="flex-1 py-4.5 rounded-2xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-500 transition-all font-serif italic" onClick={() => setShowForm(false)}>Hủy bỏ</button>
                            <button className="flex-[2] py-4.5 rounded-2xl bg-text-main text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center justify-center gap-3 font-serif italic" onClick={handleSave}>
                                <Save size={16} strokeWidth={2.5} /> Lưu thiết lập thông báo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
