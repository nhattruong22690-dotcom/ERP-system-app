import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/auth'
import { ModalProvider } from '@/components/layout/ModalProvider'
import { ToastProvider } from '@/components/layout/ToastProvider'
import { Inter, Playfair_Display, Be_Vietnam_Pro } from 'next/font/google'
import { SystemStyleInjector } from '@/components/layout/SystemStyleInjector'

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

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-be-vietnam',
})

export const metadata: Metadata = {
  title: 'Xinh Group ERP | Hệ Thống Quản Lý Spa & Thẩm Mỹ Viện Premium',
  description: 'Hệ thống quản lý Clinic – Spa – Aesthetic Medical System chuyên nghiệp, đẳng cấp. Tối ưu hóa vận hành, quản lý khách hàng và tài chính.',
  keywords: ['ERP', 'Spa Management', 'Clinic Management', 'Aesthetic Medical System', 'Xinh Group'],
  authors: [{ name: 'Xinh Group' }],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Xinh Group ERP | Hệ Thống Quản Lý Spa & Thẩm Mỹ Viện Premium',
    description: 'Hệ thống quản lý Clinic – Spa – Aesthetic Medical System chuyên nghiệp, đẳng cấp.',
    url: 'https://erp.xinhgroup.vn',
    siteName: 'Xinh Group ERP',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xinh Group ERP',
    description: 'Hệ thống quản lý Clinic – Spa – Aesthetic Medical System',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable} ${beVietnam.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preload" href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" as="style" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-[var(--color-gold-muted)] focus:rounded-lg focus:shadow-lg focus:border focus:border-[var(--color-gold-muted)]"
        >
          Chuyển đến nội dung chính
        </a>
        <AppProvider>
          <ToastProvider>
            <ModalProvider>
              <SystemStyleInjector />
              <div id="main-content">
                {children}
              </div>
            </ModalProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  )
}
