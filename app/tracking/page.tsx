'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TrackingClient from './TrackingClient'

function TrackingContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    if (!id) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-200">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] text-center max-w-md w-full shadow-2xl">
                    <h1 className="text-xl font-black mb-2 tracking-tight">Hệ thống Tracking</h1>
                    <p className="text-slate-400 mb-8 font-medium">Vui lòng cung cấp mã khách hàng để tiếp tục.</p>
                </div>
            </div>
        )
    }

    return <TrackingClient id={id} />
}

export default function TrackingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                </div>
            </div>
        }>
            <TrackingContent />
        </Suspense>
    )
}
