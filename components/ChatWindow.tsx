'use client'

import React, { useState, useEffect, useRef } from 'react'
import { User, Message } from '@/lib/types'
import { useApp } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
    X,
    Send,
    User as UserIcon,
    Loader2,
    ArrowUp,
    Minus,
    CheckCircle,
    Zap
} from 'lucide-react'
import { format } from 'date-fns'

interface ChatWindowProps {
    targetUser: User
    onClose: () => void
    typing: boolean
    onTyping: (isTyping: boolean) => void
}

export default function ChatWindow({ targetUser, onClose, typing, onTyping }: ChatWindowProps) {
    const { currentUser } = useApp()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [isMinimized, setIsMinimized] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
    const pendingMarkAsRead = useRef<Set<string>>(new Set())
    const markAsReadTimer = useRef<NodeJS.Timeout | null>(null)

    const getRoleGlowClass = (role: string) => {
        const r = role?.toLowerCase()
        if (r === 'admin') return 'glow-admin'
        if (r === 'director') return 'glow-director'
        if (r === 'manager') return 'glow-manager'
        return ''
    }

    const unreadCount = messages.filter(m => m.receiverId === currentUser?.id && !m.isRead).length

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior
            })
        }
    }

    const scrollToFirstUnread = () => {
        const firstUnread = messages.find(m => m.receiverId === currentUser?.id && !m.isRead)
        if (firstUnread) {
            const el = document.getElementById(`msg-${firstUnread.id}`)
            if (el) {
                el.scrollIntoView({ behavior: 'auto', block: 'start' })
                return
            }
        }
        scrollToBottom('auto')
    }


    const triggerBuzzUI = () => {
        document.body.classList.add('animate-buzz')
        setTimeout(() => {
            document.body.classList.remove('animate-buzz')
        }, 1000)
    }

    const handleBuzz = async () => {
        if (!currentUser) return

        // 1. Send broadcast for immediate shake
        supabase.channel('chat_broadcasts').send({
            type: 'broadcast',
            event: 'buzz',
            payload: { senderId: currentUser.id, receiverId: targetUser.id }
        })

        // 2. Insert special message in DB so it's recorded
        await supabase.from('messages').insert({
            sender_id: currentUser.id,
            receiver_id: targetUser.id,
            message: '!!!BUZZ!!!'
        })
    }

    const processMarkAsReadBatch = async () => {
        if (!currentUser || pendingMarkAsRead.current.size === 0) return

        const ids = Array.from(pendingMarkAsRead.current)
        pendingMarkAsRead.current.clear()

        const { error } = await supabase.from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .in('id', ids)
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false)

        if (error) {
            console.error('Batch markAsRead error:', error)
        }
    }

    const markAsRead = (messageId: string) => {
        if (!currentUser || pendingMarkAsRead.current.has(messageId)) return

        // 1. Optimistic update (Immediate UI feedback)
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m))

        // 2. Add to batch queue
        pendingMarkAsRead.current.add(messageId)

        // 3. Debounce the DB update (Wait for user to stop scrolling)
        if (markAsReadTimer.current) clearTimeout(markAsReadTimer.current)
        markAsReadTimer.current = setTimeout(() => {
            processMarkAsReadBatch()
        }, 1000)
    }

    // "Seen on Scroll" logic using IntersectionObserver
    useEffect(() => {
        if (!currentUser || isMinimized || loading) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const msgId = entry.target.getAttribute('data-message-id')
                    const isUnread = entry.target.getAttribute('data-unread') === 'true'
                    if (entry.isIntersecting && isUnread && msgId) {
                        markAsRead(msgId)
                    }
                })
            },
            {
                root: scrollRef.current,
                threshold: 0.5
            }
        )

        const container = scrollRef.current
        if (container) {
            const unreadElements = container.querySelectorAll('[data-unread="true"]')
            unreadElements.forEach(el => observer.observe(el))
        }

        return () => observer.disconnect()
    }, [messages, isMinimized, loading, currentUser?.id, targetUser.id])

    const hasInitialScrolled = useRef(false)

    // Dedicated Auto-scroll Effect
    useEffect(() => {
        if (!scrollRef.current || loading || isMinimized) return

        const timer = setTimeout(() => {
            if (!scrollRef.current) return
            const container = scrollRef.current
            const { scrollTop, scrollHeight, clientHeight } = container

            const isNearBottom = scrollHeight - scrollTop - clientHeight < 400
            const lastMessage = messages[messages.length - 1]
            const isFromMe = lastMessage?.senderId === currentUser?.id

            if (isNearBottom || isFromMe) {
                scrollToBottom()
            }
        }, 100) // Small delay to allow DOM/images to render

        return () => clearTimeout(timer)
    }, [messages.length, loading, isMinimized])


    // Fetch history and set up real-time
    useEffect(() => {
        if (!currentUser) return

        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq."${currentUser.id}",receiver_id.eq."${targetUser.id}"),and(sender_id.eq."${targetUser.id}",receiver_id.eq."${currentUser.id}")`)
                .order('created_at', { ascending: false })
                .limit(100)

            if (data) {
                // Reverse to show in chronological order (oldest at top, newest at bottom)
                const mapped: Message[] = data.reverse().map((m: any) => ({
                    id: m.id,
                    senderId: m.sender_id,
                    receiverId: m.receiver_id,
                    message: m.message,
                    isRead: m.is_read,
                    readAt: m.read_at,
                    createdAt: m.created_at
                }))
                setMessages(mapped)
                setLoading(false)

                // For initial load, we might want to go to unread or bottom
                // But let the auto-scroll Effect handle it if it's near bottom
                if (!hasInitialScrolled.current) {
                    const firstUnread = mapped.find(m => m.receiverId === currentUser.id && !m.isRead)
                    if (firstUnread) {
                        setTimeout(() => scrollToFirstUnread(), 100)
                    } else {
                        setTimeout(() => scrollToBottom('auto'), 100)
                    }
                    hasInitialScrolled.current = true
                }
            }
        }

        fetchHistory()

        const channel = supabase
            .channel(`chat_messages_${targetUser.id}`)
            // 1. Listen for new messages incoming to ME
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`
            }, (payload) => {
                const newMessage = payload.new as any
                if (newMessage.sender_id === targetUser.id) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMessage.id)) return prev
                        const updated = [...prev, {
                            id: newMessage.id,
                            senderId: newMessage.sender_id,
                            receiverId: newMessage.receiver_id,
                            message: newMessage.message,
                            isRead: newMessage.is_read,
                            readAt: newMessage.read_at,
                            createdAt: newMessage.created_at
                        }]
                        return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    })
                }
            })
            // 2. Listen for new messages I SENT
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${currentUser.id}`
            }, (payload) => {
                const newMessage = payload.new as any
                if (newMessage.receiver_id === targetUser.id) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMessage.id)) return prev
                        const updated = [...prev, {
                            id: newMessage.id,
                            senderId: newMessage.sender_id,
                            receiverId: newMessage.receiver_id,
                            message: newMessage.message,
                            isRead: newMessage.is_read,
                            readAt: newMessage.read_at,
                            createdAt: newMessage.created_at
                        }]
                        return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    })
                }
            })
            // 3. Listen for status updates on messages I SENT (to see "Seen")
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${currentUser.id}`
            }, (payload) => {
                const updated = payload.new as any
                if (updated.receiver_id === targetUser.id) {
                    setMessages(prev => prev.map(m => m.id === updated.id ? {
                        ...m,
                        isRead: updated.is_read,
                        readAt: updated.read_at
                    } : m))
                }
            })
            // 4. Listen for status updates on messages SENT TO ME (cross-device sync)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`
            }, (payload) => {
                const updated = payload.new as any
                if (updated.sender_id === targetUser.id) {
                    setMessages(prev => prev.map(m => m.id === updated.id ? {
                        ...m,
                        isRead: updated.is_read,
                        readAt: updated.read_at
                    } : m))
                }
            })
            .subscribe()

        return () => {
            if (markAsReadTimer.current) clearTimeout(markAsReadTimer.current)
            supabase.removeChannel(channel)
        }
    }, [currentUser?.id, targetUser.id])

    const handleSend = async () => {
        if (!input.trim() || !currentUser) return
        const text = input.trim()
        setInput('')
        onTyping(false)
        await supabase.from('messages').insert({
            sender_id: currentUser.id,
            receiver_id: targetUser.id,
            message: text
        })
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
        onTyping(true)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className={`w-[340px] ${isMinimized ? 'h-[48px]' : 'h-[450px]'} bg-white rounded-t-2xl shadow-2xl border border-gold-light/20 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
            <div
                className="p-3 bg-text-main text-white flex items-center justify-between cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`relative w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-white/10 ${getRoleGlowClass(targetUser.role)}`}>
                            {targetUser.avatarUrl ? (
                                <img src={targetUser.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={16} className="text-white/40" />
                            )}
                        </div>
                        {targetUser.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-text-main" />
                        )}
                        {isMinimized && unreadCount > 0 && (
                            <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-lg animate-wiggle">
                                {unreadCount}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-[12px] font-black tracking-tight leading-none">{targetUser.displayName}</div>
                        {!isMinimized && (
                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">
                                {targetUser.isOnline ? 'Online' : 'Offline'}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {!isMinimized && (
                        <button onClick={(e) => { e.stopPropagation(); handleBuzz() }} className="p-1.5 hover:bg-white/10 rounded-lg text-amber-400">
                            <Zap size={14} className="fill-amber-400" />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} className="p-1.5 hover:bg-white/10 rounded-lg">
                        {isMinimized ? <ArrowUp size={14} /> : <Minus size={14} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onClose() }} className="p-1.5 hover:bg-white/10 rounded-lg">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="flex-1 relative flex flex-col overflow-hidden">
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-beige-soft/10 luxury-scrollbar"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 size={18} className="animate-spin text-gold-muted/20" />
                            </div>
                        ) : (
                            <>
                                {messages.map((m, i) => {
                                    const isMe = m.senderId === currentUser?.id
                                    const isBuzz = m.message === '!!!BUZZ!!!'
                                    const showAvatar = i === 0 || messages[i - 1].senderId !== m.senderId

                                    if (isBuzz) {
                                        return (
                                            <div key={m.id || i} className="flex justify-center py-2">
                                                <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1 rounded-full text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] animate-pulse">
                                                    ⚡ {isMe ? 'Bạn đã BUZZ' : `${targetUser.displayName.split(' ')[0]} đã BUZZ bạn`} ⚡
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div
                                            key={m.id || i}
                                            id={m.id ? `msg-${m.id}` : undefined}
                                            data-message-id={m.id}
                                            data-unread={!m.isRead && m.receiverId === currentUser?.id}
                                            data-sender-id={m.senderId}
                                            className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}
                                        >
                                            <div className="w-6 h-6 shrink-0 mb-5 relative">
                                                {showAvatar && (
                                                    <div className="w-6 h-6 rounded-md bg-white border border-gold-light/10 overflow-hidden">
                                                        {(isMe ? currentUser?.avatarUrl : targetUser.avatarUrl) ? (
                                                            <img src={isMe ? currentUser?.avatarUrl : targetUser.avatarUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <UserIcon size={12} className="text-gold-muted/30 m-auto mt-1.5 block" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1`}>
                                                <div
                                                    onClick={() => isMe && setActiveMessageId(activeMessageId === m.id ? null : m.id)}
                                                    className={`px-3 py-2 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm transition-all active:scale-[0.98] select-none ${isMe
                                                        ? 'bg-text-main text-white rounded-br-none cursor-pointer hover:bg-gold-muted'
                                                        : 'bg-white text-text-main border border-gold-light/10 rounded-bl-none'
                                                        }`}
                                                >
                                                    {m.message}
                                                </div>

                                                {isMe && activeMessageId === m.id && (
                                                    <div className="text-[7px] font-black text-gold-muted uppercase tracking-widest italic animate-fade-in-up px-1 bg-beige-soft/10 rounded py-0.5 mt-0.5">
                                                        {m.isRead ? (
                                                            <span className="flex items-center gap-1">
                                                                <CheckCircle size={7} className="text-emerald-500" />
                                                                Đã xem {m.readAt ? format(new Date(m.readAt), 'HH:mm dd/MM') : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-text-soft/40 italic">
                                                                <div className="w-1.5 h-1.5 rounded-full border border-gold-muted/20" />
                                                                Đã gửi
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5 px-1">
                                                    <span className="text-[7px] font-bold text-text-soft/20 uppercase tracking-tighter">{format(new Date(m.createdAt), 'HH:mm')}</span>
                                                    {isMe && m.isRead && activeMessageId !== m.id && (
                                                        <CheckCircle size={8} className="text-emerald-500/30 group-hover:text-emerald-500 transition-colors" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {typing && (
                                    <div className="flex justify-start gap-2 items-end">
                                        <div className="w-6 h-6 shrink-0 mb-4" />
                                        <div className="bg-white/80 px-4 py-2 rounded-2xl border border-gold-light/5 text-[9px] italic text-text-soft/40 flex items-center gap-2">
                                            <span className="flex gap-0.5">
                                                <span className="w-1 h-1 bg-gold-muted/30 rounded-full animate-bounce" />
                                                <span className="w-1 h-1 bg-gold-muted/30 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                <span className="w-1 h-1 bg-gold-muted/30 rounded-full animate-bounce [animation-delay:0.4s]" />
                                            </span>
                                            {targetUser.displayName.split(' ')[0]} typing...
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="p-3 bg-white border-t border-gold-light/10 flex items-end gap-2">
                        <textarea
                            rows={1}
                            className="flex-1 bg-beige-soft/20 rounded-xl border border-gold-light/10 text-[11px] px-3 py-2 resize-none"
                            placeholder="Type message..."
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                        />
                        <button onClick={handleSend} disabled={!input.trim()} className="w-8 h-8 bg-text-main text-white rounded-lg flex items-center justify-center">
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
