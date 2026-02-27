'use client'

import React, { useState, useCallback } from 'react'
import { User } from '@/lib/types'
import { useApp } from '@/lib/auth'
import ChatWindow from './ChatWindow'
import { usePresence } from '@/lib/presence-hook'

export default function FloatingChatManager({
    openChats,
    onCloseChat,
    chatSidebarOpen
}: {
    openChats: User[],
    onCloseChat: (userId: string) => void,
    chatSidebarOpen?: boolean
}) {
    const { currentUser } = useApp()
    const { typingUsers, setTyping } = usePresence(currentUser)

    return (
        <div
            className={`fixed bottom-0 transition-all duration-500 ease-in-out flex flex-row-reverse gap-4 z-[120] pointer-events-none pr-4`}
            style={{ right: chatSidebarOpen ? '340px' : '20px' }}
        >
            {openChats.map(user => (
                <div key={user.id} className="pointer-events-auto">
                    <ChatWindow
                        targetUser={user}
                        onClose={() => onCloseChat(user.id)}
                        typing={!!typingUsers[user.id]}
                        onTyping={(isTyping) => setTyping(isTyping)}
                    />
                </div>
            ))}
        </div>
    )
}
