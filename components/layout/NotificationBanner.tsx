'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/supabase'
import { Bell, X, AlertTriangle, Info, Timer } from 'lucide-react'

interface Notification {
    id: string
    content: string
    type: 'info' | 'warning' | 'event'
    bg_color?: string
    text_color?: string
    highlight_color?: string
    metadata?: any
    trigger_at?: string | null
    show_interval?: boolean
    interval_minutes?: number
    last_triggered_at?: string | null
}

interface Props {
    userId: string | undefined
}

export default function NotificationBanner({ userId }: Props) {
    const [notification, setNotification] = useState<Notification | any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [countdown, setCountdown] = useState<string | null>(null)
    const bannerRef = useRef<HTMLDivElement>(null)
    const heartbeatRef = useRef<any>(null)

    const renderContent = (notif: Notification) => {
        // 0. If triggered_at is in the future, show countdown only
        if (notif.trigger_at && new Date(notif.trigger_at) > new Date()) {
            return (
                <span className="flex items-center gap-2">
                    <Timer size={16} className="animate-pulse" />
                    Sắp có tin mới trong: <span className="font-black text-rose-500">{countdown || '--:--'}</span>
                </span>
            )
        }

        let text = notif.content || ''
        const metadata = notif.metadata || {}

        // 1. Replace placeholders {key}
        Object.keys(metadata).forEach(key => {
            const value = metadata[key]
            text = text.replace(new RegExp(`{${key}}`, 'g'), String(value))
        })

        // 2. Parse brackets [text] for highlighting
        const parts = text.split(/(\[[^\]]+\])/g)
        return parts.map((part, i) => {
            if (part.startsWith('[') && part.endsWith(']')) {
                const content = part.slice(1, -1)
                return (
                    <span 
                        key={i} 
                        style={{ 
                            color: notif.highlight_color || '#d97706',
                            fontWeight: 800,
                            margin: '0 4px',
                            textDecoration: 'underline',
                            textDecorationColor: `${notif.highlight_color || '#d97706'}33`
                        }}
                    >
                        {content}
                    </span>
                )
            }
            return <span key={i}>{part}</span>
        })
    }

    useEffect(() => {
        if (!userId) return

        const fetchNotification = async () => {
            // Avoid re-fetching if banner is already visible (except if it's a countdown)
            if (isVisible && (!notification?.trigger_at || new Date(notification.trigger_at) <= new Date())) return

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

                // Mode: Interval (SYNCED GLOBAL TRIGGER)
                if (n.show_interval && n.last_triggered_at) {
                    const lastTrigger = new Date(n.last_triggered_at).getTime()
                    const intervalMs = (n.interval_minutes || 60) * 60000
                    const nextTrigger = lastTrigger + intervalMs
                    const nowMs = now.getTime()

                    // If it's time for a NEW trigger, and this client is the first to notice
                    if (nowMs > nextTrigger) {
                        // Heartbeat: Trigger the global update for everyone
                        supabase.from('global_notifications').update({
                            last_triggered_at: new Date().toISOString()
                        }).eq('id', n.id).then(() => {
                             // This will cause and fetch for all clients
                        })
                    }

                    const lastShownLocal = status?.last_shown_at ? new Date(status.last_shown_at).getTime() : 0
                    if (lastTrigger > lastShownLocal) {
                        return true
                    }
                }

                if (n.trigger_at) {
                   const triggerTime = new Date(n.trigger_at).getTime()
                   const lastShownLocal = status?.last_shown_at ? new Date(status.last_shown_at).getTime() : 0
                   if (triggerTime > lastShownLocal) return true
                }

                // If it's a "Once only" and ALREADY SEEN, skip
                const isOnceOnly = n.show_on_login && !n.show_on_day && !n.show_interval
                if (isOnceOnly && status?.is_seen) return false

                // Mode: Per Session (Login/Reload)
                if (n.show_on_login) {
                    const sessionKey = `notif_shown_${n.id}`
                    if (!sessionStorage.getItem(sessionKey)) {
                        return true
                    }
                }

                // Mode: Per Day
                if (n.show_on_day) {
                    if (status?.last_shown_at) {
                        const lastDate = new Date(status.last_shown_at).toDateString()
                        if (lastDate !== now.toDateString()) {
                            return true
                        }
                    } else {
                        return true
                    }
                }

                return false
            })

            if (eligible.length > 0) {
                const best = eligible[0]
                setNotification(best)
                setTimeout(() => setIsVisible(true), 500)

                if (best.show_on_login) {
                    sessionStorage.setItem(`notif_shown_${best.id}`, 'true')
                }

                // Optimistically update last_shown_at so we don't trigger again immediately
                await supabase.from('user_notifications_status').upsert({
                    user_id: userId,
                    notification_id: best.id,
                    is_seen: true,
                    last_shown_at: new Date().toISOString()
                }, { onConflict: 'user_id,notification_id' })
            }
        }

        fetchNotification()

        // GLOBAL HEARTBEAT: Check every 30s if any interval notif needs triggering
        heartbeatRef.current = setInterval(() => {
            fetchNotification()
        }, 30000)

        // REALTIME SUBSCRIPTION
        const channel = supabase
            .channel('global_notifications_changes')
            .on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table: 'global_notifications' },
                () => {
                    fetchNotification()
                }
            )
            .subscribe()

        // Also keep a slow poll as backup for time-based triggers
        const interval = setInterval(fetchNotification, 60000)

        return () => {
            supabase.removeChannel(channel)
            if (heartbeatRef.current) clearInterval(heartbeatRef.current)
            clearInterval(interval)
        }
    }, [userId, isVisible, notification?.id])

    // COUNTDOWN TIMER EFFECT
    useEffect(() => {
        if (!notification?.trigger_at) {
            setCountdown(null)
            return
        }

        const timer = setInterval(() => {
            const now = new Date().getTime()
            const target = new Date(notification.trigger_at!).getTime()
            const diff = target - now

            if (diff <= 0) {
                setCountdown(null)
                clearInterval(timer)
                // Force a re-render to reveal content
                setNotification({ ...notification, trigger_at: null })
            } else {
                const mins = Math.floor(diff / 60000)
                const secs = Math.floor((diff % 60000) / 1000)
                setCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [notification?.trigger_at, notification?.id])

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

    // Determine derived colors
    const bgColor = notification.bg_color || (notification.type === 'warning' ? 'rgba(254, 242, 242, 0.95)' : 'rgba(255, 255, 255, 0.95)')
    const textColor = notification.text_color || (notification.type === 'warning' ? '#991b1b' : '#374151')
    const borderColor = notification.type === 'warning' ? '#fecaca' : '#e5e7eb'

    return (
        <div
            ref={bannerRef}
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                top: isVisible ? '0' : '-80px',
                left: '0',
                right: '0',
                height: '72px',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                transition: 'top 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                background: bgColor,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: `2px solid ${borderColor}`,
                color: textColor,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
            }}
        >
            {/* Left Icon/Label */}
            <div style={{
                padding: '0 24px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                background: notification.type === 'warning' ? 'rgba(254, 226, 226, 0.5)' : 'rgba(0,0,0,0.03)',
                borderRight: '1px solid rgba(0,0,0,0.05)',
                zIndex: 2,
                flexShrink: 0
            }} aria-hidden="true">
                {notification.type === 'warning' ? <AlertTriangle size={24} /> : <Info size={24} />}
                <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', color: 'inherit' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
                        {notification.type === 'event' ? 'Event' : notification.type === 'warning' ? 'Alert' : 'Notice'}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6 }}>
                        SYSTEM
                    </span>
                </div>
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
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', background: `linear-gradient(to right, ${bgColor}, transparent)`, zIndex: 1 }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40px', background: `linear-gradient(to left, ${bgColor}, transparent)`, zIndex: 1 }} />

                <div className="marquee-text-flow" style={{
                    whiteSpace: 'nowrap',
                    fontSize: '24px',
                    fontWeight: 700,
                    paddingLeft: '40px',
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    {renderContent(notification)}
                </div>
            </div>

            {/* Close Button */}
            <button
                onClick={handleDismiss}
                style={{
                    padding: '0 24px',
                    height: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: textColor,
                    opacity: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    zIndex: 2
                }}
                aria-label="Đóng thông báo hệ thống"
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}
            >
                <X size={24} />
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
