'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/auth'

export default function HomePage() {
  const { currentUser, mounted } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!mounted) return
    if (currentUser) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [currentUser, mounted, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )
}
