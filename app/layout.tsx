import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/auth'
import { ModalProvider } from '@/components/ModalProvider'
import { ToastProvider } from '@/components/ToastProvider'

export const metadata: Metadata = {
  title: 'Xinh Group ERP',
  description: 'Hệ thống quản lý Clinic – Spa – Aesthetic Medical System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
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
