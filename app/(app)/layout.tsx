'use client'
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useApp, canManageUsers, isPageAllowed, canViewAllBranches } from '@/lib/auth'
import { buildAlerts, fmtVND } from '@/lib/calculations'
import {
    LayoutDashboard, ClipboardList, ArrowLeftRight,
    BarChart3, LogOut, Users, Building2, CreditCard, Tag, X,
    Bell, AlertTriangle, CheckCircle, ArrowRight, Star, TrendingUp, TrendingDown,
    UserCircle, Coins, Calendar, Target, Percent, Award, Settings2, Receipt
} from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import PresenceSidebar from '@/components/PresenceSidebar'
import FloatingChatManager from '@/components/FloatingChatManager'
import NotificationBanner from '@/components/NotificationBanner'
import { User } from '@/lib/types'

const FINANCE_NAV = [
    { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { href: '/cashflow', label: 'Dòng tiền', icon: BarChart3 },
    { href: '/transactions', label: 'Sổ cái giao dịch', icon: ArrowLeftRight },
    { href: '/accounts', label: 'Tài khoản & Ví', icon: CreditCard },
    { href: '/activity', label: 'Bản tin hệ thống', icon: Bell, restrictedToAdmin: true },
]
const CRM_NAV = [
    { href: '/crm/customers', label: 'Khách hàng', icon: Users },
    { href: '/crm/leads', label: 'Quản lý Lead', icon: ClipboardList },
    { href: '/crm/appointments', label: 'Lịch hẹn & CSKH', icon: Calendar },
    { href: '/crm/service-orders', label: 'Phiếu dịch vụ', icon: Receipt },
    { href: '/crm/services', label: 'Danh mục dịch vụ', icon: ClipboardList },
    { href: '/crm/sale-settings', label: 'Cấu hình Sale', icon: Settings2 },
]
const HR_NAV = [
    { href: '/crm/attendance', label: 'Chấm công', icon: CheckCircle },
    { href: '/crm/payroll', label: 'Bảng lương', icon: Coins },
]
const SETTINGS_NAV = [
    { href: '/planning', label: 'Lập kế hoạch TC', icon: ClipboardList },
    { href: '/settings/branches', label: 'Quản lý chi nhánh', icon: Building2, restricted: true },
    { href: '/settings/accounts', label: 'Quản lý tài khoản', icon: CreditCard, restricted: true },
    { href: '/settings/categories', label: 'Danh mục thu chi', icon: Tag, restricted: true },
    { href: '/settings/notifications', label: 'Cấu hình thông báo', icon: Bell, restricted: true },
    { href: '/settings/users', label: 'Quản trị nhân sự', icon: Users, adminOnly: true },
]
const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin', director: 'Giám đốc', manager: 'Quản lý', accountant: 'Kế toán', staff: 'Nhân viên',
}
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { currentUser, state, logout, mounted, saveState } = useApp()
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isPreparing, setIsPreparing] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsPreparing(false), 1200)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])


    const [bellOpen, setBellOpen] = useState(false)
    const [chatSidebarOpen, setChatSidebarOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'alerts' | 'watchlist' | 'activity'>('activity')
    const bellRef = useRef<HTMLDivElement>(null)

    const [openChats, setOpenChats] = useState<User[]>([])

    const handleOpenChat = useCallback((user: User) => {
        setOpenChats(prev => {
            if (prev.find(u => u.id === user.id)) return prev
            return [user, ...prev].slice(0, 3) // Limit to 3 open chats
        })
    }, [])

    const handleCloseChat = useCallback((userId: string) => {
        setOpenChats(prev => prev.filter(u => u.id !== userId))
    }, [])

    const closeSidebar = useCallback(() => setSidebarOpen(false), [])

    // Build alerts (memoized — must be before any conditional returns per Rules of Hooks)
    const allAlerts = useMemo(() => buildAlerts(state.plans, state.categories, state.transactions, state.branches), [state.plans, state.categories, state.transactions, state.branches])
    const allItemsForWatchlist = useMemo(() => buildAlerts(state.plans, state.categories, state.transactions, state.branches, true), [state.plans, state.categories, state.transactions, state.branches])

    useEffect(() => { closeSidebar(); setBellOpen(false) }, [pathname, closeSidebar])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { closeSidebar(); setBellOpen(false) }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [closeSidebar])

    // Close bell dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setBellOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        console.log('Layout check:', { mounted, currentUserId: state.currentUserId, currentUserFound: !!currentUser })
        if (mounted && !currentUser) {
            console.log('Layout check: REDIRECTING TO LOGIN - NO CURRENT USER')
            router.replace('/login')
        }
        else if (mounted && currentUser && currentUser.isActive === false) {
            console.log('Layout check: REDIRECTING TO LOGIN - USER INACTIVE')
            logout()
            router.replace('/login')
        }
        else if (mounted && currentUser && !isPageAllowed(currentUser, pathname)) {
            console.log('Layout check: REDIRECTING TO DASHBOARD - NOT ALLOWED')
            router.replace('/dashboard')
        }
    }, [currentUser, mounted, router, pathname, state.currentUserId, logout])


    // Loading Overlay Component
    const LoadingOverlay = () => (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#FAF8F6]/80 backdrop-blur-xl animate-fade-in"
        >
            <div className="flex flex-col items-center gap-12">
                <div className="metallic-spinner-outer scale-110 md:scale-125">
                    <div className="metallic-spinner-inner">
                        <img src="/logo.png" alt="Xinh Group" className="w-full h-full object-contain filter drop-shadow-sm" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <div className="text-[10px] md:text-[12px] font-black text-gold-muted uppercase tracking-[0.6em] animate-pulse">
                        Xin chờ trong giây lát...
                    </div>
                    <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-gold-muted/30 to-transparent"></div>
                </div>
            </div>
        </div>
    )

    if (!mounted || isPreparing) {
        return <LoadingOverlay />
    }
    if (!currentUser) return null

    // allAlerts and allItemsForWatchlist are memoized above (before conditional returns)

    // Alert context keys: "userId:branchId|month|year|categoryId"
    const getAlertKey = (a: any) => `${currentUser?.id}:${a.branchId}|${a.month}|${a.year}|${a.categoryId}`

    const dismissedKeys = new Set(state.dismissedAlerts || [])
    const starredKeys = new Set(state.starredAlerts || [])

    // Logic: 
    // - "Cảnh báo" tab: any alert (warning/exceeded) that is NOT dismissed
    // - "Theo dõi" tab: any item that IS starred (show status even if OK or dismissed)
    const alertsInTab = allAlerts.filter(a => {
        if (dismissedKeys.has(getAlertKey(a))) return false
        // Ensure user can see this branch
        if (currentUser.branchId && a.branchId !== currentUser.branchId && !canViewAllBranches(currentUser)) return false
        // Ensure user can access the cashflow page (where alerts lead)
        return isPageAllowed(currentUser, '/cashflow')
    })
    const watchlistInTab = allItemsForWatchlist.filter(a => {
        if (!starredKeys.has(getAlertKey(a))) return false
        if (currentUser.branchId && a.branchId !== currentUser.branchId && !canViewAllBranches(currentUser)) return false
        return isPageAllowed(currentUser, '/cashflow')
    })

    const exceededCount = alertsInTab.filter(a => a.status === 'exceeded').length
    const warningCount = alertsInTab.filter(a => a.status === 'warning').length
    const totalCount = alertsInTab.length

    function dismissAlert(a: any) {
        const key = getAlertKey(a)
        const current = state.dismissedAlerts || []
        if (!current.includes(key)) {
            const next = [...current, key]
            saveState(s => ({ ...s, dismissedAlerts: next }))
        }
    }

    function toggleStar(a: any, e: React.MouseEvent) {
        e.stopPropagation()
        const key = getAlertKey(a)
        const current = state.starredAlerts || []
        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
        saveState(s => ({ ...s, starredAlerts: next }))
    }

    function dismissAll() {
        const keys = allAlerts.map(getAlertKey)
        const current = state.dismissedAlerts || []
        const next = Array.from(new Set([...current, ...keys]))
        saveState(s => ({ ...s, dismissedAlerts: next }))
    }

    function alertLink(a: any) {
        return `/cashflow?branchId=${a.branchId}&month=${a.month}&year=${a.year}&highlight=${a.categoryId}`
    }

    // Sub-component for User Profile Card
    const UserProfileCard = () => {
        if (!currentUser) return null

        const role = currentUser.role || 'staff'
        const fullName = currentUser.displayName || ''
        const nameParts = fullName.trim().split(/\s+/)
        const firstName = nameParts[nameParts.length - 1] // Given name in VN context
        const roleLabel = ROLE_LABELS[role]

        // Truncate logic if the single name is somehow still very long
        const displayName = firstName.length > 12 ? `${firstName.substring(0, 10)}..` : firstName

        const roleStyles: Record<string, string> = {
            admin: 'from-amber-400/20 to-orange-500/10 text-amber-300 border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]',
            director: 'from-purple-400/20 to-indigo-500/10 text-purple-300 border-purple-400/30 shadow-[0_0_15px_rgba(167,139,250,0.15)]',
            manager: 'from-blue-400/20 to-cyan-500/10 text-blue-300 border-blue-400/30 shadow-[0_0_15px_rgba(96,165,250,0.15)]',
            accountant: 'from-emerald-400/20 to-teal-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]',
            staff: 'from-slate-400/10 to-gray-500/10 text-slate-300 border-white/10 shadow-sm'
        }

        const currentRoleStyle = roleStyles[role] || roleStyles.staff

        return (
            <div className="p-5 w-full">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '14px',
                    boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
                }} className="group hover:bg-white/5 transition-all duration-300 active:scale-[0.97]">
                    <Link href="/profile" onClick={closeSidebar} className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                            <div className="scale-[1] origin-center hover:scale-[1] transition-transform duration-300">
                                <UserAvatar user={currentUser} size="xl" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#111827] rounded-full shadow-lg">
                                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                            </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <p style={{
                                fontSize: '17.5px',
                                fontWeight: '800',
                                color: 'white',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                letterSpacing: '-0.02em',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                            }} className="group-hover:text-gold-muted transition-colors leading-tight">
                                {displayName}
                            </p>
                            <div className={`inline-flex items-center text-[12px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-lg border bg-gradient-to-br w-fit ${currentRoleStyle}`}>
                                {roleLabel}
                            </div>
                        </div>
                    </Link>
                    <button
                        onClick={logout}
                        style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: '16px',
                            color: 'rgba(255,255,255,0.25)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        className="hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/30 transition-all duration-300"
                        title="Đăng xuất"
                    >
                        <LogOut size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        )
    }

    const branch = currentUser.branchId ? state.branches.find(b => b.id === currentUser.branchId) : null

    // Determine alerts to show in dropdown
    const displayList = activeTab === 'alerts' ? alertsInTab : watchlistInTab

    return (
        <div style={{ display: 'flex', minHeight: '100vh', margin: 0, padding: 0 }}>
            {/* Mobile overlay */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} style={{ zIndex: 1900 }} onClick={closeSidebar} aria-hidden="true" />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ zIndex: 2000 }}>
                <div style={{ padding: '32px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: 120, height: 120, borderRadius: '5px',
                        background: 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <img src="/logo.png" alt="Xinh Group" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>

                        <div style={{
                            color: 'var(--secondary)',
                            fontWeight: 800,
                            fontSize: '11px',
                            letterSpacing: '2px',
                            fontFamily: "'Playfair Display', serif",
                            textTransform: 'uppercase'
                        }}>
                            ERP SYSTEM
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav luxury-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                    <div className="sidebar-section" style={{ fontSize: '0.75rem', padding: '28px 16px 12px' }}>Tài chính</div>
                    {FINANCE_NAV.filter(item => isPageAllowed(currentUser, item.href)).map(item => {
                        const Icon = item.icon
                        const active = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`} style={{ fontSize: '1rem', padding: '12px 16px' }} onClick={closeSidebar}>
                                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                    <div className="sidebar-section" style={{ fontSize: '0.75rem', padding: '28px 16px 12px' }}>Quản trị khách hàng</div>
                    {CRM_NAV.filter(item => isPageAllowed(currentUser, item.href)).map(item => {
                        const Icon = item.icon
                        const active = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`} style={{ fontSize: '1rem', padding: '12px 16px' }} onClick={closeSidebar}>
                                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                    <div className="sidebar-section" style={{ fontSize: '0.75rem', padding: '28px 16px 12px' }}>Nhân sự & lương</div>
                    {HR_NAV.filter(item => isPageAllowed(currentUser, item.href)).map(item => {
                        const Icon = item.icon
                        const active = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`} style={{ fontSize: '1rem', padding: '12px 16px' }} onClick={closeSidebar}>
                                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                    <div className="sidebar-section" style={{ fontSize: '0.75rem', padding: '28px 16px 12px' }}>Hệ thống</div>
                    {SETTINGS_NAV.filter(item => isPageAllowed(currentUser, item.href)).map(item => {
                        const Icon = item.icon
                        const active = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`} style={{ fontSize: '1rem', padding: '12px 16px' }} onClick={closeSidebar}>
                                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* User Profile Card (Always at bottom of sidebar) */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <UserProfileCard />
                </div>
            </aside>

            {/* Main column: topbar + content */}
            <div className="main-content luxury-scrollbar"
                onClick={() => { if (sidebarOpen) closeSidebar(); }}
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: !isMobile ? 'var(--sidebar-width)' : 0,
                    marginRight: 0,
                    paddingTop: 0,
                    '--header-offset': isMobile ? '56px' : '0px'
                } as any}>

                {/* Dynamic Notification Banner (Overlay) */}
                <NotificationBanner userId={currentUser?.id} />

                {/* Mobile Top Bar — INSIDE scroll container for sticky to work */}
                {isMobile && (
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        height: '56px',
                        background: 'white',
                        zIndex: 960,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 16px',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        flexShrink: 0,
                    }}>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Mở menu"
                            style={{
                                background: 'white',
                                border: '1.5px solid var(--border)',
                                borderRadius: '12px',
                                padding: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px'
                            }}
                        >
                            <img src="/logo.png" alt="Menu" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                        </button>
                        <div style={{ marginLeft: '12px', fontSize: '11px', fontWeight: 900, color: 'var(--gold-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                            Xinh Group
                        </div>
                        {/* Bell — same row as logo, pushed to the right */}
                        <div ref={bellRef} style={{ marginLeft: 'auto', position: 'relative' }}>
                            <button
                                onClick={() => setBellOpen(v => !v)}
                                aria-label="Thông báo"
                                style={{
                                    width: 40, height: 40, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer',
                                    background: totalCount > 0
                                        ? (exceededCount > 0 ? 'rgba(254, 226, 226, 0.85)' : 'rgba(254, 243, 199, 0.85)')
                                        : 'rgba(255, 255, 255, 0.7)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                }}
                            >
                                <Bell size={18} color={exceededCount > 0 ? '#dc2626' : warningCount > 0 ? '#d97706' : '#6b7280'} />
                                {totalCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: -4, right: -4,
                                        background: exceededCount > 0 ? '#dc2626' : '#d97706',
                                        color: 'white', borderRadius: '99px',
                                        fontSize: '0.6rem', fontWeight: 800,
                                        padding: '1px 5px', lineHeight: 1.4,
                                        border: '2px solid white',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    }}>
                                        {totalCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {bellOpen && (
                                <div style={{
                                    position: 'absolute', top: 42, right: 0,
                                    width: 360, maxHeight: 520, display: 'flex', flexDirection: 'column',
                                    background: 'white', borderRadius: '14px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                    border: '1px solid var(--border)',
                                    zIndex: 110,
                                }}>
                                    {/* Header / Tabs */}
                                    <div style={{ padding: '12px 16px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Bản tin hệ thống</h1>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                {activeTab === 'alerts' && alertsInTab.length > 0 && (
                                                    <button onClick={dismissAll}
                                                        style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                                                        Xóa tất cả
                                                    </button>
                                                )}
                                                <button onClick={() => setBellOpen(false)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', lineHeight: 0, padding: 2 }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '20px' }}>
                                            <button
                                                onClick={() => setActiveTab('activity')}
                                                style={{
                                                    background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'activity' ? 'var(--primary)' : 'transparent'}`,
                                                    padding: '4px 0 10px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'activity' ? 'var(--primary)' : 'var(--muted)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Hoạt động
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('alerts')}
                                                style={{
                                                    background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'alerts' ? 'var(--primary)' : 'transparent'}`,
                                                    padding: '4px 0 10px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'alerts' ? 'var(--primary)' : 'var(--muted)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cảnh báo {alertsInTab.length > 0 && `(${alertsInTab.length})`}
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('watchlist')}
                                                style={{
                                                    background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'watchlist' ? 'var(--primary)' : 'transparent'}`,
                                                    padding: '4px 0 10px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'watchlist' ? 'var(--primary)' : 'var(--muted)',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                }}
                                            >
                                                Theo dõi {watchlistInTab.length > 0 && `(${watchlistInTab.length})`}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Alert list */}
                                    <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                                        {activeTab === 'activity' ? (
                                            (state.activityLogs || []).length === 0 ? (
                                                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
                                                    Chưa có hoạt động nào
                                                </div>
                                            ) : (
                                                [...(state.activityLogs || [])]
                                                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                                    .filter(log => {
                                                        if (currentUser.role === 'admin') return true
                                                        if (currentUser.branchId && !canViewAllBranches(currentUser)) {
                                                            const userBranch = state.branches.find(b => b.id === currentUser.branchId)
                                                            if (userBranch) {
                                                                const otherBranches = state.branches.filter(b => b.id !== currentUser.branchId)
                                                                if (otherBranches.some(b => log.details.includes(`[${b.name}]`) || log.details.includes(b.name))) return false
                                                            }
                                                        }
                                                        return true
                                                    })
                                                    .slice(0, 50)
                                                    .map((log, i, arr) => {
                                                        const u = state.users.find(user => user.id === log.userId)
                                                        const time = new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                                        const isIncome = log.details.includes('[THU]')
                                                        const isExpense = log.details.includes('[CHI]')
                                                        const semanticColor = isIncome ? 'var(--success)' : isExpense ? 'var(--danger)' : 'var(--foreground)'

                                                        return (
                                                            <div key={log.id} style={{
                                                                padding: '10px 16px',
                                                                borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
                                                                display: 'flex', gap: 12, alignItems: 'center'
                                                            }}>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '0.8rem', color: semanticColor, lineHeight: 1.4, fontWeight: 600 }}>
                                                                        {log.details}
                                                                    </div>
                                                                </div>
                                                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                                                    <div style={{ fontWeight: 700, fontSize: '0.65rem', color: 'var(--primary)' }}>
                                                                        {u?.displayName || 'System'}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                                                                        {time}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                            )
                                        ) : displayList.length === 0 ? (
                                            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                                                {activeTab === 'watchlist' ? (
                                                    <>
                                                        <Star size={28} color="#d1d5db" style={{ display: 'block', margin: '0 auto 8px' }} />
                                                        <div style={{ fontSize: '0.875rem' }}>Chưa có khoản nào được đánh dấu theo dõi</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={28} color="#10b981" style={{ display: 'block', margin: '0 auto 8px' }} />
                                                        <div style={{ fontWeight: 600, color: '#065f46', fontSize: '0.875rem' }}>Mọi thứ trong tầm kiểm soát</div>
                                                        <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Tất cả dòng tiền đang trong kế hoạch ✓</div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            displayList.map(a => {
                                                const key = getAlertKey(a)
                                                const isExceeded = a.status === 'exceeded'
                                                const isWarning = a.status === 'warning'
                                                const isOK = a.status === 'ok'
                                                const isStarred = starredKeys.has(key)

                                                const cardBg = isExceeded ? '#fff1f2' : isWarning ? '#fffbeb' : '#f0fdf4'
                                                const cardBorder = isExceeded ? '#dc2626' : isWarning ? '#d97706' : '#10b981'
                                                const textColor = isExceeded ? '#dc2626' : isWarning ? '#92400e' : '#15803d'
                                                return (
                                                    <div key={key} style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                                        padding: '10px 16px',
                                                        borderLeft: `3px solid ${cardBorder}`,
                                                        margin: '0 8px 6px', borderRadius: '0 8px 8px 0',
                                                        background: cardBg,
                                                        position: 'relative'
                                                    }}>
                                                        <button
                                                            onClick={(e) => toggleStar(a, e)}
                                                            style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', position: 'absolute', top: 10, right: 36, color: isStarred ? '#eab308' : '#d1d5db' }}
                                                        >
                                                            <Star size={14} fill={isStarred ? '#eab308' : 'none'} />
                                                        </button>

                                                        <div style={{ paddingTop: 2, flexShrink: 0 }}>
                                                            {isOK ? <CheckCircle size={14} color="#10b981" /> : <AlertTriangle size={14} color={cardBorder} />}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <Link
                                                                href={alertLink(a)}
                                                                onClick={() => setBellOpen(false)}
                                                                style={{ textDecoration: 'none' }}
                                                            >
                                                                <div style={{ fontWeight: 700, fontSize: '0.825rem', color: textColor, cursor: 'pointer', paddingRight: 40 }}>
                                                                    {a.categoryName}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                                                                    {a.branchName} · {MONTHS[a.month - 1]}/{a.year}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <span style={{ color: 'var(--muted)' }}>KH: {fmtVND(a.planned)}</span>
                                                                    <ArrowRight size={10} color="var(--muted)" />
                                                                    <span style={{ color: textColor, fontWeight: 700 }}>{fmtVND(a.actual)} ({a.pct.toFixed(0)}%)</span>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                        {activeTab === 'alerts' && (
                                                            <button onClick={() => dismissAlert(a)}
                                                                title="Tắt"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, lineHeight: 0, flexShrink: 0 }}>
                                                                <X size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Desktop Bell — fixed position */}
                {!isMobile && (
                    <div ref={bellRef} style={{
                        position: 'fixed',
                        top: 12,
                        right: 16,
                        zIndex: 55,
                    }}>
                        <button
                            onClick={() => setBellOpen(v => !v)}
                            aria-label="Thông báo"
                            style={{
                                width: 44, height: 44, borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer',
                                background: totalCount > 0
                                    ? (exceededCount > 0 ? 'rgba(254, 226, 226, 0.85)' : 'rgba(254, 243, 199, 0.85)')
                                    : 'rgba(255, 255, 255, 0.7)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative', transition: 'all 0.2s ease',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            }}
                        >
                            <Bell size={20} color={exceededCount > 0 ? '#dc2626' : warningCount > 0 ? '#d97706' : '#6b7280'} />
                            {totalCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: -5, right: -5,
                                    background: exceededCount > 0 ? '#dc2626' : '#d97706',
                                    color: 'white', borderRadius: '99px',
                                    fontSize: '0.65rem', fontWeight: 800,
                                    padding: '2px 6px', lineHeight: 1.4,
                                    border: '2px solid white',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                }}>
                                    {totalCount}
                                </span>
                            )}
                        </button>

                        {/* Desktop Dropdown */}
                        {bellOpen && (
                            <div style={{
                                position: 'absolute', top: 42, right: 0,
                                width: 360, maxHeight: 520, display: 'flex', flexDirection: 'column',
                                background: 'white', borderRadius: '14px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                border: '1px solid var(--border)',
                                zIndex: 110,
                            }}>
                                <div style={{ padding: '12px 16px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Bản tin hệ thống</h1>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {activeTab === 'alerts' && alertsInTab.length > 0 && (
                                                <button onClick={dismissAll}
                                                    style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                                                    Xóa tất cả
                                                </button>
                                            )}
                                            <button onClick={() => setBellOpen(false)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', lineHeight: 0, padding: 2 }}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <button onClick={() => setActiveTab('activity')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'activity' ? 'var(--primary)' : 'transparent'}`, padding: '4px 0 10px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'activity' ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer' }}>Hoạt động</button>
                                        <button onClick={() => setActiveTab('alerts')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'alerts' ? 'var(--primary)' : 'transparent'}`, padding: '4px 0 10px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'alerts' ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer' }}>Cảnh báo {alertsInTab.length > 0 && `(${alertsInTab.length})`}</button>
                                        <button onClick={() => setActiveTab('watchlist')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'watchlist' ? 'var(--primary)' : 'transparent'}`, padding: '4px 0 10px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'watchlist' ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>Theo dõi {watchlistInTab.length > 0 && `(${watchlistInTab.length})`}</button>
                                    </div>
                                </div>
                                <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                                    {activeTab === 'activity' ? (
                                        (state.activityLogs || []).length === 0 ? (
                                            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>Chưa có hoạt động nào</div>
                                        ) : (
                                            [...(state.activityLogs || [])]
                                                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                                .filter(log => { if (currentUser.role === 'admin') return true; if (currentUser.branchId && !canViewAllBranches(currentUser)) { const userBranch = state.branches.find(b => b.id === currentUser.branchId); if (userBranch) { const otherBranches = state.branches.filter(b => b.id !== currentUser.branchId); if (otherBranches.some(b => log.details.includes(`[${b.name}]`) || log.details.includes(b.name))) return false; } } return true; })
                                                .slice(0, 50)
                                                .map((log, i, arr) => {
                                                    const u = state.users.find(user => user.id === log.userId)
                                                    const time = new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                                    const isIncome = log.details.includes('[THU]')
                                                    const isExpense = log.details.includes('[CHI]')
                                                    const semanticColor = isIncome ? 'var(--success)' : isExpense ? 'var(--danger)' : 'var(--foreground)'
                                                    return (
                                                        <div key={log.id} style={{ padding: '10px 16px', borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                                                            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.8rem', color: semanticColor, lineHeight: 1.4, fontWeight: 600 }}>{log.details}</div></div>
                                                            <div style={{ flexShrink: 0, textAlign: 'right' }}><div style={{ fontWeight: 700, fontSize: '0.65rem', color: 'var(--primary)' }}>{u?.displayName || 'System'}</div><div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{time}</div></div>
                                                        </div>
                                                    )
                                                })
                                        )
                                    ) : displayList.length === 0 ? (
                                        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                                            {activeTab === 'watchlist' ? (<><Star size={28} color="#d1d5db" style={{ display: 'block', margin: '0 auto 8px' }} /><div style={{ fontSize: '0.875rem' }}>Chưa có khoản nào được đánh dấu theo dõi</div></>) : (<><CheckCircle size={28} color="#10b981" style={{ display: 'block', margin: '0 auto 8px' }} /><div style={{ fontWeight: 600, color: '#065f46', fontSize: '0.875rem' }}>Mọi thứ trong tầm kiểm soát</div><div style={{ fontSize: '0.78rem', marginTop: 4 }}>Tất cả dòng tiền đang trong kế hoạch ✓</div></>)}
                                        </div>
                                    ) : (
                                        displayList.map(a => {
                                            const key = getAlertKey(a); const isExceeded = a.status === 'exceeded'; const isWarning = a.status === 'warning'; const isOK = a.status === 'ok'; const isStarred = starredKeys.has(key)
                                            const cardBg = isExceeded ? '#fff1f2' : isWarning ? '#fffbeb' : '#f0fdf4'; const cardBorder = isExceeded ? '#dc2626' : isWarning ? '#d97706' : '#10b981'; const textColor = isExceeded ? '#dc2626' : isWarning ? '#92400e' : '#15803d'
                                            return (
                                                <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderLeft: `3px solid ${cardBorder}`, margin: '0 8px 6px', borderRadius: '0 8px 8px 0', background: cardBg, position: 'relative' }}>
                                                    <button onClick={(e) => toggleStar(a, e)} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', position: 'absolute', top: 10, right: 36, color: isStarred ? '#eab308' : '#d1d5db' }}><Star size={14} fill={isStarred ? '#eab308' : 'none'} /></button>
                                                    <div style={{ paddingTop: 2, flexShrink: 0 }}>{isOK ? <CheckCircle size={14} color="#10b981" /> : <AlertTriangle size={14} color={cardBorder} />}</div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <Link href={alertLink(a)} onClick={() => setBellOpen(false)} style={{ textDecoration: 'none' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.825rem', color: textColor, cursor: 'pointer', paddingRight: 40 }}>{a.categoryName}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{a.branchName} · {MONTHS[a.month - 1]}/{a.year}</div>
                                                            <div style={{ fontSize: '0.75rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--muted)' }}>KH: {fmtVND(a.planned)}</span><ArrowRight size={10} color="var(--muted)" /><span style={{ color: textColor, fontWeight: 700 }}>{fmtVND(a.actual)} ({a.pct.toFixed(0)}%)</span></div>
                                                        </Link>
                                                    </div>
                                                    {activeTab === 'alerts' && (<button onClick={() => dismissAlert(a)} title="Tắt" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, lineHeight: 0, flexShrink: 0 }}><X size={13} /></button>)}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Page content */}
                <main style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                    {children}
                </main>
            </div>

            {/* Chat Components */}
            <PresenceSidebar
                onOpenChat={handleOpenChat}
                isOpen={chatSidebarOpen}
                onToggle={(val) => setChatSidebarOpen(val)}
            />
            <FloatingChatManager
                openChats={openChats}
                onCloseChat={handleCloseChat}
                chatSidebarOpen={chatSidebarOpen}
            />
        </div>
    )
}
