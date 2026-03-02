'use client'
import { useState } from 'react'
import { Award, Zap, Settings, Star } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { LoyaltySettingsTab } from './components/LoyaltySettingsTab'
import { MembershipTiersTab } from './components/MembershipTiersTab'
import { useApp, canManageMembership } from '@/lib/auth'

export default function MembershipSettingsPage() {
    const { currentUser } = useApp()
    const [activeTab, setActiveTab] = useState<'tiers' | 'loyalty'>('tiers')

    if (!canManageMembership(currentUser)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                    <Zap className="text-rose-500" size={40} />
                </div>
                <h1 className="text-2xl font-black text-text-main mb-2">Truy cập bị từ chối</h1>
                <p className="text-text-soft max-w-md">
                    Bạn không có quyền truy cập vào trang cấu hình Membership. Vui lòng liên hệ quản trị viên để được cấp quyền.
                </p>
            </div>
        )
    }

    const tabs = [
        { id: 'tiers', label: 'Hạng Thành Viên', icon: Award },
        { id: 'loyalty', label: 'Tích điểm & Quy đổi', icon: Zap },
    ] as const

    return (
        <div className="page-container">
            <PageHeader
                icon={Star}
                title="Cấu hình Membership"
                subtitle="Hạng thành viên & Hệ thống tích điểm"
                description="Hệ thống CRM • Thiết lập đặc quyền khách hàng"
            >
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-[15px] border border-gray-100 shadow-sm overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isActive
                                    ? 'bg-text-main text-white shadow-luxury'
                                    : 'text-text-soft opacity-40 hover:opacity-100'
                                    }`}
                            >
                                <Icon size={14} strokeWidth={2.5} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </PageHeader>

            <div className="content-wrapper">
                <div className="flex-1">
                    {activeTab === 'tiers' && <MembershipTiersTab />}
                    {activeTab === 'loyalty' && <LoyaltySettingsTab />}
                </div>
            </div>
        </div>
    )
}
