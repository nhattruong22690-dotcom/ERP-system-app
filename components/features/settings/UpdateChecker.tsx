'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, ArrowUpCircle, Info } from 'lucide-react'

export function UpdateChecker() {
    const [currentVersion, setCurrentVersion] = useState<string>('Bản web')
    const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'uptodate' | 'error' | 'downloading' | 'installing'>('idle')
    const [updateInfo, setUpdateInfo] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [detailedError, setDetailedError] = useState<any>(null)
    const [isElectron, setIsElectron] = useState(false)

    useEffect(() => {
        const checkElectron = async () => {
            // Kiểm tra xem có đang chạy trong môi trường Electron không
            if (typeof window !== 'undefined' && (window as any).electronAPI) {
                setIsElectron(true)
                try {
                    const version = await (window as any).electronAPI.getVersion()
                    setCurrentVersion(version)
                    
                    // Lắng nghe các event từ Electron
                    ;(window as any).electronAPI.onUpdateAvailable(() => {
                        setStatus('downloading')
                    })
                    
                    ;(window as any).electronAPI.onUpdateDownloaded(() => {
                        setStatus('available')
                        setUpdateInfo({ version: 'Mới Nhất' }) // Thông tin tuỳ chọn
                    })
                } catch (e) {
                    console.error('Failed to init Electron updates', e)
                }
            }
        }
        checkElectron()
    }, [])

    const handleCheckUpdate = async () => {
        if (!isElectron) {
            setError('Tính năng cập nhật chỉ khả dụng trên ứng dụng máy tính.')
            setStatus('error')
            return
        }

        setStatus('checking')
        setError(null)

        try {
            const hasUpdate = await (window as any).electronAPI.checkForUpdate()
            if (hasUpdate === false || hasUpdate === null) {
                setStatus('uptodate')
            }
            // Nếu có bản cập nhật, event "update-available" sẽ tự trigger -> 'downloading'
        } catch (e: any) {
            console.error('Update check failed', e)
            setError(e.message || 'Lỗi khi kiểm tra cập nhật.')
            setDetailedError(e)
            setStatus('error')
        }
    }

    const handleDownloadInstall = async () => {
        setStatus('installing')
        try {
            ;(window as any).electronAPI.installUpdate()
        } catch (e: any) {
            console.error('Update failed', e)
            setError(e.message || 'Lỗi cài đặt bản cập nhật.')
            setDetailedError(e)
            setStatus('error')
        }
    }

    return (
        <section className="luxury-card overflow-hidden relative border-t-4 border-t-[var(--color-gold-muted)]">
            {/* Background elements for rich aesthetics */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-blue-100 rounded-full blur-3xl opacity-30"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                        <ArrowUpCircle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800">Cập nhật ứng dụng</h2>
                        <p className="text-sm text-slate-500 font-medium italic">Phiên bản hiện tại: <span className="text-[var(--color-gold-muted)] font-bold">{currentVersion}</span></p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-100 mb-8 backdrop-blur-sm shadow-inner">
                    {status === 'idle' && (
                        <div className="flex flex-col items-center py-4 text-center">
                            <Info className="text-slate-400 mb-3" size={32} />
                            <p className="text-slate-600 max-w-sm">Kiểm tra xem bạn có đang sử dụng phiên bản mới nhất hay không.</p>
                        </div>
                    )}

                    {status === 'checking' && (
                        <div className="flex flex-col items-center py-6">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                                <RefreshCw className="text-amber-500 animate-pulse" size={24} />
                            </div>
                            <p className="mt-4 text-amber-700 font-bold animate-pulse">Đang kiểm tra máy chủ...</p>
                        </div>
                    )}

                    {status === 'uptodate' && (
                        <div className="flex flex-col items-center py-6 text-center animate-bounce-in">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-emerald-700">Ứng dụng đã được cập nhật</h3>
                            <p className="text-sm text-emerald-600/80 mt-1">Chúc mừng! Bạn đang sử dụng bản ERP mới nhất.</p>
                        </div>
                    )}

                    {status === 'available' && updateInfo && (
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start animate-slide-up">
                            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-sm border border-amber-200">
                                <RefreshCw size={32} className="animate-spin-slow" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-block px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold mb-2 uppercase tracking-widest shadow-sm">Có bản cập nhật mới!</div>
                                <h3 className="text-xl font-bold text-slate-800">Bản cập nhật đã sẵn sàng cài đặt</h3>
                                <div className="mt-3 p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 max-h-32 overflow-y-auto luxury-scrollbar shadow-sm">
                                    <p className="font-bold text-xs text-slate-400 mb-2 uppercase tracking-tighter">Hành động:</p>
                                    <div className="whitespace-pre-wrap">
                                        Vui lòng nhấn nút cài đặt bên dưới để khởi động lại ứng dụng.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'downloading' && (
                        <div className="flex flex-col items-center py-6">
                            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-4 shadow-inner">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 animate-[loading_2s_infinite]"></div>
                            </div>
                            <p className="text-amber-700 font-bold">Đang tải bản cập nhật... Vui lòng không tắt ứng dụng.</p>
                        </div>
                    )}

                    {status === 'installing' && (
                        <div className="flex flex-col items-center py-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4 animate-bounce">
                                <RefreshCw size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-amber-700">Đang cài đặt và khởi động lại...</h3>
                            <p className="text-sm text-amber-600/80 mt-1">Hệ thống sẽ tự động tải lại sau vài giây.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center py-6 text-center animate-shake">
                            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-rose-700">Lỗi kiểm tra cập nhật</h3>
                            <p className="text-sm text-rose-600 mt-2 p-3 bg-rose-50 rounded-xl border border-rose-100 max-w-sm shadow-sm">{error || 'Đã có lỗi không xác định xảy ra.'}</p>
                            
                            {detailedError && (
                                <div className="mt-4 w-full max-w-md">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(detailedError, null, 2));
                                            alert('Đã sao chép mã lỗi chi tiết vào bộ nhớ tạm.');
                                        }}
                                        className="text-xs text-rose-400 underline hover:text-rose-600 transition-colors"
                                    >
                                        Sao chép mã lỗi chi tiết
                                    </button>
                                    <pre className="mt-2 p-3 bg-slate-900 text-slate-300 text-[10px] text-left rounded-lg overflow-x-auto max-h-32 luxury-scrollbar">
                                        {typeof detailedError === 'string' ? detailedError : JSON.stringify(detailedError, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                    {(status === 'idle' || status === 'uptodate' || status === 'error') && (
                        <button
                            onClick={handleCheckUpdate}
                            className="group relative px-10 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:border-amber-400 hover:text-amber-600 hover:shadow-xl hover:shadow-amber-100 transition-all active:scale-95 flex items-center gap-3 overflow-hidden"
                        >
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span>Kiểm tra cập nhật</span>
                        </button>
                    )}

                    {status === 'available' && (
                        <>
                            <button
                                onClick={handleDownloadInstall}
                                className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-extrabold shadow-xl shadow-amber-500/30 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3 animate-pulse-subtle"
                            >
                                <ArrowUpCircle size={20} />
                                <span>Tải & Cài đặt ngay</span>
                            </button>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                Để sau
                            </button>
                        </>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounce-in {
                    0% { transform: scale(0.8); opacity: 0; }
                    70% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes loading {
                    0% { width: 0; transform: translateX(0); }
                    50% { width: 70%; }
                    100% { width: 100%; transform: translateX(0); }
                }
                @keyframes pulse-subtle {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
                .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .animate-shake { animation: shake 0.4s ease-in-out; }
                .animate-spin-slow { animation: spin 3s linear infinite; }
                .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </section>
    )
}
