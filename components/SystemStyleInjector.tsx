'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/auth'

const FONT_MAP: Record<string, string> = {
    'Inter': 'var(--font-inter), sans-serif',
    'Be Vietnam Pro': 'var(--font-be-vietnam), sans-serif',
    'Roboto': "'Roboto', sans-serif",
}

// Default light theme values (phải khớp với :root trong globals.css)
const LIGHT_THEME = {
    '--bg': '#FAF8F8',
    '--text-main': '#111827',
    '--text-soft': '#6B7280',
    '--border': '#E5E7EB',
    '--card-bg': '#ffffff',
    '--sidebar-bg': '#111827',
    '--sidebar-text': '#F3F4F6',
    '--shadow-luxury': '0 10px 40px rgba(197, 160, 89, 0.12)',
    '--shadow-soft': '0 2px 10px rgba(0, 0, 0, 0.05)',
}

const DARK_THEME = {
    '--bg': '#0f172a',
    '--text-main': '#f1f5f9',
    '--text-soft': '#94a3b8',
    '--border': 'rgba(255,255,255,0.1)',
    '--card-bg': '#1e293b',
    '--sidebar-bg': '#020617',
    '--sidebar-text': '#e2e8f0',
    '--shadow-luxury': '0 10px 40px rgba(0, 0, 0, 0.4)',
    '--shadow-soft': '0 2px 10px rgba(0, 0, 0, 0.3)',
}

const LUXURY_GOLD_THEME = {
    '--bg': '#FFFDF8',
    '--text-main': '#1a1207',
    '--text-soft': '#78716c',
    '--border': 'rgba(197, 160, 89, 0.2)',
    '--card-bg': '#fffef9',
    '--sidebar-bg': '#1c1410',
    '--sidebar-text': '#fef3c7',
    '--shadow-luxury': '0 10px 40px rgba(197, 160, 89, 0.25)',
    '--shadow-soft': '0 2px 10px rgba(197, 160, 89, 0.08)',
}

const THEMES: Record<string, Record<string, string>> = {
    light: LIGHT_THEME,
    dark: DARK_THEME,
    'luxury-gold': LUXURY_GOLD_THEME,
}

export function SystemStyleInjector() {
    const { state } = useApp()
    const config = state.systemConfig

    useEffect(() => {
        if (!config) return

        const root = document.documentElement

        // ===== 1. FONT FAMILY =====
        const fontValue = FONT_MAP[config.fontFamily] || FONT_MAP['Inter']
        root.style.setProperty('--font-sans-override', fontValue)
        // Override cả Tailwind theme variables để font-serif và font-sans class đều đổi theo
        root.style.setProperty('--font-serif', fontValue)
        root.style.setProperty('--font-sans', fontValue)

        // ===== 2. FONT SIZE SCALE =====
        const scale = (config.fontSizeScale || 100) / 100
        root.style.setProperty('--font-scale', scale.toString())

        // ===== 3. THEME =====
        const themeVars = THEMES[config.theme] || THEMES['light']
        root.setAttribute('data-theme', config.theme || 'light')

        // Áp dụng tất cả CSS variables của theme
        Object.entries(themeVars).forEach(([key, value]) => {
            root.style.setProperty(key, value)
        })

    }, [config])

    return null
}
