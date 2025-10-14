"use client"

import React, { useEffect, useState } from "react"
import { API } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Calendar, DollarSign, XCircle, CheckCircle } from "lucide-react"

interface BarberPerformanceSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function BarberPerformanceSection({ activeSection }: BarberPerformanceSectionProps) {
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    noShowBookings: 0,
    totalEarnings: 0,
    completionRate: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeSection === "performance") {
      fetchPerformanceData()
    }
  }, [activeSection])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      const response = await API.get(`/bookings?page=1&limit=1000`)

      if (response.data && response.data.bookings) {
        const bookings = response.data.bookings
        const completed = bookings.filter((b: any) => b.status === 'COMPLETED')
        const cancelled = bookings.filter((b: any) => b.status === 'CANCELLED')
        const noShow = bookings.filter((b: any) => b.status === 'NO_SHOW')

        const totalEarnings = completed.reduce((sum: number, b: any) => sum + (b.price_cents || 0), 0)

        setStats({
          totalBookings: bookings.length,
          completedBookings: completed.length,
          cancelledBookings: cancelled.length,
          noShowBookings: noShow.length,
          totalEarnings: totalEarnings / 100,
          completionRate: bookings.length > 0 ? (completed.length / bookings.length) * 100 : 0
        })
      }
    } catch (error) {
      console.error("Error fetching performance data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (activeSection !== "performance") {
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading performance data...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Bookings</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
              </div>

              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <div className="text-2xl font-bold text-green-700">{stats.completedBookings}</div>
              </div>

              <div className="p-4 border rounded-lg bg-red-50">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Cancelled</span>
                </div>
                <div className="text-2xl font-bold text-red-700">{stats.cancelledBookings}</div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">No Shows</span>
                </div>
                <div className="text-2xl font-bold text-gray-700">{stats.noShowBookings}</div>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Earnings</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">${stats.totalEarnings.toFixed(2)}</div>
              </div>

              <div className="p-4 border rounded-lg bg-purple-50">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Completion Rate</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{stats.completionRate.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
