'use client'

import React from 'react'
import { User } from '@/lib/types'
import Link from 'next/link'

interface UserAvatarProps {
    user?: User
    userId?: string
    userName?: string
    avatarUrl?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    linkToProfile?: boolean
    showName?: boolean
}

export default function UserAvatar({
    user,
    userId,
    userName,
    avatarUrl,
    size = 'md',
    className = '',
    linkToProfile = false,
    showName = false
}: UserAvatarProps) {
    const resolvedName = user?.displayName || userName || '?'
    const resolvedAvatar = user?.avatarUrl || avatarUrl
    const resolvedId = user?.id || userId

    const sizeMemo = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-xl'
    }

    const avatarContent = (
        <div
            className={`rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-400 shrink-0 overflow-hidden border border-indigo-100/50 ${sizeMemo[size]} ${className}`}
        >
            {resolvedAvatar ? (
                <img src={resolvedAvatar} alt={resolvedName} className="w-full h-full object-cover" />
            ) : (
                <span>{resolvedName[0]?.toUpperCase() || '?'}</span>
            )}
        </div>
    )

    const content = (
        <div className="flex items-center gap-2">
            {avatarContent}
            {showName && (
                <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                    {resolvedName}
                </span>
            )}
        </div>
    )

    if (linkToProfile && resolvedId) {
        return (
            <Link href={`/settings/users?id=${resolvedId}`} className="hover:opacity-80 transition-opacity">
                {content}
            </Link>
        )
    }

    return content
}
