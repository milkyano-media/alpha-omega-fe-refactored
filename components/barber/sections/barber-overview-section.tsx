"use client"

import React, { useEffect, useState } from "react"
import { API } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, DollarSign, TrendingUp } from "lucide-react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

interface Booking {
  id: number
  booking_reference: string
  start_at: string
  end_at: string
  status: string
  price_cents: number
  deposit_paid_cents: number
  user?: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_number: string
  }
  service_name: string
}

interface BarberOverviewSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function BarberOverviewSection({ activeSection }: BarberOverviewSectionProps) {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({
    todayCount: 0,
    weekCount: 0,
    weekEarnings: 0,
    upcomingCount: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeSection === "overview") {
      fetchOverviewData()
    }
  }, [activeSection])

  const fetchOverviewData = async () => {
    try {
      setLoading(true)

      // Fetch all bookings (barber role is automatically filtered by backend)
      const response = await API.get(`/bookings?page=1&limit=1000`)

      if (response.data && response.data.bookings) {
        const allBookings = response.data.bookings
        const now = dayjs().tz('Australia/Melbourne')
        const today = now.startOf('day')
        const tomorrow = today.add(1, 'day')
        const weekStart = now.startOf('week')
        const weekEnd = now.endOf('week')

        // Today's bookings
        const todaysBookings = allBookings.filter((booking: Booking) => {
          const bookingDate = dayjs(booking.start_at).tz('Australia/Melbourne')
          return bookingDate.isAfter(today) && bookingDate.isBefore(tomorrow)
        })

        // Week's bookings
        const weekBookings = allBookings.filter((booking: Booking) => {
          const bookingDate = dayjs(booking.start_at).tz('Australia/Melbourne')
          return bookingDate.isAfter(weekStart) && bookingDate.isBefore(weekEnd) && booking.status === 'COMPLETED'
        })

        // Upcoming bookings (future bookings with status confirmed or pending)
        const upcomingBookings = allBookings.filter((booking: Booking) => {
          const bookingDate = dayjs(booking.start_at).tz('Australia/Melbourne')
          return bookingDate.isAfter(now) && (booking.status === 'CONFIRMED' || booking.status === 'PENDING')
        })

        // Calculate week's earnings (completed bookings only)
        const weekEarnings = weekBookings.reduce((total: number, booking: Booking) => {
          return total + (booking.price_cents || 0)
        }, 0)

        setTodayBookings(todaysBookings.slice(0, 5)) // Show only next 5
        setStats({
          todayCount: todaysBookings.length,
          weekCount: weekBookings.length,
          weekEarnings: weekEarnings / 100, // Convert to dollars
          upcomingCount: upcomingBookings.length
        })
      }
    } catch (error) {
      console.error("Error fetching overview data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (activeSection !== "overview") {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayCount === 1 ? 'booking' : 'bookings'} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Week
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekCount}</div>
            <p className="text-xs text-muted-foreground">
              completed appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Week's Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.weekEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              from {stats.weekCount} completed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingCount}</div>
            <p className="text-xs text-muted-foreground">
              future appointments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading appointments...
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No appointments scheduled for today
            </div>
          ) : (
            <div className="space-y-4">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {booking.user
                        ? `${booking.user.first_name} ${booking.user.last_name}`
                        : 'Unknown Customer'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {booking.service_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {dayjs(booking.start_at).tz('Australia/Melbourne').format("h:mm A")}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                      booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
