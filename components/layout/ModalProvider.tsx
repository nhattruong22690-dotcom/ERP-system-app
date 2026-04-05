'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { AlertCircle, Info, CheckCircle2, HelpCircle, X } from 'lucide-react'

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

    const handleClose = useCallback((value: boolean) => {
        if (modal) {
            modal.resolve(value)
            setModal(null)
        }
    }, [modal])

    // Handle Scroll Lock
    React.useEffect(() => {
        if (modal) {
            document.body.classList.add('lock-scroll')
        } else {
            document.body.classList.remove('lock-scroll')
        }
        return () => {
            document.body.classList.remove('lock-scroll')
        }
    }, [modal])

    // Handle Escape key
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && modal) {
                if (modal.type === 'alert') handleClose(true)
                else handleClose(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [modal, handleClose])

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {modal && (
                <div
                    className="fixed inset-0 z-[9999] flex justify-center items-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
                    onClick={() => modal.type === 'alert' ? handleClose(true) : handleClose(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div
                        className="w-full max-w-[400px] bg-white rounded-[2rem] p-8 shadow-2xl border border-gray-100 focus:outline-none"
                        style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                        onClick={(e) => e.stopPropagation()}
                        tabIndex={-1}
                    >
                        <div className="flex flex-col items-center text-center gap-5">
                            {modal.type === 'confirm' ? (
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                                    <HelpCircle size={32} aria-hidden="true" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                                    <Info size={32} aria-hidden="true" />
                                </div>
                            )}

                            <div>
                                <h3 id="modal-title" className="text-lg font-black text-gray-900 uppercase tracking-wide">
                                    {modal.title}
                                </h3>
                                <p className="mt-2 text-sm text-gray-500 font-bold leading-relaxed">
                                    {modal.message}
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-2">
                                {modal.type === 'confirm' && (
                                    <button
                                        className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 focus:outline-offset-2"
                                        onClick={() => handleClose(false)}
                                    >
                                        Hủy
                                    </button>
                                )}
                                <button
                                    className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-lg focus:outline-offset-2 ${modal.type === 'confirm'
                                        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                                        : 'bg-neutral-900 text-white hover:bg-neutral-700 shadow-gray-200'
                                        }`}
                                    onClick={() => handleClose(true)}
                                    autoFocus
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
