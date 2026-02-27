'use client'
import { useState, useMemo, useRef, useEffect } from 'react'

interface SearchableUserSelectProps {
    options: any[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export default function SearchableUserSelect({ options, value, onChange, placeholder = "Chọn nhân sự..." }: SearchableUserSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false) }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedOption = options.find((o: any) => o.id === value)

    const filteredOptions = useMemo(() => {
        if (!search) return options
        const s = search.toLowerCase()
        return options.filter((o: any) => o.name.toLowerCase().includes(s) || o.username.toLowerCase().includes(s) || (o.subtitle && o.subtitle.toLowerCase().includes(s)))
    }, [options, search])

    return (
        <div className="relative text-left" ref={ref}>
            <div
                className="form-input rounded-xl w-full text-sm font-bold flex flex-col justify-center cursor-pointer min-h-[42px] bg-white border border-gray-200"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedOption ? (
                    <div className="flex flex-col py-1 px-3">
                        <span className="text-gray-900 flex items-center gap-1.5">{selectedOption.name} <span className="text-gray-400 font-medium text-[11px] bg-gray-100 px-1.5 py-0.5 rounded-md">Mã: {selectedOption.username}</span></span>
                        <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider leading-none mt-1">{selectedOption.subtitle}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 font-medium px-3">{placeholder}</span>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 z-[200] overflow-hidden flex flex-col max-h-64">
                    <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                        <input
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg text-sm px-3 py-2 font-medium focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20"
                            placeholder="Tìm tên, mã NV, phòng ban..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto p-1.5 flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs font-bold text-gray-400 italic">Không tìm thấy nhân sự</div>
                        ) : (
                            filteredOptions.map((o: any) => (
                                <div
                                    key={o.id}
                                    className={`p-2 hover:bg-indigo-50/50 cursor-pointer rounded-xl transition-colors mb-1 last:mb-0 ${value === o.id ? 'bg-indigo-50 border border-indigo-100' : 'border border-transparent'}`}
                                    onClick={() => { onChange(o.id); setIsOpen(false); setSearch(''); }}
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">{o.name}</span>
                                            <span className="text-gray-400 font-bold text-xs bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md">{o.username}</span>
                                        </div>
                                        <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider mt-1">{o.subtitle}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
