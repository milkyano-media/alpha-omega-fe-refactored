"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminContent } from "@/components/admin/admin-content"
import { Toaster } from 'react-hot-toast'

export default function AdminDashboardPage() {
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

  // Check if user is admin
  if (user?.role !== "admin") {
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
      <AdminLayout>
        <AdminContent />
      </AdminLayout>
      <Toaster position="top-right" />
    </>
  )
}