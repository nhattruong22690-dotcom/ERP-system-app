'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { User, PresenceState } from './types'

export function usePresence(currentUser: User | undefined) {
    const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceState>>({})
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
    const channelRef = useRef<any>(null)

    useEffect(() => {
        if (!currentUser) return

        // 1. Setup Presence Channel
        const channel = supabase.channel('presence-room', {
            config: {
                presence: {
                    key: currentUser.id,
                },
            },
        })

        channelRef.current = channel

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const formatted: Record<string, PresenceState> = {}
                Object.keys(state).forEach(key => {
                    formatted[key] = (state[key][0] as any)
                })
                setOnlineUsers(formatted)
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('join', key, newPresences)
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('leave', key, leftPresences)
            })
            // Typing indicators
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                setTypingUsers(prev => ({ ...prev, [payload.userId]: payload.typing }))
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        userId: currentUser.id,
                        onlineAt: new Date().toISOString(),
                    })

                    // Update DB status
                    await supabase.from('users').update({
                        is_online: true,
                        last_seen_at: new Date().toISOString()
                    }).eq('id', currentUser.id)
                }
            })

        // Handle disconnect/tab close
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // We don't necessarily set is_online false here because user might just switch tab
                // But Supabase Presence will handle the real "offline" after timeout
            }
        }

        window.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange)
            if (channel) {
                supabase.removeChannel(channel)
            }
            // Cố gắng cập nhật ngay lập tức khi unmount
            if (currentUser) {
                navigator.sendBeacon && navigator.sendBeacon(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${currentUser.id}`,
                    JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() })
                )
                // Fallback thông thường
                supabase.from('users')
                    .update({ is_online: false, last_seen_at: new Date().toISOString() })
                    .eq('id', currentUser.id)
                    .then()
            }
        }
    }, [currentUser?.id])

    const setTyping = useCallback((isTyping: boolean) => {
        if (channelRef.current && currentUser) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: currentUser.id, typing: isTyping },
            })
        }
    }, [currentUser])

    return { onlineUsers, typingUsers, setTyping }
}
