'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, X, AlertTriangle, Info } from 'lucide-react'

interface Notification {
    id: string
    content: string
    type: 'info' | 'warning' | 'event'
}

interface Props {
    userId: string | undefined
}

export default function NotificationBanner({ userId }: Props) {
    const [notification, setNotification] = useState<Notification | any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const bannerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!userId) return

        const fetchNotification = async () => {
            // 1. Get ALL active notifications
            const { data: activeNotifs, error: fetchError } = await supabase
                .from('global_notifications')
                .select('*')
                .eq('is_active', true)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .order('priority', { ascending: false })

            if (fetchError || !activeNotifs || activeNotifs.length === 0) return

            // 2. Get user status for these notifications
            const { data: userStatuses } = await supabase
                .from('user_notifications_status')
                .select('*')
                .eq('user_id', userId)

            const statusMap = new Map(userStatuses?.map(s => [s.notification_id, s]) || [])
            const now = new Date()

            // 3. Filter notifications based on multi-mode logic
            const eligible = activeNotifs.filter(n => {
                const status = statusMap.get(n.id)

                // If it's a "Once only" and ALREADY SEEN, skip
                // We assume "Once" is when show_on_login=true, show_on_day=false, show_interval=false
                const isOnceOnly = n.show_on_login && !n.show_on_day && !n.show_interval
                if (isOnceOnly && status?.is_seen) return false

                // Mode: Per Session (Login/Reload)
                if (n.show_on_login) {
                    const sessionKey = `notif_shown_${n.id}`
                    if (sessionStorage.getItem(sessionKey)) {
                        // Already shown this session, but maybe we need to check interval if that's also enabled
                        if (!n.show_interval) return false
                    } else {
                        // First time this session - eligible
                        return true
                    }
                }

                // Mode: Per Day
                if (n.show_on_day) {
                    if (status?.last_shown_at) {
                        const lastDate = new Date(status.last_shown_at).toDateString()
                        if (lastDate === now.toDateString()) {
                            // Shown today, but check interval if enabled
                            if (!n.show_interval) return false
                        } else {
                            // First time today
                            return true
                        }
                    } else {
                        // Never shown - eligible
                        return true
                    }
                }

                // Mode: Interval
                if (n.show_interval && n.interval_minutes) {
                    if (status?.last_shown_at) {
                        const lastTime = new Date(status.last_shown_at).getTime()
                        const diffMinutes = (now.getTime() - lastTime) / (1000 * 60)
                        if (diffMinutes >= n.interval_minutes) return true
                    } else {
                        // Never shown - eligible
                        return true
                    }
                }

                return false
            })

            if (eligible.length > 0) {
                const best = eligible[0] // Priority order by query
                setNotification(best)
                setTimeout(() => setIsVisible(true), 500)

                // Track in session if show_on_login is true
                if (best.show_on_login) {
                    sessionStorage.setItem(`notif_shown_${best.id}`, 'true')
                }
            }
        }

        fetchNotification()
        const interval = setInterval(fetchNotification, 30000) // Check every 30s for intervals
        return () => clearInterval(interval)
    }, [userId])

    useEffect(() => {
        if (isVisible && notification) {
            const timer = setTimeout(async () => {
                handleDismiss()
            }, 20000)
            return () => clearTimeout(timer)
        }
    }, [isVisible, notification])

    const handleDismiss = async () => {
        if (!notification || !userId) return

        setIsVisible(false)

        // Mark as seen & update timestamp
        try {
            await supabase.from('user_notifications_status').upsert({
                user_id: userId,
                notification_id: notification.id,
                is_seen: true,
                last_shown_at: new Date().toISOString(),
                // Incremental show_count would be nice but requires another query or status record
            }, { onConflict: 'user_id,notification_id' })
        } catch (err) {
            console.error('Error updating notification status:', err)
        }

        setTimeout(() => setNotification(null), 500)
    }

    if (!notification) return null

    return (
        <div
            ref={bannerRef}
            style={{
                position: 'fixed',
                top: isVisible ? '0' : '-60px',
                left: '0',
                right: '0',
                height: '36px',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                transition: 'top 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                background: notification.type === 'warning'
                    ? 'rgba(254, 242, 242, 0.9)'
                    : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderBottom: `1px solid ${notification.type === 'warning' ? '#fecaca' : '#e5e7eb'}`,
                color: notification.type === 'warning' ? '#991b1b' : '#374151',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
        >
            {/* Left Icon/Label */}
            <div style={{
                padding: '0 12px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                background: notification.type === 'warning' ? '#fee2e2' : '#f9fafb',
                borderRight: '1px solid rgba(0,0,0,0.05)',
                zIndex: 2,
                flexShrink: 0
            }}>
                {notification.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
                <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {notification.type === 'event' ? 'Sự kiện' : notification.type === 'warning' ? 'Cảnh báo' : 'Thông báo'}
                </span>
            </div>

            {/* Marquee Content */}
            <div style={{
                flex: 1,
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center'
            }}>
                {/* Gradient Masks */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0))', zIndex: 1 }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to left, rgba(255,255,255,1), rgba(255,255,255,0))', zIndex: 1 }} />

                <div className="marquee-text-flow" style={{
                    whiteSpace: 'nowrap',
                    fontSize: '13px',
                    fontWeight: 500,
                    paddingLeft: '20px'
                }}>
                    {notification.content}
                </div>
            </div>

            {/* Close Button */}
            <button
                onClick={handleDismiss}
                style={{
                    padding: '0 12px',
                    height: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    zIndex: 2
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
                onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
                <X size={14} />
            </button>

            <style jsx>{`
                .marquee-text-flow {
                    display: inline-block;
                    animation: banner-marquee 25s linear infinite;
                }
                @keyframes banner-marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    )
}
