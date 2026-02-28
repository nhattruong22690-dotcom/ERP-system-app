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
        <div
            className="flex flex-col md:flex-row md:items-end justify-between px-4 pt-2 pb-3 md:px-10 md:pt-12 md:pb-12 gap-2 md:gap-8 sticky bg-white md:bg-white/80 md:backdrop-blur-xl z-[950] border-b border-gold-light/20"
            style={{ top: 'var(--header-offset, 0px)' }}
        >
            <div className="flex items-center gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gold-light/30 flex items-center justify-center text-gold-muted shadow-sm border border-gold-light/40 shrink-0">
                    <Icon size={24} strokeWidth={1.5} className="md:hidden" />
                    <Icon size={32} strokeWidth={1.5} className="hidden md:block" />
                </div>
                <div>
                    <h1 className="text-lg md:text-[36px] font-serif font-bold text-text-main leading-tight md:leading-none uppercase tracking-tighter">
                        {title} {subtitle && <span className="font-normal text-gold-muted opacity-80 block md:inline text-base md:text-[36px]">{subtitle}</span>}
                    </h1>
                    {description && (
                        <p className="text-[9px] md:text-[11px] font-black text-text-soft mt-1 md:mt-3 uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40 whitespace-nowrap">
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

