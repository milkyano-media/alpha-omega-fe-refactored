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
  ChevronDown
} from "lucide-react"
import { RescheduleBookingDialog } from "@/components/admin/dialogs/reschedule-booking-dialog"
import { RefundBookingDialog } from "@/components/admin/dialogs/refund-booking-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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
  service_id: number
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
  payment_data?: {
    stripe_payment_intent_id?: string
    stripe_charge_id?: string
    stripe_receipt_url?: string
    payment_verified_at?: string
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

interface BookingsSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function BookingsSection({ activeSection }: BookingsSectionProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({})
  const [loading, setLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [teamMembers, setTeamMembers] = useState<Array<{id: number, name: string}>>([])
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [updatingBookingId, setUpdatingBookingId] = useState<number | null>(null)
  const [barberComboboxOpen, setBarberComboboxOpen] = useState(false)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [bookingToRefund, setBookingToRefund] = useState<Booking | null>(null)

  // Fetch bookings for the current month
  const fetchBookings = async () => {
    try {
      setLoading(true)

      // Backend doesn't support date filtering yet, so fetch all bookings with high limit
      const response = await API.get(`/bookings?page=1&limit=1000`)

      console.log('🔍 API Response:', response.data)

      if (response.data && response.data.bookings) {
        const allBookings = response.data.bookings
        console.log('📦 All bookings:', allBookings)
        console.log('📦 Bookings count:', allBookings.length)

        // Filter bookings for current month on client side
        const startDate = currentMonth.startOf("month")
        const endDate = currentMonth.endOf("month")
        console.log('📅 Date range:', {
          currentMonth: currentMonth.format('YYYY-MM'),
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        })

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

        // Filter by team member
        if (teamMemberFilter !== "all") {
          filteredBookings = filteredBookings.filter((booking: Booking) =>
            booking.team_member_id === parseInt(teamMemberFilter)
          )
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
        console.log('📊 Grouped bookings:', grouped)
        setBookingsByDate(grouped)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast.error("Failed to fetch bookings")
    } finally {
      setLoading(false)
    }
  }

  // Fetch team members for filter
  const fetchTeamMembers = async () => {
    try {
      const response = await API.get('/team-members')
      console.log('Team members response:', response.data)

      // Check if response.data is already an array (direct response)
      // or wrapped in { data: [...] } format
      const teamMembersData = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.teamMembers || [])

      setTeamMembers(teamMembersData.map((tm: any) => ({
        id: tm.id,
        name: `${tm.first_name} ${tm.last_name}`
      })))

      console.log('Team members loaded:', teamMembersData.length)
    } catch (error) {
      console.error("Error fetching team members:", error)
    }
  }

  useEffect(() => {
    if (activeSection === "bookings") {
      fetchBookings()
      fetchTeamMembers()
    }
  }, [currentMonth, activeSection])

  useEffect(() => {
    if (activeSection === "bookings") {
      fetchBookings()
    }
  }, [statusFilter, teamMemberFilter])

  const prevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, "month"))
  }

  const nextMonth = () => {
    setCurrentMonth(currentMonth.add(1, "month"))
  }

  const goToToday = () => {
    setCurrentMonth(dayjs().startOf("month"))
  }

  // Update booking status (admin-only endpoint)
  const updateBookingStatus = async (bookingId: number, newStatus: string) => {
    try {
      setUpdatingBookingId(bookingId)

      // Use dedicated admin status update endpoint - PATCH /bookings/:id/status
      const response = await API.patch(`/bookings/${bookingId}/status`, {
        status: newStatus
      })

      // Check if response contains error
      if (response.data && response.data.error) {
        toast.error(response.data.details || "Failed to update booking status")
        return
      }

      toast.success("Booking status updated successfully")
      fetchBookings() // Refresh bookings
    } catch (error: any) {
      console.error("Error updating booking:", error)
      const errorMessage = error.response?.data?.details || error.message || "Failed to update booking status"
      toast.error(errorMessage)
    } finally {
      setUpdatingBookingId(null)
    }
  }

  // Cancel booking
  const cancelBooking = async (bookingId: number, bookingStartTime: string) => {
    // Check if booking is within 24 hours
    const hoursUntilBooking = dayjs(bookingStartTime).diff(dayjs(), 'hours')

    if (hoursUntilBooking < 24) {
      const confirmMessage = `This booking is less than 24 hours away. The system policy requires 24 hours notice, but as an admin you can still cancel it. Continue?`
      if (!confirm(confirmMessage)) return
    } else {
      if (!confirm("Are you sure you want to cancel this booking?")) return
    }

    try {
      setUpdatingBookingId(bookingId)

      const response = await API.post(`/bookings/${bookingId}/cancel-self-managed`, {
        cancellation_reason: "Cancelled by admin"
      })

      // Check if response contains error
      if (response.data && response.data.error) {
        toast.error(response.data.details || "Failed to cancel booking")
        return
      }

      toast.success("Booking cancelled successfully")
      fetchBookings()
      setSelectedDate(null)
    } catch (error: any) {
      console.error("Error cancelling booking:", error)
      const errorMessage = error.response?.data?.details || error.message || "Failed to cancel booking"
      toast.error(errorMessage)
    } finally {
      setUpdatingBookingId(null)
    }
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
    const teamMemberName = booking.team_member?.name || 'N/A'

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
        <div className="text-[10px] mt-0.5 truncate">{teamMemberName}</div>
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

  // Only render when bookings section is active (after all hooks are called)
  if (activeSection !== "bookings") {
    return null
  }

  return (
    <>
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Bookings Calendar
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

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

          <Popover open={barberComboboxOpen} onOpenChange={setBarberComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={barberComboboxOpen}
                className="w-[150px] h-9 justify-between px-3 py-2 text-sm font-normal [&>span]:line-clamp-1"
              >
                {teamMemberFilter === "all"
                  ? "All Barbers"
                  : teamMembers.find((tm) => tm.id.toString() === teamMemberFilter)?.name}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[150px] p-0">
              <Command>
                <CommandInput placeholder="Search barbers..." />
                <CommandList>
                  <CommandEmpty>No barber found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setTeamMemberFilter("all")
                        setBarberComboboxOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          teamMemberFilter === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Barbers
                    </CommandItem>
                    {teamMembers.map((tm) => (
                      <CommandItem
                        key={tm.id}
                        value={tm.name}
                        onSelect={() => {
                          setTeamMemberFilter(tm.id.toString())
                          setBarberComboboxOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            teamMemberFilter === tm.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tm.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {(statusFilter !== "all" || teamMemberFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all")
                setTeamMemberFilter("all")
              }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
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
              {statusFilter !== "all" || teamMemberFilter !== "all"
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

      {/* Enhanced Day View Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-7xl max-w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0">
          {/* Header with gradient */}
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
                {selectedDate && (bookingsByDate[selectedDate]?.length || 0)} total
              </span>
              {selectedDate && bookingsByDate[selectedDate]?.length > 0 && (
                <>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                    {bookingsByDate[selectedDate].filter(b => b.status === 'CONFIRMED').length} confirmed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    {bookingsByDate[selectedDate].filter(b => b.status === 'PENDING').length} pending
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                    {bookingsByDate[selectedDate].filter(b => b.status === 'COMPLETED').length} completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-300 rounded-full"></div>
                    {bookingsByDate[selectedDate].filter(b => b.status === 'CANCELLED').length} cancelled
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    {bookingsByDate[selectedDate].filter(b => b.status === 'NO_SHOW').length} no show
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Scrollable content */}
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
                        {/* Booking header */}
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

                        {/* Booking details grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {/* Customer info */}
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

                          {/* Service info */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-2 font-semibold uppercase">Service</div>
                            <div className="space-y-1.5">
                              <div className="font-medium text-sm text-gray-800">
                                {booking.service_name}
                              </div>
                              <div className="text-xs text-gray-600">
                                with {booking.team_member?.name || "N/A"}
                              </div>
                            </div>
                          </div>

                          {/* Payment info */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-2 font-semibold uppercase">Payment</div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Status:</span>
                                <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                                  booking.payment_status === 'fully_paid' ? 'bg-green-50 text-green-700 border-green-300' :
                                  booking.payment_status === 'deposit_paid' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  booking.payment_status === 'refunded' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                                  booking.payment_status === 'failed' ? 'bg-red-50 text-red-700 border-red-300' :
                                  'bg-gray-50 text-gray-700 border-gray-300'
                                }`}>
                                  {booking.payment_status?.replace('_', ' ').toUpperCase() || 'UNPAID'}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Total:</span>
                                <span className="font-bold text-sm">
                                  ${((booking.price_cents || 0) / 100).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Deposit:</span>
                                <span className="font-semibold text-sm text-green-600">
                                  ${((booking.deposit_paid_cents || 0) / 100).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                                <span className="text-xs text-gray-600">Due:</span>
                                <span className="font-semibold text-sm text-orange-600">
                                  ${(((booking.price_cents || 0) - (booking.deposit_paid_cents || 0)) / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Customer note */}
                        {booking.customer_note && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
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

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                            className="flex items-center gap-2"
                          >
                            <User className="h-4 w-4" />
                            Full Details
                          </Button>

                          {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBookingToReschedule(booking)
                                  setRescheduleDialogOpen(true)
                                }}
                                className="flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4" />
                                Reschedule
                              </Button>

                              <Select
                                value={booking.status}
                                onValueChange={(value) => updateBookingStatus(booking.id, value)}
                                disabled={updatingBookingId === booking.id}
                              >
                                <SelectTrigger className="w-[140px] h-9">
                                  <SelectValue placeholder="Change Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => cancelBooking(booking.id, booking.start_at)}
                                disabled={updatingBookingId === booking.id}
                                className="ml-auto"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel Booking
                              </Button>
                            </>
                          )}

                          {(booking.status === "CANCELLED" || booking.status === "COMPLETED") && (
                            <div className="ml-auto text-sm text-gray-500 italic">
                              {booking.status === "CANCELLED" ? "Booking cancelled" : "Booking completed"}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CalendarIcon className="h-12 w-12" />
                  </div>
                  <p className="text-xl font-medium text-gray-600 mb-2">No bookings scheduled</p>
                  <p className="text-sm text-gray-500">This day is currently free</p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 pt-4">
              {/* Status Badge */}
              <div>
                <Badge className={`${getStatusColor(selectedBooking.status)} text-sm px-3 py-1`}>
                  {selectedBooking.status}
                </Badge>
              </div>

              {/* Booking Reference */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Booking Reference</div>
                <div className="font-mono font-semibold">{selectedBooking.booking_reference}</div>
              </div>

              {/* Date & Time */}
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

              {/* Customer Info */}
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

              {/* Service & Barber */}
              <Separator />
              <div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium text-right max-w-[60%]">{selectedBooking.service_name}</span>
                  </div>
                  {selectedBooking.team_member && (
                    <div className="flex items-start justify-between">
                      <span className="text-gray-600">Barber:</span>
                      <span className="font-medium text-right">{selectedBooking.team_member.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <Separator />
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Details
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                      selectedBooking.payment_status === 'fully_paid' ? 'bg-green-50 text-green-700 border-green-300' :
                      selectedBooking.payment_status === 'deposit_paid' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                      selectedBooking.payment_status === 'refunded' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                      selectedBooking.payment_status === 'failed' ? 'bg-red-50 text-red-700 border-red-300' :
                      'bg-gray-50 text-gray-700 border-gray-300'
                    }`}>
                      {selectedBooking.payment_status?.replace('_', ' ').toUpperCase() || 'UNPAID'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-bold text-lg">${((selectedBooking.price_cents || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Deposit Paid:</span>
                    <span className="font-semibold text-green-600">${((selectedBooking.deposit_paid_cents || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-gray-600">Balance Due:</span>
                    <span className="font-semibold text-orange-600">
                      ${(((selectedBooking.price_cents || 0) - (selectedBooking.deposit_paid_cents || 0)) / 100).toFixed(2)}
                    </span>
                  </div>

                  {/* Stripe Payment Details */}
                  {selectedBooking.payment_data?.stripe_payment_intent_id && (
                    <>
                      <div className="pt-3 border-t mt-3">
                        <div className="text-xs text-gray-500 mb-2">Stripe Payment Information</div>
                        <div className="space-y-1.5 text-xs bg-gray-50 p-2 rounded">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-gray-600">Payment ID:</span>
                            <span className="font-mono text-right break-all">
                              {selectedBooking.payment_data.stripe_payment_intent_id.substring(0, 20)}...
                            </span>
                          </div>
                          {selectedBooking.payment_data.stripe_receipt_url && (
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-gray-600">Receipt:</span>
                              <a
                                href={selectedBooking.payment_data.stripe_receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                View Receipt
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Refund Button */}
                      {(selectedBooking.payment_status === 'deposit_paid' || selectedBooking.payment_status === 'fully_paid') && (
                        <div className="pt-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setBookingToRefund(selectedBooking)
                              setRefundDialogOpen(true)
                            }}
                          >
                            Process Refund
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Customer Notes */}
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

    {/* Reschedule Dialog - Rendered outside Card for proper z-index layering */}
    <RescheduleBookingDialog
      open={rescheduleDialogOpen}
      onOpenChange={setRescheduleDialogOpen}
      booking={bookingToReschedule}
      onSuccess={() => {
        setRescheduleDialogOpen(false)
        setBookingToReschedule(null)
        fetchBookings() // Refresh bookings after successful reschedule
      }}
    />

    {/* Refund Dialog - Rendered outside Card for proper z-index layering */}
    <RefundBookingDialog
      open={refundDialogOpen}
      onOpenChange={setRefundDialogOpen}
      booking={bookingToRefund}
      onSuccess={() => {
        setRefundDialogOpen(false)
        setBookingToRefund(null)
        setSelectedBooking(null) // Close the booking details dialog
        fetchBookings() // Refresh bookings after successful refund
      }}
    />
    </>
  )
}