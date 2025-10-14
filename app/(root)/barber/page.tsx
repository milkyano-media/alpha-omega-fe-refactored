"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { BarberSidebarNav } from "@/components/ui/barber-sidebar-nav"
import { BarberContent } from "@/components/barber/barber-content"
import { Toaster } from 'react-hot-toast'

export default function BarberDashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Wait for component to be mounted to avoid hydration issues
  if (!mounted) {
    return null
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    router.push("/login")
    return null
  }

  // Check if user is barber
  if (user?.role !== "barber") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminLayout
        title="Barber Dashboard"
        description="View your bookings, schedule, and performance metrics."
        NavigationComponent={BarberSidebarNav}
      >
        <BarberContent />
      </AdminLayout>
      <Toaster position="top-right" />
    </>
  )
}
