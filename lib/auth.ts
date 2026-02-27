'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AppState, User } from './types'
import { getState, setState } from './storage'
import { fetchAllData } from './supabaseFetch'
import { supabase } from './supabase'

interface AppContextValue {
    state: AppState
    currentUser: User | undefined
    mounted: boolean
    login: (username: string, password: string) => { success: boolean, error?: string }
    logout: () => void
    refresh: () => void
    saveState: (updater: (s: AppState) => AppState) => void
    updateProfile: (data: Partial<User>) => Promise<boolean>
    updateUserById: (userId: string, data: Partial<User>) => Promise<boolean>
}

// Empty state used for both SSR and pre-hydration client render
const EMPTY_STATE: AppState = {
    users: [],
    currentUserId: undefined,
    branches: [],
    accounts: [],
    categories: [],
    plans: [],
    transactions: [],
    dismissedAlerts: [],
    starredAlerts: [],
    activityLogs: [],
    customers: [],
    appointments: [],
    services: [],
    membershipTiers: [],
    treatmentCards: [],
    commissionSettings: [],
    leads: [],
    commissionLogs: [],
    userMissions: [],
    jobTitles: [],
    attendance: [],
    salaryHistory: [],
    bonuses: [],
    deductions: [],
    salaryAdvances: [],
    payrollRosters: [],
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
    // Start with data from localStorage if available to avoid empty state on mount
    const [state, setLocalState] = useState<AppState>(() => {
        if (typeof window !== 'undefined') return getState()
        return EMPTY_STATE
    })
    const [mounted, setMounted] = useState(false)

    // After hydration, load real data from supabase
    useEffect(() => {
        if (!mounted) {
            fetchAllData().then(data => {
                if (data && data.users.length > 0) {
                    const local = getState()
                    data.currentUserId = local.currentUserId
                    data.dismissedAlerts = local.dismissedAlerts || []
                    data.starredAlerts = local.starredAlerts || []

                    setLocalState(data)
                    setState(data) // Ghi lại vào storage với ID mới nhất
                } else {
                    setLocalState(getState())
                }
                setTimeout(() => setMounted(true), 0)
            }).catch(err => {
                console.error('AppProvider: Sync Error:', err)
                setLocalState(getState())
                setMounted(true)
            })
        }
    }, [mounted])

    const refresh = useCallback(() => {
        fetchAllData().then(data => {
            if (data && data.users.length > 0) {
                const nextData = {
                    ...data,
                    currentUserId: state.currentUserId,
                    dismissedAlerts: state.dismissedAlerts,
                    starredAlerts: state.starredAlerts
                }
                setLocalState(nextData)
                setState(nextData)
            }
        })
    }, [state.currentUserId, state.dismissedAlerts, state.starredAlerts])

    // Real-time subscriptions to keep data in sync across clients
    useEffect(() => {
        if (!mounted) return

        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log('Real-time update received:', payload)
                refresh()
            })
            .subscribe((status) => {
                console.log('Real-time subscription status:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [refresh, mounted])

    const saveState = useCallback((updater: (s: AppState) => AppState) => {
        // Run synchronously to ensure it completes before any router.push
        const currentState = getState()
        const nextState = updater(currentState)
        setState(nextState) // Save to localStorage IMMEDIATELY

        // Let React update the UI in its own time
        setLocalState(nextState)
    }, [])

    const login = useCallback((username: string, password: string) => {
        const lowerInput = username.toLowerCase().trim()
        const rawInputPassword = password.trim()

        const matchingUsers = state.users.filter(u =>
            u.username.toLowerCase() === lowerInput || u.id.toLowerCase() === lowerInput
        )

        if (matchingUsers.length === 0) {
            return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác' }
        }

        const user = matchingUsers.find(u => (u.password || '').trim() === rawInputPassword)

        if (!user) {
            return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác' }
        }

        if (user.isActive === false) {
            return { success: false, error: 'Tài khoản này đang bị tạm khóa. Vui lòng liên hệ Admin.' }
        }

        saveState(s => ({ ...s, currentUserId: user.id }))
        return { success: true }
    }, [state.users, saveState])

    const logout = useCallback(() => {
        saveState(s => ({ ...s, currentUserId: undefined }))
    }, [saveState])

    const updateProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
        if (!state.currentUserId) return false

        try {
            const updatePayload: any = {}
            if (data.displayName !== undefined) updatePayload.display_name = data.displayName
            if (data.password !== undefined) updatePayload.password = data.password
            if (data.email !== undefined) updatePayload.email = data.email
            if (data.avatarUrl !== undefined) updatePayload.avatar_url = data.avatarUrl

            console.log('updateProfile Payload:', updatePayload, 'UserID:', state.currentUserId)

            const { data: resData, error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', state.currentUserId)
                .select()

            if (error) {
                console.error('Supabase update error object:', JSON.stringify(error))
                throw error
            }

            console.log('Supabase update success, updated rows:', resData)

            saveState(s => ({
                ...s,
                users: s.users.map(u => u.id === state.currentUserId ? { ...u, ...data } : u)
            }))
            return true
        } catch (e: any) {
            console.error('Failed to update profile. Catch block received:', JSON.stringify(e, Object.getOwnPropertyNames(e)))
            return false
        }
    }, [state.currentUserId, saveState])

    const currentUser = state.users.find(u => u.id === state.currentUserId)

    const updateUserById = useCallback(async (userId: string, data: Partial<User>): Promise<boolean> => {
        try {
            const updatePayload: any = {}
            if (data.displayName !== undefined) updatePayload.display_name = data.displayName
            if (data.password !== undefined) updatePayload.password = data.password
            if (data.email !== undefined) updatePayload.email = data.email
            if (data.avatarUrl !== undefined) updatePayload.avatar_url = data.avatarUrl
            if (data.role !== undefined) updatePayload.role = data.role
            if (data.allowedPages !== undefined) updatePayload.allowed_pages = data.allowedPages
            if (data.permissions !== undefined) updatePayload.permissions = data.permissions
            if (data.branchId !== undefined) updatePayload.branch_id = data.branchId
            if (data.title !== undefined) updatePayload.title = data.title
            if (data.isActive !== undefined) updatePayload.is_active = data.isActive

            const { error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', userId)

            if (error) throw error

            saveState(s => ({
                ...s,
                users: s.users.map(u => u.id === userId ? { ...u, ...data } : u)
            }))
            return true
        } catch (e) {
            console.error('Failed to update user', e)
            return false
        }
    }, [saveState])

    const value: AppContextValue = {
        state, currentUser, mounted,
        login, logout, refresh, saveState,
        updateProfile, updateUserById
    }

    return React.createElement(AppContext.Provider, { value }, children)
}

export function useApp() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used within AppProvider')
    return ctx
}

// Permission helpers
export function hasPermission(user: User | undefined, perm: string) {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin fallback
    if (Array.isArray(user.permissions)) return user.permissions.includes(perm);

    // Legacy fallback for old roles until updated:
    if (user.role === 'director' || user.role === 'accountant') {
        const legacyPerms = ['plan_edit', 'transaction_edit_all', 'branch_view_all'];
        if (legacyPerms.includes(perm)) return true;
    }

    return false;
}

export function isPageAllowed(user: User | undefined, href: string) {
    if (!user) return false
    if (user.role === 'admin') return true

    const baseHref = href.split('?')[0]
    if (baseHref === '/dashboard' || baseHref === '/' || baseHref === '/profile') return true

    // If they have explicitly denied everything (empty array), but they are not admin,
    // we should still allow Dashboard (done above).

    // Check allowedPages if it has content
    if (Array.isArray(user.allowedPages) && user.allowedPages.length > 0) {
        return user.allowedPages.includes(baseHref)
    }

    // Default restricted logic for settings (even if allowedPages is empty/missing)
    if (baseHref.startsWith('/settings/')) {
        if (baseHref === '/settings/users') return canManageUsers(user)
        return user.role !== 'staff'
    }

    // Default for main nav items for users without explicit allowedPages (Legacy)
    const restrictedToAdmin = ['/activity']
    if (restrictedToAdmin.includes(baseHref)) {
        return ['admin', 'director', 'accountant'].includes(user.role)
    }

    // If allowedPages is an empty array, it means "restricted from everything except defaults"
    if (Array.isArray(user.allowedPages) && user.allowedPages.length === 0) {
        // Staff are restricted by default from planning and cashflow if list is empty
        const staffRestricted = ['/planning', '/cashflow']
        if (user.role === 'staff' && staffRestricted.includes(baseHref)) return false
    }

    return true
}

export function canEditPlan(user?: User) {
    return hasPermission(user, 'plan_edit')
}

export function canManageCategories(user?: User) {
    return hasPermission(user, 'category_manage')
}

export function canManageUsers(user?: User) {
    return hasPermission(user, 'user_manage')
}

export function canManageBranches(user?: User) {
    return hasPermission(user, 'branch_manage')
}

export function canManageAccounts(user?: User) {
    return hasPermission(user, 'account_manage')
}

export function canViewAllBranches(user?: User) {
    if (!user) return false;

    // Admin, Văn phòng (HQ), và Team Sale được xem toàn hệ thống
    const isGlobalDept = user.departmentType === 'admin' || user.departmentType === 'hq' || user.departmentType === 'sale';
    if (user.role === 'admin' || isGlobalDept) return true;

    if (!user.branchId) return true; // Fallback nếu user không bị gán chi nhánh cụ thể
    return hasPermission(user, 'branch_view_all')
}

export function canEditTransaction(user: User | undefined, tx: any) {
    if (!user) return false

    if (hasPermission(user, 'transaction_edit_all')) return true;

    // Staff can only edit if it's THEIR transaction AND it's not locked
    if (user.id === tx.createdBy && tx.status !== 'locked') return true

    return false
}

export function canLockTransaction(user?: User) {
    return hasPermission(user, 'transaction_lock')
}
