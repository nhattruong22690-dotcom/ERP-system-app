'use client'
import React from 'react'

interface PageHeaderProps {
    icon: React.ElementType
    title: string
    subtitle?: string
    description?: string
    actions?: React.ReactNode
    children?: React.ReactNode
}

export default function PageHeader({
    icon: Icon,
    title,
    subtitle,
    description,
    actions,
    children
}: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between px-6 py-8 md:px-10 md:py-12 gap-8 sticky top-0 bg-white/80 backdrop-blur-xl z-[40] border-b border-gold-light/20">
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gold-light/30 flex items-center justify-center text-gold-muted shadow-sm border border-gold-light/40">
                    <Icon size={32} strokeWidth={1.5} />
                </div>
                <div>
                    <h1 className="text-2xl md:text-[36px] font-serif font-bold text-text-main leading-tight md:leading-none uppercase tracking-tighter">
                        {title} {subtitle && <span className="font-normal text-gold-muted opacity-80 block md:inline">{subtitle}</span>}
                    </h1>
                    {description && (
                        <p className="text-[11px] font-black text-text-soft mt-3 uppercase tracking-[0.4em] opacity-40 whitespace-nowrap">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {actions}
                {children}
            </div>
        </div>
    )
}
