import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/auth'
import { ModalProvider } from '@/components/ModalProvider'
import { ToastProvider } from '@/components/ToastProvider'
import { Inter, Playfair_Display } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Xinh Group ERP',
  description: 'Hệ thống quản lý Clinic – Spa – Aesthetic Medical System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preload" href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" as="style" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <AppProvider>
          <ToastProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  )
}
