'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { generateId } from '@/lib/utils/id'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    description?: string
    type: ToastType
}

interface ToastContextType {
    showToast: (message: string, description?: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const showToast = useCallback((message: string, description?: string, type: ToastType = 'success') => {
        const id = generateId()
        setToasts(prev => [...prev, { id, message, description, type }])

        // Play system beep sound natively
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.playBeep()
        }

        setTimeout(() => {
            removeToast(id)
        }, 5000)
    }, [removeToast])

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={24} color="#10b981" />
            case 'error': return <AlertCircle size={24} color="#ef4444" />
            case 'warning': return <AlertTriangle size={24} color="#f59e0b" />
            case 'info': return <Info size={24} color="#3b82f6" />
        }
    }

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return { background: 'rgba(236, 253, 245, 0.8)', border: '1px solid rgba(16, 185, 129, 0.2)' }
            case 'error': return { background: 'rgba(254, 242, 242, 0.8)', border: '1px solid rgba(239, 68, 68, 0.2)' }
            case 'warning': return { background: 'rgba(255, 251, 235, 0.8)', border: '1px solid rgba(245, 158, 11, 0.2)' }
            case 'info': return { background: 'rgba(239, 246, 255, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)' }
        }
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column-reverse', // Stack from bottom up
                gap: '12px',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
                        style={{
                            pointerEvents: 'all',
                            minWidth: '320px',
                            maxWidth: '420px',
                            padding: '16px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            animation: 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            ...getStyles(toast.type)
                        }}
                    >
                        <div style={{
                            background: 'white',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }} aria-hidden="true">
                            {getIcon(toast.type)}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                                {toast.message}
                            </div>
                            {toast.description && (
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                                    {toast.description}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '4px',
                                cursor: 'pointer',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px'
                            }}
                            aria-label={`Đóng thông báo: ${toast.message}`}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(40px) scale(0.9); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
            `}} />
        </ToastContext.Provider>
    )
}
