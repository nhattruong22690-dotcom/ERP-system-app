'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect } from 'react'
import { useApp } from '@/lib/auth'
import {
    syncCustomer,
    saveCustomer,
    updateState
} from '@/lib/storage'
import CustomerList from '@/components/crm/CustomerList'
import CustomerProfileModal from '@/components/crm/CustomerProfileModal'
import CustomerFormModal from '@/components/crm/CustomerFormModal'
import { ActivityLog, Customer, CustomerRank, User, Branch, MembershipTier, Appointment } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { Users } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

export default function CustomersPage() {
    const { state, currentUser, saveState } = useApp()
    const [viewingCustomer, setViewingCustomer] = React.useState<Customer | null>(null)
    const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
    const [isFormOpen, setIsFormOpen] = React.useState(false)
    const [isOnline, setIsOnline] = React.useState(true)
    const [lastSync, setLastSync] = React.useState<string>("Đang kiểm tra...")

    const checkStatus = async () => {
        setIsOnline(window.navigator.onLine);
        try {
            const { data, error } = await supabase
                .from('crm_stats_cache')
                .select('updated_at')
                .eq('id', 'all')
                .single();

            if (data?.updated_at) {
                const diff = Math.floor((new Date().getTime() - new Date(data.updated_at).getTime()) / 1000 / 60);
                if (diff < 1) setLastSync("Vừa xong");
                else if (diff < 60) setLastSync(`${diff} phút trước`);
                else setLastSync(`${Math.floor(diff / 60)} giờ trước`);
            }
        } catch (e) {
            console.error('Status Check Error:', e);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveCustomer = async (customerData: Partial<Customer>) => {
        if (editingCustomer) {
            const updated: Customer = { ...editingCustomer, ...customerData } as Customer;
            // 1. Update State
            saveState(saveCustomer(updated))
            // 2. Sync to Supabase
            await syncCustomer(updated)

            // Re-open official profile view with updated data
            setViewingCustomer(updated);
        } else {
            const now = new Date().toISOString();
            const newCustomer: Customer = {
                ...customerData,
                id: crypto.randomUUID(),
                rank: CustomerRank.MEMBER,
                points: 0,
                totalSpent: 0,
                lastVisit: 'Chưa có',
                branchId: customerData.branchId || currentUser?.branchId,
                createdAt: now,
                updatedAt: now
            } as Customer;
            // 1. Update State
            saveState(saveCustomer(newCustomer))
            // 2. Sync to Supabase
            await syncCustomer(newCustomer)

            // 3. Log activity
            const activity: ActivityLog = {
                id: crypto.randomUUID(),
                type: 'customer_created',
                user: currentUser?.displayName || 'Hệ thống',
                details: `Đã thêm khách hàng mới: ${newCustomer.fullName}`,
                createdAt: new Date().toISOString()
            }
            saveState(s => ({ ...s, activityLogs: [activity, ...s.activityLogs] }))
        }
        setIsFormOpen(false);
        setEditingCustomer(null);
    }

    const handleDeleteCustomer = async (id: string) => {
        // 1. Update Local State
        saveState(s => ({
            ...s,
            customers: s.customers.filter(c => c.id !== id)
        }))

        // 2. Delete from Supabase
        const { error } = await supabase.from('crm_customers').delete().eq('id', id)
        if (error) console.error('Error deleting customer:', error)
    }

    const statValueClass = "text-[12px] font-black";
    const statusSuccessClass = `${statValueClass} text-emerald-600`;

    if (!currentUser) return null;

    return (
        <div className="page-container bg-[#FAF8F6] min-h-screen flex flex-col">
            <PageHeader
                icon={Users}
                title="Quản lý Khách hàng"
                subtitle="CRM System"
                description="Hệ thống quản lý dữ liệu & Chăm sóc khách hàng"
                actions={
                    <div className="flex items-center gap-4">
                        <div className="flex bg-white px-6 py-3 rounded-2xl border border-gold-light/20 shadow-sm gap-6">
                            <div className="text-center">
                                <p className="text-[10px] text-text-soft font-black uppercase tracking-tight opacity-40">Trạng thái</p>
                                <p className={isOnline ? statusSuccessClass : statValueClass + " text-rose-500"}>
                                    {isOnline ? "Online" : "Offline"}
                                </p>
                            </div>
                            <div className="w-[1px] h-6 bg-gold-light/30 self-center"></div>
                            <div className="text-center">
                                <p className="text-[10px] text-text-soft font-black uppercase tracking-tight opacity-40">Dữ liệu</p>
                                <p className={statValueClass + " text-text-main"}>{lastSync}</p>
                            </div>
                        </div>
                    </div>
                }
            />

            <div className="flex-1 w-full max-w-[1700px] mx-auto">
                <CustomerList
                    currentUser={currentUser}
                    onNavigate={(tab: string) => {
                        console.log('Navigate to:', tab)
                    }}
                    branches={state.branches}
                    customers={state.customers}
                    appointments={state.appointments}
                    onDeleteCustomer={handleDeleteCustomer}
                    onViewCustomer={(c: Customer) => setViewingCustomer(c)}
                    onOpenForm={(c?: Customer) => {
                        setEditingCustomer(c || null);
                        setIsFormOpen(true);
                    }}
                    customerStats={state.customerStats}
                />
            </div>

            {viewingCustomer && (
                <CustomerProfileModal
                    customer={viewingCustomer}
                    onClose={() => setViewingCustomer(null)}
                    onNavigate={(tab: string) => {
                        console.log('Navigate to:', tab)
                    }}
                    onEdit={() => {
                        setEditingCustomer(viewingCustomer);
                        setIsFormOpen(true);
                        setViewingCustomer(null);
                    }}
                    currentUser={currentUser}
                    branches={state.branches}
                    appointments={state.appointments}
                />
            )}

            <CustomerFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingCustomer(null);
                }}
                customer={editingCustomer}
                onSave={handleSaveCustomer}
                onNavigate={(tab: string) => console.log('Navigate:', tab)}
                branches={state.branches}
            />
        </div>
    )
}
