'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/auth'
import { User, Mail, Lock, User as UserIcon, Camera, Save, Key, CheckCircle2, Loader2, Edit2, X } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import PageHeader from '@/components/PageHeader'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
    const { currentUser, updateProfile, state } = useApp()
    const { showToast } = useToast()

    const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
    const [email, setEmail] = useState(currentUser?.email || '')
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '')

    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPasswordFields, setShowPasswordFields] = useState(false)

    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [changingPass, setChangingPass] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    // Security states
    const [isEditing, setIsEditing] = useState(false)
    const [showPwModal, setShowPwModal] = useState(false)
    const [verifyPw, setVerifyPw] = useState('')
    const [verifyError, setVerifyError] = useState('')

    const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        processFile(file)
    }

    async function processFile(file: File) {
        if (!file.type.startsWith('image/')) {
            showToast('Lỗi', 'Vui lòng chọn tệp hình ảnh', 'error')
            return
        }

        try {
            setUploadingAvatar(true)

            // 1. Nén ảnh
            const options = {
                maxSizeMB: 0.5, // Tối đa 500KB
                maxWidthOrHeight: 800, // Kích thước tối đa
                useWebWorker: true
            }
            const compressedFile = await imageCompression(file, options)

            // 2. Tạo tên file ngẫu nhiên gắn với ID người dùng để tránh trùng
            const fileExt = file.name.split('.').pop()
            const fileName = `${currentUser?.id}-${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            // 3. Upload lên Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, compressedFile, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) throw uploadError

            // 4. Lấy Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)

            setAvatarUrl(data.publicUrl)
            showToast('Thành công', 'Ảnh đã tải lên. Nhấn Lưu thay đổi để hoàn tất.')

        } catch (error: any) {
            console.error('Lỗi upload avatar:', error)
            showToast('Lỗi', 'Không thể tải ảnh lên: ' + (error.message || ''), 'error')
        } finally {
            setUploadingAvatar(false)
        }
    }

    const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
        admin: { label: 'Admin', color: '#7c3aed' },
        director: { label: 'Giám đốc', color: '#0891b2' },
        accountant: { label: 'Kế toán', color: '#059669' },
        staff: { label: 'Nhân viên', color: '#d97706' },
    }
    const roleInfo = ROLE_CONFIG[currentUser?.role || 'staff']

    async function handleUpdateInfo() {
        if (!currentUser) return
        setSaving(true)
        const success = await updateProfile({ displayName, email, avatarUrl })
        setSaving(false)
        if (success) {
            showToast('Thành công', 'Thông tin cá nhân đã được cập nhật')
            setIsEditing(false)
        } else {
            showToast('Lỗi', 'Không thể cập nhật thông tin', 'error')
        }
    }

    async function handleChangePassword() {
        if (!currentUser) return
        if (oldPassword !== currentUser.password) {
            showToast('Lỗi', 'Mật khẩu hiện tại không đúng', 'error')
            return
        }
        if (newPassword !== confirmPassword) {
            showToast('Lỗi', 'Mật khẩu xác nhận không khớp', 'error')
            return
        }
        if (newPassword.length < 4) {
            showToast('Lỗi', 'Mật khẩu mới phải có ít nhất 4 ký tự', 'error')
            return
        }

        setChangingPass(true)
        const success = await updateProfile({ password: newPassword })
        setChangingPass(false)

        if (success) {
            showToast('Thành công', 'Mật khẩu đã được thay đổi')
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } else {
            showToast('Lỗi', 'Không thể đổi mật khẩu', 'error')
        }
    }

    if (!currentUser) return <div className="p-8 text-center">Đang tải...</div>

    return (
        <div className="page-container bg-[#FAF8F6]">
            <PageHeader
                icon={UserIcon}
                title="Hồ sơ Cá nhân"
                subtitle="Personal Profile"
                description="Quản lý định danh & Bảo mật tài khoản"
            />

            <div className="px-10 py-12 pb-32 max-w-[1000px] mx-auto animate-fade-in space-y-12">

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>

                    {/* General Info Luxury Card */}
                    <div className="bg-white border border-gold-light/20 rounded-[32px] shadow-luxury p-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-muted via-gold-light to-gold-muted opacity-50" />

                        <h2 className="text-lg font-serif font-bold text-text-main mb-10 flex items-center gap-4 uppercase tracking-wider">
                            <div className="w-10 h-10 rounded-xl bg-gold-light/30 flex items-center justify-center text-gold-muted">
                                <UserIcon size={20} strokeWidth={1.5} />
                            </div>
                            Thông tin định danh
                        </h2>

                        <div className="flex flex-col lg:flex-row gap-12 items-start">
                            {/* Avatar Column */}
                            <div className="flex flex-col items-center gap-6 w-full lg:w-[240px]">
                                <div
                                    className={`relative w-48 h-48 rounded-[40px] border-4 transition-all duration-500 group overflow-hidden shadow-luxury ${isDragging ? 'border-gold-muted border-dashed bg-gold-light/10 scale-95' : 'border-gold-light/20 bg-beige-soft'}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        setIsDragging(false)
                                        const file = e.dataTransfer.files?.[0]
                                        if (file) processFile(file)
                                    }}
                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-30">
                                            <UserIcon size={64} strokeWidth={1} className="text-text-soft" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-text-soft">Chưa có ảnh</span>
                                        </div>
                                    )}

                                    {uploadingAvatar && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                            <Loader2 size={40} className="text-gold-muted animate-spin" strokeWidth={1.5} />
                                        </div>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 py-4 bg-gradient-to-t from-black/60 to-transparent text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer transform translate-y-2 group-hover:translate-y-0">
                                        <Camera size={14} className="mr-2" /> Đổi hình ảnh
                                    </div>
                                </div>

                                <input id="avatar-upload" type="file" hidden accept="image/*" onChange={handleFileChange} />

                                <div className="text-center">
                                    <p className="text-[11px] font-bold text-text-soft uppercase tracking-widest opacity-40 mb-2">Đăng nhập tài khoản</p>
                                    <p className="text-lg font-serif italic text-text-main font-bold">@{currentUser.username}</p>
                                    <div className="mt-4 inline-flex items-center gap-2 px-6 py-2 rounded-full border border-gold-light/30 bg-gold-light/10 text-gold-muted text-[10px] font-black uppercase tracking-widest">
                                        <CheckCircle2 size={12} strokeWidth={1.5} /> {roleInfo.label}
                                    </div>
                                </div>
                            </div>

                            {/* Form Column */}
                            <div className="flex-1 space-y-8 w-full">
                                <div className="form-group">
                                    <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1 mb-3 block opacity-60 italic">Họ và tên hiển thị</label>
                                    <div className="relative group">
                                        <UserIcon size={18} strokeWidth={1.5} className="absolute left-6 top-1/2 -translate-y-1/2 text-gold-muted/40 transition-colors group-focus-within:text-gold-muted" />
                                        <input
                                            type="text"
                                            className={`w-full bg-beige-soft/30 border-2 py-4 pl-14 pr-6 rounded-2xl text-sm font-bold transition-all focus:ring-4 focus:ring-gold-muted/5 ${!isEditing ? 'border-transparent text-text-soft' : 'border-gold-muted/20 text-text-main bg-white'}`}
                                            value={displayName}
                                            onChange={e => setDisplayName(e.target.value)}
                                            readOnly={!isEditing}
                                            placeholder="Tên đầy đủ của bạn..."
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1 mb-3 block opacity-60 italic">Địa chỉ Email xác thực</label>
                                    <div className="relative group">
                                        <Mail size={18} strokeWidth={1.5} className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${emailError && isEditing ? 'text-rose-400' : 'text-gold-muted/40 group-focus-within:text-gold-muted'}`} />
                                        <input
                                            type="email"
                                            className={`w-full bg-beige-soft/30 border-2 py-4 pl-14 pr-6 rounded-2xl text-sm font-bold transition-all focus:ring-4 focus:ring-gold-muted/5 ${emailError && isEditing ? 'border-rose-300' : (!isEditing ? 'border-transparent text-text-soft' : 'border-gold-muted/20 text-text-main bg-white')}`}
                                            value={!isEditing && email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="Nhập email của bạn..."
                                            readOnly={!isEditing}
                                        />
                                    </div>
                                    {emailError && isEditing && (
                                        <p className="text-[10px] font-bold text-rose-500 mt-2 px-1 uppercase tracking-tight italic">
                                            ⚠️ Định dạng email không hợp lệ
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    {!isEditing ? (
                                        <button
                                            className="flex items-center gap-3 bg-white border border-gold-light text-gold-muted px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-luxury hover:bg-gold-light transition-all active:scale-95"
                                            onClick={() => setShowPwModal(true)}
                                        >
                                            <Edit2 size={16} strokeWidth={1.5} /> Chỉnh sửa thông tin
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="px-8 py-4 bg-beige-soft text-text-soft rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border border-gold-light/20"
                                                onClick={() => {
                                                    setIsEditing(false)
                                                    setDisplayName(currentUser.displayName || '')
                                                    setEmail(currentUser.email || '')
                                                }}
                                            >
                                                Hủy bỏ
                                            </button>
                                            <button
                                                className="flex items-center gap-3 bg-gold-muted text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-gold-muted/20 hover:bg-gold-muted/90 transition-all active:scale-95 disabled:opacity-50"
                                                onClick={handleUpdateInfo}
                                                disabled={saving || !!emailError}
                                            >
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} strokeWidth={1.5} />}
                                                Cập nhật hồ sơ
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Change Luxury Card */}
                    <div className="bg-white border border-gold-light/20 rounded-[32px] shadow-luxury p-10 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <h2 className="text-lg font-serif font-bold text-text-main flex items-center gap-4 uppercase tracking-wider">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                                    <Lock size={20} strokeWidth={1.5} />
                                </div>
                                Bảo mật & Quyền truy cập
                            </h2>
                            {!showPasswordFields ? (
                                <button
                                    className="flex items-center gap-2 text-gold-muted border border-gold-light/30 bg-gold-light/10 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gold-light/20 transition-all active:scale-95 shadow-sm"
                                    onClick={() => setShowPasswordFields(true)}
                                >
                                    <Key size={14} strokeWidth={1.5} /> Thay đổi mật khẩu
                                </button>
                            ) : (
                                <button
                                    className="text-text-soft/60 hover:text-text-soft text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:bg-beige-soft rounded-lg transition-all"
                                    onClick={() => setShowPasswordFields(false)}
                                >
                                    Hủy lệnh thay đổi
                                </button>
                            )}
                        </div>

                        {showPasswordFields && (
                            <div className="max-w-md space-y-6 animate-slide-down">
                                <div className="form-group italic text-text-soft/60 text-[11px] mb-2">
                                    * Vui lòng điền đầy đủ và ghi nhớ mật khẩu mới để tránh gián đoạn công việc.
                                </div>

                                <div className="form-group">
                                    <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1 mb-2 block opacity-60">Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        className="w-full bg-beige-soft/30 border-gold-muted/10 border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold-muted/5 transition-all text-main"
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-group">
                                        <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1 mb-2 block opacity-60">Mật khẩu mới</label>
                                        <input
                                            type="password"
                                            className="w-full bg-beige-soft/30 border-gold-muted/10 border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold-muted/5 transition-all"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Tối thiểu 4 ký tự"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1 mb-2 block opacity-60">Xác nhận mật khẩu</label>
                                        <input
                                            type="password"
                                            className="w-full bg-beige-soft/30 border-gold-muted/10 border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold-muted/5 transition-all"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button
                                    className="flex items-center gap-3 bg-gold-muted text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-gold-muted/20 hover:bg-gold-muted/90 transition-all active:scale-95 disabled:opacity-50"
                                    onClick={handleChangePassword}
                                    disabled={changingPass}
                                >
                                    {changingPass ? <Loader2 size={16} className="animate-spin" /> : <Key size={18} strokeWidth={1.5} />}
                                    Xác nhận đổi mật khẩu
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Account Metadata Luxury Row */}
                    <div className="bg-beige-soft/30 border border-gold-light/20 rounded-[32px] p-8 overflow-hidden relative">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest">Vai trò hệ thống</span>
                                <span className="text-sm font-serif italic text-gold-muted font-bold capitalize">{currentUser.title || 'Thành viên'}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest">Đơn vị công tác</span>
                                <span className="text-sm font-bold text-text-main">
                                    {state.branches.find(b => b.id === currentUser.branchId)?.name || currentUser.title || 'Văn phòng Trung tâm'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest">Gia nhập hệ thống</span>
                                <span className="text-sm font-bold text-text-main">{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Password Verification Luxury Modal */}
                {showPwModal && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer" onClick={() => setShowPwModal(false)}>
                        <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 animate-modal-up shadow-2xl overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gold-muted via-gold-light to-gold-muted" />

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-text-main tracking-tight uppercase">Xác minh bảo vệ</h2>
                                    <p className="text-[10px] font-bold text-text-soft mt-1 uppercase tracking-widest opacity-40 italic">Yêu cầu xác thực danh tính</p>
                                </div>
                                <button onClick={() => setShowPwModal(false)} className="p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm">
                                    <X size={20} strokeWidth={1.5} />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <p className="text-sm font-medium text-text-soft/80 leading-relaxed italic">
                                    Để đảm bảo an toàn cho tài khoản, vui lòng xác nhận mật khẩu hiện tại trước khi thực hiện thay đổi thông tin hồ sơ cá nhân.
                                </p>

                                <div className="form-group">
                                    <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1 mb-3 block opacity-60">Mật khẩu xác minh</label>
                                    <div className="relative group">
                                        <Lock size={18} strokeWidth={1.5} className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${verifyError ? 'text-rose-400' : 'text-gold-muted/40 group-focus-within:text-gold-muted'}`} />
                                        <input
                                            type="password"
                                            className={`w-full bg-beige-soft/30 border-2 py-5 pl-14 pr-6 rounded-2xl text-sm font-bold transition-all focus:ring-4 focus:ring-gold-muted/5 ${verifyError ? 'border-rose-300' : 'border-gold-muted/10 text-text-main'}`}
                                            value={verifyPw}
                                            onChange={e => { setVerifyPw(e.target.value); setVerifyError('') }}
                                            autoFocus
                                            placeholder="Nhập mật khẩu tài khoản..."
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    if (verifyPw === currentUser.password) {
                                                        setIsEditing(true); setShowPwModal(false); setVerifyPw(''); setVerifyError('');
                                                    } else {
                                                        setVerifyError('Mật khẩu không chính xác');
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    {verifyError && <p className="text-[10px] font-bold text-rose-500 mt-3 px-1 uppercase tracking-tight italic">⚠️ {verifyError}</p>}
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        className="flex-1 py-5 bg-beige-soft text-text-soft rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gold-light transition-all active:scale-95"
                                        onClick={() => setShowPwModal(false)}
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        className="flex-[2] py-5 bg-gold-muted text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted/90 transition-all active:scale-95 shadow-lg shadow-gold-muted/20"
                                        onClick={() => {
                                            if (verifyPw === currentUser.password) {
                                                setIsEditing(true)
                                                setShowPwModal(false)
                                                setVerifyPw('')
                                                setVerifyError('')
                                            } else {
                                                setVerifyError('Mật khẩu xác minh không đúng')
                                            }
                                        }}
                                    >
                                        Tiếp tục chỉnh sửa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
