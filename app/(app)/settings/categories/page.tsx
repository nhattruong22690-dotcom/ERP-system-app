'use client'
import { useState, useRef } from 'react'
import { useApp, canManageCategories } from '@/lib/auth'
import { Category, CategorySection } from '@/lib/types'
import { saveCategory, deleteCategory, importCategories } from '@/lib/storage'
import { Plus, Edit2, X, Trash2, Upload, Download, Tag, PlusCircle, Calculator, Check, List, Sparkles, ChevronDown, ArrowRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import PageHeader from '@/components/PageHeader'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'

function uid() { return 'cat-' + Math.random().toString(36).slice(2) }

const SECTIONS: { value: CategorySection; label: string }[] = [
    { value: 'revenue', label: '📊 Doanh thu' },
    { value: 'fixed_cost', label: '🏢 Chi phí cố định' },
    { value: 'variable_cost', label: '💼 Chi phí biến động' },
    { value: 'fund', label: '🏦 Quỹ' },
]

export default function CategoriesPage() {
    const { currentUser, state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [form, setForm] = useState<Partial<Category>>({})
    const canEdit = canManageCategories(currentUser)

    // Tab state: 'income' or 'expense'
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense')
    const [filterSection, setFilterSection] = useState<string>('')
    const [search, setSearch] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    function handleDownloadTemplate() {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Tên danh mục', 'Nhóm (fixed_cost/variable_cost/fund)', 'Tính theo % doanh thu (TRUE/FALSE)', 'Định mức % (ví dụ 0.12)', 'Thứ tự hiển thị'],
            ['Lương nhân viên', 'fixed_cost', 'FALSE', '', 1],
            ['Tiền điện nước', 'variable_cost', 'FALSE', '', 2],
            ['Chi phí Marketing', 'variable_cost', 'TRUE', 0.15, 3]
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Mau_Danh_Muc_Chi')
        XLSX.writeFile(wb, 'Mau_Import_Danh_Muc_Chi.xlsx')
    }

    async function handleImport() {
        if (fileInputRef.current) fileInputRef.current.click()
    }

    function processFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result as string
                const wb = XLSX.read(bstr, { type: 'binary' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

                const newCats: Category[] = []
                for (let i = 1; i < data.length; i++) {
                    const [name, section, isRate, rate, sort] = data[i]
                    if (!name || !section) continue
                    newCats.push({
                        id: uid(),
                        name: String(name),
                        section: String(section).toLowerCase() as CategorySection,
                        isRateBased: String(isRate).toUpperCase() === 'TRUE',
                        defaultRate: rate ? Number(rate) : undefined,
                        sortOrder: sort ? Number(sort) : 0,
                        createdAt: new Date().toISOString()
                    })
                }

                if (newCats.length > 0) {
                    // 1. Pure update
                    saveState(importCategories(newCats))
                    // 2. Side effects
                    import('@/lib/storage').then(m => m.syncImportCategories(newCats, currentUser?.id).then(log => {
                        if (log) saveState(s => ({ ...s, activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200) }))
                    }))
                    showToast('Import thành công', `Đã nhập khẩu ${newCats.length} danh mục chi phí`)
                } else {
                    await showAlert('Không tìm thấy dữ liệu hợp lệ trong file')
                }
            } catch (err) {
                console.error(err)
                await showAlert('Lỗi khi đọc file Excel!')
            }
        }
        reader.readAsBinaryString(file)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function openNew() {
        setForm({
            section: activeTab === 'income' ? 'revenue' : 'fixed_cost',
            isRateBased: false,
            sortOrder: 99
        })
        setEditing(null)
        setShowForm(true)
    }

    function openEdit(c: Category) {
        setForm({ ...c })
        setEditing(c)
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.name || !form.section) { await showAlert('Điền tên và loại'); return }
        const cat: Category = {
            id: editing?.id ?? uid(), name: form.name!, section: form.section as CategorySection,
            defaultRate: form.isRateBased ? form.defaultRate : undefined,
            isRateBased: form.isRateBased ?? false, sortOrder: form.sortOrder ?? 99,
            createdAt: editing?.createdAt ?? new Date().toISOString(),
        }
        // 1. Pure update
        saveState(saveCategory(cat))

        // 2. Side effects
        import('@/lib/storage').then(m => m.syncCategory(cat, currentUser?.id).then(log => {
            if (log) saveState(s => ({ ...s, activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200) }))
        }))

        showToast('Lưu thành công', `Đã lưu danh mục ${cat.name}`)
        setShowForm(false)
    }

    async function handleDelete(id: string) {
        const cat = state.categories.find(c => c.id === id)
        if (!await showConfirm(`Bạn có chắc muốn xóa danh mục "${cat?.name || ''}"?`)) return
        const catName = cat?.name || ''
        // 1. Pure update
        saveState(deleteCategory(id))
        // 2. Side effects
        import('@/lib/storage').then(m => m.syncDeleteCategory(id, currentUser?.id, catName).then(log => {
            if (log) saveState(s => ({ ...s, activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200) }))
        }))
        showToast('Đã xóa', `Danh mục ${catName} đã được ẩn khỏi hệ thống`, 'info')
    }

    const filtered = state.categories
        .filter(c => !c.isHidden)
        .filter(c => {
            if (activeTab === 'income') return c.section === 'revenue'
            return c.section !== 'revenue'
        })
        .filter(c => !filterSection || c.section === filterSection)
        .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.sortOrder - b.sortOrder)

    const availableSections = SECTIONS.filter(s => {
        if (activeTab === 'income') return s.value === 'revenue'
        return s.value !== 'revenue'
    })

    return (
        <div className="page-container">
            <PageHeader
                icon={Tag}
                title="Danh mục Thu & Chi"
                subtitle="Financial Categories"
                description="Quản lý cấu trúc tài chính hệ thống"
                actions={
                    <div className="flex items-center gap-4">
                        {currentUser?.role === 'admin' && activeTab === 'expense' && (
                            <div className="flex gap-2">
                                <input type="file" ref={fileInputRef} accept=".xlsx, .xls" style={{ display: 'none' }} onChange={processFile} />
                                <button
                                    className="px-6 py-3 bg-white border border-gold-light text-gold-muted rounded-[15px] text-[10px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-light transition-all duration-300 flex items-center gap-2 active:scale-95"
                                    onClick={handleDownloadTemplate}
                                >
                                    <Download size={16} strokeWidth={1.5} /> Mẫu Excel
                                </button>
                                <button
                                    className="px-6 py-3 bg-white border border-gold-light text-gold-muted rounded-[15px] text-[10px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-light transition-all duration-300 flex items-center gap-2 active:scale-95"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={16} strokeWidth={1.5} /> Import
                                </button>
                            </div>
                        )}
                        {canEdit && (
                            <button
                                onClick={openNew}
                                className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-2 active:scale-95 group"
                            >
                                <PlusCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                                Thêm danh mục mới
                            </button>
                        )}
                    </div>
                }
            />

            <div className="px-10 py-12 pb-32 max-w-[1400px] mx-auto animate-fade-in">
                {/* Tabs & Filters Luxury */}
                <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-gold-light/30 shadow-luxury p-2 flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                    <div className="flex gap-2 p-1.5 bg-beige-soft/50 rounded-2xl">
                        <button
                            onClick={() => { setActiveTab('expense'); setFilterSection('') }}
                            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'expense' ? 'bg-gold-muted text-white shadow-lg shadow-gold-muted/20' : 'text-text-soft hover:text-gold-muted hover:bg-white'}`}
                        >
                            Danh mục CHI
                        </button>
                        <button
                            onClick={() => { setActiveTab('income'); setFilterSection('') }}
                            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'income' ? 'bg-gold-muted text-white shadow-lg shadow-gold-muted/20' : 'text-text-soft hover:text-gold-muted hover:bg-white'}`}
                        >
                            Danh mục THU
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 px-4">
                        <div className="relative">
                            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted/50 rotate-45" size={16} strokeWidth={1.5} />
                            <input
                                type="text"
                                placeholder="Tìm tên danh mục..."
                                className="pl-12 pr-6 py-3 bg-beige-soft/50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-gold-muted/20 w-full md:w-[280px] transition-all placeholder:text-text-soft/40"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {activeTab === 'expense' && (
                            <select
                                className="bg-beige-soft/50 border-none rounded-xl py-3 px-6 text-xs font-bold focus:ring-2 focus:ring-gold-muted/20 transition-all cursor-pointer min-w-[200px] text-text-main"
                                value={filterSection}
                                onChange={e => setFilterSection(e.target.value)}
                            >
                                <option value="">Tất cả nhóm chi</option>
                                {SECTIONS.filter(s => s.value !== 'revenue').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-gold-light/20 rounded-[32px] shadow-luxury overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left luxury-table border-collapse">
                            <thead>
                                <tr className="bg-beige-soft/50 border-b border-gold-light/20">
                                    <th className="px-10 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest w-20 text-center">Thứ tự</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Tên danh mục</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Nhóm phân loại</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest text-center">Phương thức</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest text-center">Định mức</th>
                                    {canEdit && <th className="px-10 py-5 text-right w-32" />}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gold-light/10">
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-10 py-20 text-center text-text-soft/40 text-xs font-bold uppercase tracking-widest italic">
                                            Chưa có dữ liệu danh mục trong mục này
                                        </td>
                                    </tr>
                                )}
                                {filtered.map(c => {
                                    const sec = SECTIONS.find(s => s.value === c.section)
                                    return (
                                        <tr key={c.id} className="hover:bg-beige-soft/30 transition-colors group">
                                            <td className="px-10 py-6 text-center">
                                                <span className="text-[11px] font-black text-text-soft opacity-30 tracking-tighter">#{c.sortOrder}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-[14px] font-bold text-text-main tracking-tight">{c.name}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="px-4 py-1.5 bg-beige-soft border border-gold-light/20 text-text-soft text-[10px] font-black rounded-lg uppercase tracking-widest">
                                                    {sec?.label}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-center">
                                                {c.isRateBased ? (
                                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                                        ⚡ Tự động (% DT)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-100">
                                                        ✏️ Nhập tay
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-10 py-6 text-center font-serif italic text-lg text-gold-muted font-bold">
                                                {c.defaultRate !== undefined ? (c.defaultRate * 100).toFixed(2) + '%' : '—'}
                                            </td>
                                            {canEdit && (
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            className="p-3 bg-white text-gold-muted/40 hover:text-gold-muted hover:bg-gold-light/50 border border-transparent hover:border-gold-light/40 rounded-xl transition-all shadow-sm active:scale-90"
                                                            onClick={() => openEdit(c)}
                                                        >
                                                            <Edit2 size={16} strokeWidth={1.5} />
                                                        </button>
                                                        <button
                                                            className="p-3 bg-white text-rose-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-sm active:scale-90"
                                                            onClick={() => handleDelete(c.id)}
                                                        >
                                                            <Trash2 size={16} strokeWidth={1.5} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget && await showConfirm('Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.')) setShowForm(false) }}>
                    <div className="bg-white w-full max-w-3xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                        {/* Left Side: Branding Sidebar */}
                        <div className="w-full md:w-[200px] bg-text-main relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-between border-b md:border-b-0 md:border-r border-white/5">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>

                            <div className="relative z-10 flex flex-col items-center w-full">
                                <div className="w-20 h-20 rounded-[28px] bg-white/10 border border-white/20 flex items-center justify-center mb-6 backdrop-blur-md shadow-2xl relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent group-hover:scale-110 transition-transform duration-700"></div>
                                    <Tag size={32} className="text-gold-muted drop-shadow-sm relative z-10" strokeWidth={2.5} />
                                </div>

                                <div className="text-center space-y-1">
                                    <h4 className="text-[9px] text-gold-muted font-black uppercase tracking-[0.3em] italic">Cấu trúc tài chính</h4>
                                    <p className="text-[13px] text-white font-serif font-black uppercase tracking-widest whitespace-nowrap">Danh mục</p>
                                    <div className="w-8 h-1 bg-gold-muted/30 mx-auto rounded-full mt-4"></div>
                                </div>
                            </div>

                            <div className="relative z-10 w-full mt-8">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                                    <div className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-1 text-center italic">Phân loại</div>
                                    <div className="text-center text-[10px] font-black text-gold-muted uppercase tracking-wider tabular-nums">
                                        {activeTab === 'income' ? 'Dòng tiền vào' : 'Chi phí vận hành'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Form Content */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0">
                            {/* Close Button */}
                            <button onClick={() => setShowForm(false)} className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white text-text-soft hover:text-rose-500 flex items-center justify-center transition-all shadow-sm border border-gold-light/20 active:scale-90 z-20">
                                <X size={22} strokeWidth={2.5} />
                            </button>

                            <div className="p-8 md:p-12 space-y-10">
                                {/* Title Section */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-soft/60 italic">Thiết lập danh mục hạch toán tập trung</span>
                                    </div>
                                    <h2 className="text-4xl font-serif font-black text-text-main tracking-tighter uppercase leading-none italic">
                                        {editing ? 'Hiệu chỉnh' : 'Khởi tạo'} <span className="text-indigo-600">Phân loại</span>
                                    </h2>
                                </div>

                                <div className="space-y-8">
                                    {/* Info Alert */}
                                    <div className="p-6 bg-indigo-50/40 border-2 border-dashed border-indigo-100 rounded-[32px] flex gap-5 items-start">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shrink-0 shadow-sm border border-indigo-100">
                                            <Calculator size={20} strokeWidth={2} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-indigo-900/60 leading-relaxed uppercase tracking-widest italic">
                                                Lưu ý: <span className="text-indigo-600 underline underline-offset-4 decoration-indigo-200">Danh mục này</span> sẽ được áp dụng cho toàn bộ các chi nhánh trong hệ thống TaiChinh.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-[0.2em] block pl-2 italic">Tên danh mục thu/chi *</label>
                                            <input
                                                className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[24px] px-6 py-5 text-[15px] font-bold text-text-main outline-none transition-all shadow-sm italic placeholder:opacity-30"
                                                value={form.name ?? ''}
                                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="VD: Chi phí Marketing, Thu học phí..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-[0.2em] block pl-2 italic">Nhóm phân loại</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[24px] px-6 py-5 text-[14px] font-black text-text-main outline-none transition-all appearance-none shadow-sm cursor-pointer italic"
                                                        value={form.section ?? ''}
                                                        onChange={e => setForm(f => ({ ...f, section: e.target.value as CategorySection }))}
                                                    >
                                                        {availableSections.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                    </select>
                                                    <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-gold-muted/40 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-[0.2em] block pl-2 italic">Thứ tự hiển thị</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[24px] px-6 py-5 text-[15px] font-black text-text-main outline-none transition-all text-center shadow-sm italic"
                                                    value={form.sortOrder ?? 99}
                                                    onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Rate Toggle */}
                                        <div
                                            onClick={() => setForm(f => ({ ...f, isRateBased: !f.isRateBased }))}
                                            className={`p-8 rounded-[40px] border-2 transition-all duration-500 cursor-pointer flex items-center justify-between group ${form.isRateBased ? 'border-indigo-500 bg-indigo-50/30' : 'border-gold-light/10 bg-white hover:border-gold-light/40 shadow-sm'}`}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${form.isRateBased ? 'bg-indigo-600 shadow-xl shadow-indigo-100 text-white' : 'bg-beige-soft/50 text-text-soft/40 border border-gold-light/10'}`}>
                                                    <Calculator size={24} strokeWidth={2} className={form.isRateBased ? 'animate-pulse' : ''} />
                                                </div>
                                                <div>
                                                    <p className={`text-[12px] font-black uppercase tracking-widest ${form.isRateBased ? 'text-indigo-600' : 'text-text-soft/60'}`}>Tự động tính theo % Doanh thu</p>
                                                    <p className="text-[10px] font-bold text-text-soft/30 mt-1 uppercase tracking-tighter italic">Hệ thống sẽ tự trích xuất dựa trên doanh thu thực tế</p>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${form.isRateBased ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gold-light/20 bg-white'}`}>
                                                {form.isRateBased && <Check size={14} strokeWidth={4} />}
                                            </div>
                                        </div>

                                        {form.isRateBased && (
                                            <div className="space-y-4 animate-modal-up">
                                                <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-[0.2em] block pl-2 italic text-center">Định mức hạch toán dự kiến (%)</label>
                                                <div className="relative max-w-[240px] mx-auto">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-indigo-50/50 border-2 border-indigo-200 rounded-[32px] py-6 px-8 text-3xl font-serif font-black text-indigo-600 focus:ring-8 focus:ring-indigo-50 transition-all text-center outline-none shadow-inner italic"
                                                        step="0.01"
                                                        value={form.defaultRate !== undefined ? form.defaultRate * 100 : ''}
                                                        onChange={e => setForm(f => ({ ...f, defaultRate: +e.target.value / 100 }))}
                                                        placeholder="0.00"
                                                    />
                                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-400 font-serif italic font-bold text-xl">%</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="pt-4 flex gap-5">
                                    <button
                                        className="flex-1 py-6 bg-white text-text-soft/40 rounded-[24px] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-rose-50 hover:text-rose-600 border border-gold-light/20 transition-all active:scale-95 shadow-sm italic"
                                        onClick={() => setShowForm(false)}
                                    >
                                        Hủy thiết lập
                                    </button>
                                    <button
                                        className="flex-[2] py-6 bg-text-main text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.2em] shadow-luxury hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-4 italic group"
                                        onClick={handleSave}
                                    >
                                        Xác nhận lưu thay đổi
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
