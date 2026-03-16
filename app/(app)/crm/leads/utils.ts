import { Lead } from '@/lib/types'

export const getEffectiveStatus = (lead: Lead): string => {
    if (['booked', 'pending', 'confirmed', 'failed', 'spam_data', 'low_quality_mess', 'no_reach_mess', 'in_care', 'recare', 'arrived', 'completed', 'no_show', 'cancelled'].includes(lead.status)) return lead.status
    const logsCount = (lead.careLogs || []).length
    if (logsCount >= 1) return 'contacted'
    const createdAt = new Date(lead.createdAt).getTime()
    const now = new Date().getTime()
    const diffHours = (now - createdAt) / (1000 * 60 * 60)
    return diffHours < 24 ? 'new_created' : 'new'
}

export const getRowColor = (status: string) => {
    switch (status) {
        case 'spam_data': return 'bg-rose-900/10 text-rose-900 border-rose-100 hover:bg-rose-900/15'
        case 'low_quality_mess': return 'bg-amber-900/10 text-amber-900 border-amber-100 hover:bg-amber-900/15'
        case 'no_reach_mess': return 'bg-yellow-500/10 text-yellow-800 border-yellow-200 hover:bg-yellow-500/20'
        case 'in_care': return 'bg-emerald-500/10 text-emerald-800 border-emerald-100 hover:bg-emerald-500/20'
        case 'recare': return 'bg-indigo-500/10 text-indigo-800 border-indigo-100 hover:bg-indigo-500/20'
        case 'pending': return 'bg-amber-50/50 text-amber-700 border-amber-100 hover:bg-amber-100/50'
        case 'confirmed': return 'bg-blue-50/50 text-blue-700 border-blue-100 hover:bg-blue-100/50'
        case 'booked': return 'bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50'
        case 'arrived': return 'bg-emerald-50 text-emerald-900 border-emerald-100 hover:bg-emerald-100'
        case 'completed': return 'bg-indigo-50 text-indigo-900 border-indigo-100 hover:bg-indigo-100'
        case 'no_show': return 'bg-gray-50 text-gray-500 border-gray-100 opacity-60'
        default: return 'hover:bg-gray-50 border-gray-50'
    }
}
