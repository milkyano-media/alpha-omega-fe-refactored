"use client"

import React, { useEffect, useState } from "react"
import { API } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  X,
  User,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Check,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import toast from "react-hot-toast"

dayjs.extend(utc)
dayjs.extend(timezone)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Types
interface Booking {
  id: number
  booking_reference: string
  user_id: number
  team_member_id: number
  service_name: string
  start_at: string
  end_at: string
  duration_minutes: number
  price_cents: number
  deposit_paid_cents: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'FAILED'
  customer_note?: string
  booking_source: 'website' | 'admin' | 'phone' | 'walk_in'
  payment_status: 'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded' | 'failed'
  booking_data: {
    appointmentSegments?: Array<{
      service_id: number
      service_name: string
      team_member_id: number
      team_member_name: string
      start_time: string
      end_time: string
      duration_minutes: number
      price_cents: number
    }>
  }
  user?: {
    id: number
    name: string
    email: string
    phone_number: string
  }
  team_member?: {
    id: number
    name: string
  }
}

interface BookingsByDate {
  [date: string]: Booking[]
}

interface BarberBookingsSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function BarberBookingsSection({ activeSection }: BarberBookingsSectionProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({})
  const [loading, setLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<string>("upcoming") // "all", "upcoming", "past"
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Fetch bookings for the current month
  const fetchBookings = async () => {
    try {
      setLoading(true)

      // Backend automatically filters by team_member_id for barber role
      const response = await API.get(`/bookings?page=1&limit=1000`)

      console.log('🔍 Barber API Response:', response.data)

      if (response.data && response.data.bookings) {
        const allBookings = response.data.bookings
        console.log('📦 Barber bookings:', allBookings)
        console.log('📦 Bookings count:', allBookings.length)

        // Filter bookings for current month on client side
        const startDate = currentMonth.startOf("month")
        const endDate = currentMonth.endOf("month")

        let filteredBookings = Array.isArray(allBookings) ? allBookings : []

        // Filter by date range
        filteredBookings = filteredBookings.filter((booking: Booking) => {
          const bookingDate = dayjs(booking.start_at).tz('Australia/Melbourne')
          return bookingDate.isAfter(startDate.subtract(1, 'day')) &&
                 bookingDate.isBefore(endDate.add(1, 'day'))
        })

        // Filter by status
        if (statusFilter !== "all") {
          filteredBookings = filteredBookings.filter((booking: Booking) =>
            booking.status === statusFilter
          )
        }

        // Filter by time (upcoming/past)
        if (timeFilter !== "all") {
          const now = dayjs();
          filteredBookings = filteredBookings.filter((booking: Booking) => {
            const bookingStart = dayjs(booking.start_at).tz('Australia/Melbourne');
            if (timeFilter === "upcoming") {
              return bookingStart.isAfter(now);
            } else if (timeFilter === "past") {
              return bookingStart.isBefore(now);
            }
            return true;
          });
        }

        const monthBookings = filteredBookings

        console.log('✅ Filtered bookings:', monthBookings.length)
        setBookings(monthBookings)

        // Group bookings by date
        const grouped: BookingsByDate = {}
        monthBookings.forEach((booking: Booking) => {
          const date = dayjs(booking.start_at).tz('Australia/Melbourne').format("YYYY-MM-DD")
          if (!grouped[date]) {
            grouped[date] = []
          }
          grouped[date].push(booking)
        })
        setBookingsByDate(grouped)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast.error("Failed to fetch bookings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === "bookings") {
      fetchBookings()
    }
  }, [currentMonth, activeSection])

  useEffect(() => {
    if (activeSection === "bookings") {
      fetchBookings()
    }
  }, [statusFilter, timeFilter])

  const prevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, "month"))
  }

  const nextMonth = () => {
    setCurrentMonth(currentMonth.add(1, "month"))
  }

  const goToToday = () => {
    setCurrentMonth(dayjs().startOf("month"))
  }

  const daysInMonth = currentMonth.daysInMonth()
  const firstDayOfMonth = currentMonth.startOf("month").day()

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Render booking card in calendar cell
  const renderBookingCard = (booking: Booking) => {
    const customerName = booking.user?.name || 'Unknown'
    const startTime = dayjs(booking.start_at).tz('Australia/Melbourne').format("h:mm A")

    return (
      <div
        key={booking.id}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedBooking(booking)
        }}
        className={`p-2 mb-1.5 rounded-md text-xs cursor-pointer hover:shadow-md transition-all ${getStatusColor(booking.status)} border`}
      >
        <div className="font-semibold truncate">{customerName}</div>
        <div className="text-[10px] mt-0.5 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {startTime}
        </div>
      </div>
    )
  }

  // Render calendar grid
  const renderCalendarGrid = () => {
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[100px] p-2 bg-gray-50 border border-gray-200"></div>
      )
    }

    // Actual month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = currentMonth.date(day).format("YYYY-MM-DD")
      const dayBookings = bookingsByDate[date] || []
      const isToday = dayjs().format("YYYY-MM-DD") === date

      days.push(
        <div
          key={day}
          className={`min-h-[100px] p-2 border border-gray-200 overflow-y-auto cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white'
          }`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayBookings.slice(0, 3).map(booking => renderBookingCard(booking))}
            {dayBookings.length > 3 && (
              <div className="text-[10px] text-gray-500 pl-1">
                +{dayBookings.length - 3} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  // Only render when bookings section is active
  if (activeSection !== "bookings") {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            My Bookings Calendar
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="px-4 font-semibold text-sm min-w-[140px]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {currentMonth.format("MMMM YYYY")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="center">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Year</label>
                      <Select
                        value={currentMonth.year().toString()}
                        onValueChange={(year) => {
                          setCurrentMonth(currentMonth.year(parseInt(year)));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = dayjs().year() - 5 + i;
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Month</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = dayjs().month(i);
                          const isSelected = currentMonth.month() === i;
                          return (
                            <Button
                              key={i}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setCurrentMonth(currentMonth.month(i));
                              }}
                              className="w-full"
                            >
                              {month.format("MMM")}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters - Time and Status filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="upcoming">Upcoming Only</SelectItem>
              <SelectItem value="past">Past Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="NO_SHOW">No Show</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || timeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all")
                setTimeFilter("all")
              }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading bookings...</div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <CalendarIcon className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No bookings found</p>
            <p className="text-sm mt-1">
              {timeFilter === "upcoming" && statusFilter === "all"
                ? "No upcoming appointments this month"
                : timeFilter === "past" && statusFilter === "all"
                ? "No past appointments this month"
                : statusFilter !== "all" || timeFilter !== "all"
                ? "Try adjusting your filters"
                : "No bookings for this month"}
            </p>
          </div>
        ) : (
          <>
            {/* Calendar header - days of week */}
            <div className="hidden md:grid grid-cols-7 mb-2">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-gray-600 p-2 border-b-2 border-gray-300">
                  {day}
                </div>
              ))}
            </div>

            {/* Mobile view - days abbreviated */}
            <div className="grid md:hidden grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center font-semibold text-xs text-gray-600 p-2 border-b-2 border-gray-300">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {renderCalendarGrid()}
            </div>

            {/* Stats */}
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium text-gray-700">
                Total bookings: <span className="font-bold text-gray-900">{bookings.length}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  Confirmed ({bookings.filter(b => b.status === 'CONFIRMED').length})
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-yellow-500"></div>
                  Pending ({bookings.filter(b => b.status === 'PENDING').length})
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  Completed ({bookings.filter(b => b.status === 'COMPLETED').length})
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  Cancelled ({bookings.filter(b => b.status === 'CANCELLED').length})
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Day View Dialog - Simplified for barbers */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-5xl max-w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="h-6 w-6" />
              <DialogTitle className="text-2xl font-bold text-white">
                {selectedDate && dayjs(selectedDate).format("dddd, MMMM D, YYYY")}
              </DialogTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-blue-100 text-sm">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                {selectedDate && (bookingsByDate[selectedDate]?.length || 0)} appointments
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedDate && bookingsByDate[selectedDate]?.length > 0 ? (
              <div className="space-y-4">
                {bookingsByDate[selectedDate]
                  .sort((a, b) => dayjs(a.start_at).diff(dayjs(b.start_at)))
                  .map((booking, index) => (
                    <div
                      key={booking.id}
                      className="border-2 rounded-xl p-5 hover:shadow-lg transition-all bg-white"
                      style={{
                        borderColor: booking.status === 'CONFIRMED' ? '#10b981' :
                                    booking.status === 'PENDING' ? '#f59e0b' :
                                    booking.status === 'COMPLETED' ? '#3b82f6' :
                                    booking.status === 'CANCELLED' ? '#ef4444' : '#9ca3af'
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${getStatusColor(booking.status)} font-semibold`}>
                                {booking.status}
                              </Badge>
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {booking.booking_reference}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                              <Clock className="h-5 w-5 text-blue-600" />
                              {dayjs(booking.start_at).tz('Australia/Melbourne').format("h:mm A")} - {dayjs(booking.end_at).tz('Australia/Melbourne').format("h:mm A")}
                              <span className="text-sm text-gray-500 font-normal">
                                ({booking.duration_minutes || 0} min)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2 font-semibold uppercase">Customer</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-sm">{booking.user?.name || "Unknown"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-600">{booking.user?.phone_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-600 truncate">{booking.user?.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2 font-semibold uppercase">Service</div>
                          <div className="space-y-1.5">
                            <div className="font-medium text-sm text-gray-800">
                              {booking.service_name}
                            </div>
                            <div className="text-xs text-gray-600">
                              Price: ${((booking.price_cents || 0) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {booking.customer_note && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-yellow-700 text-xs font-bold">!</span>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-yellow-800 mb-1">Customer Note</div>
                              <div className="text-sm text-yellow-900">{booking.customer_note}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarIcon className="h-12 w-12" />
                </div>
                <p className="text-xl font-medium text-gray-600 mb-2">No appointments</p>
                <p className="text-sm text-gray-500">You're free this day</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 pt-4">
              <div>
                <Badge className={`${getStatusColor(selectedBooking.status)} text-sm px-3 py-1`}>
                  {selectedBooking.status}
                </Badge>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Booking Reference</div>
                <div className="font-mono font-semibold">{selectedBooking.booking_reference}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Date</div>
                  <div className="font-semibold">{dayjs(selectedBooking.start_at).tz('Australia/Melbourne').format("MMM D, YYYY")}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Time</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {dayjs(selectedBooking.start_at).tz('Australia/Melbourne').format("h:mm A")} - {dayjs(selectedBooking.end_at).tz('Australia/Melbourne').format("h:mm A")}
                  </div>
                </div>
              </div>

              {selectedBooking.user && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium text-right">{selectedBooking.user.name}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email:
                        </span>
                        <span className="font-medium text-right">{selectedBooking.user.email}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Phone:
                        </span>
                        <span className="font-medium text-right">{selectedBooking.user.phone_number}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium text-right max-w-[60%]">{selectedBooking.service_name}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium text-right">${((selectedBooking.price_cents || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedBooking.customer_note && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Customer Notes</div>
                    <div className="text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      {selectedBooking.customer_note}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
