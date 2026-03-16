'use client'
import { useState } from 'react'
import { Percent, Target, Award, Settings } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { CommissionSettingsTab } from './components/CommissionSettingsTab'
import { MissionSettingsTab } from './components/MissionSettingsTab'
import { MyPerformanceTab } from './components/MyPerformanceTab'

export default function SaleSettingsPage() {
    const [activeTab, setActiveTab] = useState<'commission' | 'mission' | 'performance'>('commission')

    const tabs = [
        { id: 'commission', label: 'Cấu hình Hoa hồng', icon: Percent },
        { id: 'mission', label: 'Giao Nhiệm vụ', icon: Target },
        { id: 'performance', label: 'Hiệu suất Cá nhân', icon: Award },
    ] as const

    return (
        <div className="page-container">
            <PageHeader
                icon={Settings}
                title="Cấu hình Sales"
                subtitle="Hoa hồng, Nhiệm vụ & Hiệu suất"
                description="Hệ thống CRM • Quản trị các tham số bán hàng"
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
                    {activeTab === 'commission' && <CommissionSettingsTab />}
                    {activeTab === 'mission' && <MissionSettingsTab />}
                    {activeTab === 'performance' && <MyPerformanceTab />}
                </div>
            </div>
        </div>
    )
}
