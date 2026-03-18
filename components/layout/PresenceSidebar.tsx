'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { User, Message } from '@/lib/types'
import { useApp } from '@/lib/auth'
import { supabase } from '@/lib/supabase/supabase'
import { usePresence } from '@/lib/hooks/presence-hook'
import {
    Users,
    Search,
    MessageCircle,
    MoreVertical,
    Circle,
    Clock,
    User as UserIcon,
    X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface PresenceSidebarProps {
    onOpenChat: (user: User) => void
    isOpen?: boolean
    onToggle?: (val: boolean) => void
}

export default function PresenceSidebar({ onOpenChat, isOpen: propIsOpen, onToggle }: PresenceSidebarProps) {
    const { state, currentUser } = useApp()
    const { onlineUsers } = usePresence(currentUser)
    const [searchTerm, setSearchTerm] = useState('')
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    const FETCH_LIMIT = 50

    // Fetch users with pagination
    const fetchUsers = async (p: number, search: string = '') => {
        try {
            let query = supabase
                .from('users')
                .select('*')
                .order('is_online', { ascending: false })
                .order('last_seen_at', { ascending: false })
                .range(p * FETCH_LIMIT, (p + 1) * FETCH_LIMIT - 1)

            if (search) {
                query = query.ilike('display_name', `%${search}%`)
            }

            const { data, error } = await query

            if (error) throw error

            if (data) {
                const mappedData: User[] = data.map((u: any) => ({
                    id: u.id,
                    username: u.username,
                    displayName: u.display_name,
                    avatarUrl: u.avatar_url,
                    role: u.role,
                    isOnline: u.is_online,
                    lastSeenAt: u.last_seen_at,
                    createdAt: u.created_at
                } as User))

                if (p === 0) {
                    setUsers(mappedData)
                } else {
                    setUsers(prev => [...prev, ...mappedData])
                }
                setHasMore(data.length === FETCH_LIMIT)
            }
        } catch (err: any) {
            console.error('Error fetching users Detail:', err.message || err)
            // Fallback message if err is empty object
            if (Object.keys(err).length === 0) {
                console.error('Error fetching users: Likely missing is_online or last_seen_at columns. Please run chat_setup.sql.')
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setPage(0)
        fetchUsers(0, searchTerm)
    }, [searchTerm])

    const handleScroll = () => {
        if (!scrollRef.current || loading || !hasMore) return
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            setLoading(true)
            const nextP = page + 1
            setPage(nextP)
            fetchUsers(nextP, searchTerm)
        }
    }

    // Merge real-time online status from hook with DB status
    const sortedUsers = useMemo(() => {
        return users.map(u => ({
            ...u,
            // CHỈ hiện online nếu Realtime Presence xác nhận (tránh lỗi kẹt trạng thái trong DB)
            isOnline: !!onlineUsers[u.id]
        })).sort((a, b) => {
            if (a.isOnline === b.isOnline) {
                return new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime()
            }
            return a.isOnline ? -1 : 1
        })
    }, [users, onlineUsers])

    const onlineCount = useMemo(() => Object.keys(onlineUsers).length, [onlineUsers])
    const offlineCount = useMemo(() => Math.max(0, (state.users?.length || 0) - onlineCount), [state.users, onlineCount])

    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
    const [internalIsOpen, setInternalIsOpen] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [hasDragged, setHasDragged] = useState(false)

    // Refs for real-time tracking during drag
    const dragStartRef = useRef({ x: 0, y: 0 })
    const lastPosRef = useRef({ x: 0, y: 0 })

    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen
    const setIsOpen = (val: boolean) => {
        if (onToggle) onToggle(val)
        else setInternalIsOpen(val)
    }

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true)
        setHasDragged(false)
        dragStartRef.current = {
            x: e.clientX - lastPosRef.current.x,
            y: e.clientY - lastPosRef.current.y
        }
    }

    useEffect(() => {
        if (!isDragging) return

        const handlePointerMove = (e: PointerEvent) => {
            const newX = e.clientX - dragStartRef.current.x
            const newY = e.clientY - dragStartRef.current.y

            if (Math.abs(newX - lastPosRef.current.x) > 2 || Math.abs(newY - lastPosRef.current.y) > 2) {
                setHasDragged(true)
            }

            lastPosRef.current = { x: newX, y: newY }
            setPosition({ x: newX, y: newY })
        }

        const handlePointerUp = () => {
            setIsDragging(false)
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        window.addEventListener('pointercancel', handlePointerUp)

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
            window.removeEventListener('pointercancel', handlePointerUp)
        }
    }, [isDragging])

    const handleButtonClick = (e: React.MouseEvent) => {
        if (hasDragged) {
            e.preventDefault()
            e.stopPropagation()
            return
        }
        setIsOpen(true)
    }

    // On mobile, default to closed
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsOpen(false)
        }
    }, [])

    const getRoleGlowClass = (role: string) => {
        const r = role?.toLowerCase()
        if (r === 'admin') return 'glow-admin'
        if (r === 'director') return 'glow-director'
        if (r === 'manager') return 'glow-manager'
        return ''
    }

    const playNotificationSound = () => {
        // High quality luxury alert sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')
        audio.volume = 0.4
        audio.play().catch(e => console.log('Notification sound blocked by browser:', e))
    }

    const playBuzzSound = () => {
        // Classic Yahoo style BUZZ sound
        const audio = new Audio('https://www.soundboard.com/handler/DownLoadTrack.ashx?cliptitle=Yahoo+Buzz&filename=nt/NTg5Mjg1MDk1ODkyODM0_k_2bp66tAnA7A.mp3')
        audio.volume = 0.6
        audio.play().catch(e => console.log('Buzz sound blocked:', e))
    }

    const triggerBuzzUI = () => {
        document.body.classList.add('animate-buzz')
        setTimeout(() => {
            document.body.classList.remove('animate-buzz')
        }, 1000)
    }

    // Fetch unread counts & Listen for Realtime Events
    useEffect(() => {
        if (!currentUser) return

        const fetchUnread = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', currentUser.id)
                .eq('is_read', false)

            if (!error && data) {
                const counts: Record<string, number> = {}
                data.forEach((m: any) => {
                    counts[m.sender_id] = (counts[m.sender_id] || 0) + 1
                })
                setUnreadCounts(counts)
            }
        }

        fetchUnread()

        // 1. Listen for new messages
        const messageChannel = supabase
            .channel(`unread_messages_${currentUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`
            }, (payload) => {
                const newMessage = payload.new as any
                setUnreadCounts(prev => ({
                    ...prev,
                    [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1
                }))
                // Only play sound if it's NOT a buzz (buzz has its own sound)
                if (newMessage.message !== '!!!BUZZ!!!') {
                    playNotificationSound()
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`
            }, (payload) => {
                const updatedMessage = payload.new as any
                if (updatedMessage.is_read) {
                    setUnreadCounts(prev => {
                        const next = { ...prev }
                        if (next[updatedMessage.sender_id] > 0) {
                            next[updatedMessage.sender_id] -= 1
                        } else {
                            delete next[updatedMessage.sender_id]
                        }
                        return next
                    })
                }
            })
            .subscribe()

        // 2. Listen for BUZZ broadcast
        const buzzChannel = supabase
            .channel('chat_broadcasts')
            .on('broadcast', { event: 'buzz' }, ({ payload }) => {
                if (payload.receiverId === currentUser.id) {
                    playBuzzSound()
                    triggerBuzzUI()
                }
            })
            .subscribe()

        // 3. Listen for user profile updates (online status, avatar, etc.)
        const userUpdatesChannel = supabase
            .channel('user_updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users'
            }, (payload) => {
                const updatedUser = payload.new as any
                setUsers(prev => prev.map(u => u.id === updatedUser.id ? {
                    ...u,
                    displayName: updatedUser.display_name,
                    avatarUrl: updatedUser.avatar_url,
                    role: updatedUser.role,
                    isOnline: updatedUser.is_online,
                    lastSeenAt: updatedUser.last_seen_at
                } : u))
            })
            .subscribe()

        return () => {
            supabase.removeChannel(messageChannel)
            supabase.removeChannel(buzzChannel)
            supabase.removeChannel(userUpdatesChannel)
        }
    }, [currentUser?.id])

    const handleOpenChatInternal = (user: User) => {
        onOpenChat(user)
        setUnreadCounts(prev => {
            const next = { ...prev }
            delete next[user.id]
            return next
        })
        // Mark as read in DB
        supabase.from('messages')
            .update({ is_read: true })
            .eq('sender_id', user.id)
            .eq('receiver_id', currentUser?.id)
            .eq('is_read', false)
            .then()
    }

    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

    return (
        <>
            {/* Messenger Floating Icon for Mobile/Collapsed */}
            {!isOpen && (
                <div
                    onPointerDown={handlePointerDown}
                    onClick={handleButtonClick}
                    className={`fixed right-6 bottom-24 w-15 h-15 z-[2200] lg:bottom-6 cursor-pointer select-none group ${isDragging ? '' : 'transition-transform duration-300'}`}
                    style={{
                        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                        touchAction: 'none'
                    }}
                >
                    {/* Inner wrapper for CSS Animations (Wiggle/Glow) so it doesn't conflict with inline transform */}
                    <div className="w-full h-full bg-gold-muted text-white rounded-full shadow-luxury flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-all animate-pulse-glow animate-wiggle">
                        <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
                        {totalUnread > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[24px] h-[24px] bg-text-main text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white animate-bounce-slow shadow-lg">
                                {totalUnread}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Backdrop for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[2050] lg:hidden animate-fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`fixed right-0 bottom-0 w-[340px] h-[50vh] bg-white border-l border-gold-light/10 shadow-2xl flex flex-col z-[2100] transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="p-6 border-b border-gold-light/10 bg-beige-soft/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                                <Users size={16} className="text-gold-muted" aria-hidden="true" />
                                Danh sách
                            </h3>
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-500/10 uppercase">
                                {onlineCount} Trực tuyến
                            </span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-3 -m-3 hover:bg-beige-soft rounded-full text-text-main transition-colors focus:outline-offset-2 lg:p-1.5 lg:m-0"
                            aria-label="Đóng sidebar"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-soft/40" size={14} aria-hidden="true" />
                        <label htmlFor="user-search" className="sr-only">Tìm kiếm</label>
                        <input
                            id="user-search"
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-full bg-white border border-gold-light/20 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-gold-muted/5 transition-all placeholder:text-text-soft/20"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* User List */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto luxury-scrollbar p-2 space-y-1"
                >
                    {sortedUsers.map(user => {
                        if (user.id === currentUser?.id) return null
                        const unread = unreadCounts[user.id] || 0

                        return (
                            <button
                                key={user.id}
                                onClick={() => handleOpenChatInternal(user)}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-beige-soft/50 transition-all group relative"
                            >
                                <div className="relative shrink-0">
                                    <div className={`w-10 h-10 rounded-xl overflow-hidden bg-beige-soft border border-gold-light/10 flex items-center justify-center transition-transform group-hover:scale-105 ${user.isOnline ? 'ring-2 ring-emerald-500/20' : ''} ${getRoleGlowClass(user.role)}`}>
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} className="text-gold-muted/30" />
                                        )}
                                    </div>
                                    {user.isOnline ? (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
                                    ) : (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-200 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                </div>

                                <div className="flex-1 text-left min-w-0">
                                    <div className="text-[13px] font-black text-text-main truncate tracking-tight">{user.displayName}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] font-bold text-text-soft/40 uppercase tracking-widest">{user.role}</span>
                                        <span className="text-[10px] text-text-soft/10">•</span>
                                        <span className="text-[8px] font-medium text-text-soft/40 truncate italic">
                                            {user.isOnline ? 'Trực tuyến' : user.lastSeenAt ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true, locale: vi }) : 'Ngoại tuyến'}
                                        </span>
                                    </div>
                                </div>

                                {unread > 0 ? (
                                    <div className="min-w-[18px] h-[18px] bg-gold-muted text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm animate-bounce-slow">
                                        {unread}
                                    </div>
                                ) : (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MessageCircle size={14} className="text-gold-muted/40" />
                                    </div>
                                )}
                            </button>
                        )
                    })}

                    {loading && (
                        <div className="p-4 text-center">
                            <div className="w-5 h-5 border-2 border-gold-muted/30 border-t-gold-muted rounded-full animate-spin mx-auto"></div>
                        </div>
                    )}

                    {!loading && users.length === 0 && (
                        <div className="p-10 text-center opacity-20">
                            <Users size={40} className="mx-auto mb-2 text-gold-muted" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Không tìm thấy thành viên</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-beige-soft/10 border-t border-gold-light/5 text-center">
                    <p className="text-[9px] font-bold text-text-soft/20 uppercase tracking-[0.2em]">
                        GIAO TIẾP NỘI BỘ
                    </p>
                </div>
            </aside>
        </>
    )
}
