'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { AlertCircle, Info, CheckCircle2, HelpCircle } from 'lucide-react'

type ModalType = 'alert' | 'confirm'

interface ModalOptions {
    title?: string
    message: string
    type: ModalType
    resolve: (value: boolean) => void
}

interface ModalContextType {
    showAlert: (message: string, title?: string) => Promise<void>
    showConfirm: (message: string, title?: string) => Promise<boolean>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function useModal() {
    const context = useContext(ModalContext)
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider')
    }
    return context
}

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<ModalOptions | null>(null)

    const showAlert = useCallback((message: string, title: string = 'Thông báo') => {
        return new Promise<void>((resolve) => {
            setModal({
                title,
                message,
                type: 'alert',
                resolve: () => resolve()
            })
        })
    }, [])

    const showConfirm = useCallback((message: string, title: string = 'Xác nhận') => {
        return new Promise<boolean>((resolve) => {
            setModal({
                title,
                message,
                type: 'confirm',
                resolve
            })
        })
    }, [])

    const handleClose = (value: boolean) => {
        if (modal) {
            modal.resolve(value)
            setModal(null)
        }
    }

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {modal && (
                <div
                    className="fixed inset-0 z-[2000] flex justify-center items-start p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
                    onClick={() => modal.type === 'alert' ? handleClose(true) : handleClose(false)}
                >
                    <div
                        className="modal"
                        style={{
                            maxWidth: '400px',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                            animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
                            {modal.type === 'confirm' ? (
                                <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '50%', color: '#dc2626' }}>
                                    <HelpCircle size={32} />
                                </div>
                            ) : (
                                <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '50%', color: '#2563eb' }}>
                                    <Info size={32} />
                                </div>
                            )}

                            <div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                                    {modal.title}
                                </h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    {modal.message}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                                {modal.type === 'confirm' && (
                                    <button
                                        className="btn btn-ghost"
                                        style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}
                                        onClick={() => handleClose(false)}
                                    >
                                        Hủy
                                    </button>
                                )}
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        fontWeight: 600,
                                        background: modal.type === 'confirm' ? '#dc2626' : undefined,
                                        borderColor: modal.type === 'confirm' ? '#dc2626' : undefined
                                    }}
                                    onClick={() => handleClose(true)}
                                >
                                    {modal.type === 'confirm' ? 'Xác nhận' : 'Đồng ý'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}} />
        </ModalContext.Provider>
    )
}
