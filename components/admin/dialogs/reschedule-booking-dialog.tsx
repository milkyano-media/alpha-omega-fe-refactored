"use client"

import React, { useState, useEffect } from "react"
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import toast from "react-hot-toast"
import { API } from "@/lib/api-client"
import { DateTimeSelector } from "@/components/pages/appointment/DateTimeSelector"
import { TimeSlot } from "@/lib/booking-service"
import BookingService from "@/lib/booking-service"

dayjs.extend(utc)
dayjs.extend(timezone)

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
  status: string
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

interface PreviewBooking {
  id: number
  booking_reference: string
  customer_name: string
  old_start: string
  new_start: string
  old_end: string
  new_end: string
  delta_minutes: number
  old_time: string
  new_time: string
}

interface Conflict {
  booking_id: number
  booking_reference: string
  customer_name?: string
  reason: string
  old_time: string
  attempted_new_time: string
}

interface PreviewResult {
  success: boolean
  preview: boolean
  original_booking: PreviewBooking
  affected_bookings: PreviewBooking[]
  validation_results: {
    all_valid: boolean
    conflicts: Conflict[]
  }
  message?: string
}

interface RescheduleBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Booking | null
  onSuccess: () => void
}

export function RescheduleBookingDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: RescheduleBookingDialogProps) {
  // Date/Time selector states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null)
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)

  // Other states
  const [applyDomino, setApplyDomino] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  // Initialize form when booking changes
  useEffect(() => {
    if (booking && open) {
      const startMoment = dayjs(booking.start_at).tz('Australia/Melbourne')
      setSelectedDate(startMoment.toDate())
      setSelectedTime(null)
      setApplyDomino(false)
      setPreviewData(null)
      setErrors([])

      // Load available dates for the next 30 days
      loadAvailableDates(booking.team_member_id)
      // Load available times for the current booking date
      loadAvailableTimesForDate(startMoment.toDate(), booking.team_member_id, booking.duration_minutes, booking.service_id)
    }
  }, [booking, open])

  // Load available dates for the next 30 days
  const loadAvailableDates = async (teamMemberId: number) => {
    try {
      const dates: string[] = []
      const today = dayjs().tz('Australia/Melbourne')

      // Generate next 30 days
      for (let i = 0; i < 30; i++) {
        const date = today.add(i, 'day').format('YYYY-MM-DD')
        dates.push(date)
      }

      setAvailableDates(dates)
    } catch (error) {
      console.error('Error loading available dates:', error)
    }
  }

  // Load available times for a specific date
  const loadAvailableTimesForDate = async (date: Date, teamMemberId: number, durationMinutes: number, serviceId: number) => {
    setIsLoadingAvailability(true)
    try {
      const dateStr = dayjs(date).tz('Australia/Melbourne').format('YYYY-MM-DD')

      // Fetch availability from the API
      const times = await BookingService.getAvailableTimesForTeamMember(
        teamMemberId,
        dateStr,
        durationMinutes,
        serviceId
      )

      // Filter times based on selected date and current booking time
      if (booking) {
        const selectedDateStr = dayjs(date).tz('Australia/Melbourne').format('YYYY-MM-DD')
        const bookingDateStr = dayjs(booking.start_at).tz('Australia/Melbourne').format('YYYY-MM-DD')

        if (selectedDateStr === bookingDateStr) {
          // Same date as current booking - filter and add booking's own time range
          const bookingStartTime = dayjs(booking.start_at).tz('Australia/Melbourne')
          const bookingEndTime = dayjs(booking.end_at).tz('Australia/Melbourne')

          // Filter API times to show only times on or after booking start
          const filteredTimes = times.filter(time => {
            const timeStart = dayjs(time.start_at).tz('Australia/Melbourne')
            return !timeStart.isBefore(bookingStartTime)
          })

          // Generate additional time slots within the booking's own duration (15-min intervals)
          // These allow rescheduling within the booking's time range without conflicts
          const bookingRangeSlots: TimeSlot[] = []
          let currentSlot = bookingStartTime

          while (currentSlot.isBefore(bookingEndTime)) {
            const slotTime = currentSlot.toISOString()

            // Check if this slot already exists in filtered times
            const exists = filteredTimes.some(t => t.start_at === slotTime)

            if (!exists) {
              // Add synthetic slot for this time within booking's range
              bookingRangeSlots.push({
                start_at: slotTime,
                location_id: 'alpha-omega-barber-shop',
                formatted_time: currentSlot.format('h:mm A'),
                appointment_segments: [{
                  duration_minutes: booking.duration_minutes,
                  service_id: booking.service_id,
                  team_member_id: booking.team_member_id.toString(),
                  service_variation_version: 1
                }]
              })
            }

            // Move to next 15-minute interval
            currentSlot = currentSlot.add(15, 'minute')
          }

          // Combine API times with booking range slots and sort by time
          const allTimes = [...filteredTimes, ...bookingRangeSlots].sort((a, b) => {
            return dayjs(a.start_at).valueOf() - dayjs(b.start_at).valueOf()
          })

          setAvailableTimes(allTimes)
        } else {
          // Different date - show all available times
          setAvailableTimes(times)
        }
      } else {
        // No booking context - show all times
        setAvailableTimes(times)
      }
    } catch (error) {
      console.error('Error loading available times:', error)
      setAvailableTimes([])
      toast.error('Failed to load available times')
    } finally {
      setIsLoadingAvailability(false)
    }
  }

  // Handle date change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null) // Reset time selection when date changes
    setPreviewData(null) // Reset preview

    if (booking) {
      loadAvailableTimesForDate(date, booking.team_member_id, booking.duration_minutes, booking.service_id)
    }
  }

  // Handle month change
  const handleMonthChange = (date: Date) => {
    // Could load more available dates if needed
    console.log('Month changed to:', date)
  }

  // Handle time selection
  const handleTimeSelect = (time: TimeSlot | null) => {
    setSelectedTime(time)
    setPreviewData(null) // Reset preview when time changes
  }

  const handlePreview = async () => {
    if (!booking || !selectedTime) {
      toast.error('Please select a date and time')
      return
    }

    setErrors([])
    setPreviewLoading(true)

    try {
      const response = await API.patch(`/bookings/${booking.id}/reschedule-cascade`, {
        start_at: selectedTime.start_at,
        apply_domino_effect: applyDomino,
        preview_only: true
      })

      // Handle both nested (response.data.data) and direct (response.data) formats
      const result = response.data?.data || response.data

      console.log('📋 Preview response:', result)

      if (result) {
        // Check for validation errors - backend uses 'error' field, not 'success'
        if (result.error || (result.conflicts && result.conflicts.length > 0)) {
          // Validation failed
          console.log('❌ Conflicts found:', result.conflicts)

          if (result.conflicts && Array.isArray(result.conflicts) && result.conflicts.length > 0) {
            const conflictMessages = result.conflicts.map(
              (c: Conflict) => `${c.booking_reference} (${c.customer_name || 'Unknown'}): ${c.reason}`
            )
            console.log('📝 Conflict messages:', conflictMessages)
            setErrors(conflictMessages)
          } else {
            // Fallback error message
            setErrors([result.details || 'Validation failed'])
          }
          setPreviewData(null)
        } else if (result.success !== false) {
          // Preview successful - need to normalize the response format
          console.log('✅ Preview successful')
          const normalizedResult: PreviewResult = {
            success: true,
            preview: true,
            original_booking: result.original_booking,
            affected_bookings: result.affected_bookings || [],
            validation_results: result.validation_results || {
              all_valid: true,
              conflicts: []
            }
          }
          setPreviewData(normalizedResult)
          setErrors([])
        } else {
          console.error('⚠️ Preview failed with success=false')
          setErrors([result.message || 'Preview failed'])
          setPreviewData(null)
        }
      } else {
        console.error('⚠️ No result data in response:', response.data)
        setErrors(['Unexpected response from server'])
        setPreviewData(null)
      }
    } catch (error: any) {
      console.error('Preview error:', error)
      const errorMsg = error.response?.data?.details || error.message || 'Failed to generate preview'
      setErrors([errorMsg])
      setPreviewData(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!booking || !previewData || !selectedTime) return

    setConfirmLoading(true)

    try {
      const response = await API.patch(`/bookings/${booking.id}/reschedule-cascade`, {
        start_at: selectedTime.start_at,
        apply_domino_effect: applyDomino,
        preview_only: false
      })

      // Handle both nested (response.data.data) and direct (response.data) formats
      const result = response.data?.data || response.data

      console.log('✅ Confirm response:', result)

      if (result) {
        // Check for success - backend uses 'error' field, not 'success'
        if (!result.error) {
          const affectedCount = (result.affected_bookings?.length || 0) + 1
          toast.success(
            applyDomino && result.affected_bookings?.length > 0
              ? `Successfully rescheduled ${affectedCount} bookings`
              : 'Booking rescheduled successfully',
            {
              duration: 4000,
              position: 'top-center',
            }
          )
          onSuccess()
          onOpenChange(false)
        } else {
          toast.error(result.details || 'Failed to reschedule booking')
        }
      } else {
        toast.error('Unexpected response from server')
      }
    } catch (error: any) {
      console.error('Confirm error:', error)
      const errorMsg = error.response?.data?.details || error.message || 'Failed to reschedule booking'
      toast.error(errorMsg)
    } finally {
      setConfirmLoading(false)
    }
  }

  const formatTime = (isoString: string) => {
    return dayjs(isoString).tz('Australia/Melbourne').format('h:mm A')
  }

  const formatDelta = (minutes: number) => {
    const sign = minutes >= 0 ? '+' : ''
    return `${sign}${minutes} min`
  }

  if (!booking) return null

  const currentStartTime = dayjs(booking.start_at).tz('Australia/Melbourne')
  const barberName = booking.team_member?.name || 'Unknown Barber'

  // Render dialog content outside the parent DOM hierarchy
  const dialogContent = open ? (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <DialogPrimitive.Overlay
          className="bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ position: 'fixed', inset: 0, zIndex: 1110 }}
        />
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1120,
            maxHeight: '90vh',
            width: '90vw',
            maxWidth: '896px'
          }}
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 grid gap-4 rounded-lg border p-6 shadow-lg duration-200 overflow-y-auto"
          )}
        >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reschedule Booking
          </DialogTitle>
          <DialogDescription>
            Booking Reference: {booking.booking_reference} | Customer: {booking.user?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Current Booking Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Current Appointment</div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{currentStartTime.format('MMMM D, YYYY')}</span>
              </div>
              <div>
                {currentStartTime.format('h:mm A')} - {dayjs(booking.end_at).tz('Australia/Melbourne').format('h:mm A')}
              </div>
              <div className="text-gray-600">({booking.duration_minutes} minutes)</div>
            </div>
          </div>

          {/* Date/Time Selector */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Select New Appointment Time</div>
            <DateTimeSelector
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              onMonthChange={handleMonthChange}
              onTimeSelect={handleTimeSelect}
              selectedTime={selectedTime}
              availableTimes={availableTimes}
              availableDates={availableDates}
              isLoading={isLoadingAvailability}
            />
          </div>

          {/* Domino Effect Checkbox */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="domino-effect"
              checked={applyDomino}
              onCheckedChange={(checked) => {
                setApplyDomino(checked as boolean)
                setPreviewData(null) // Reset preview when checkbox changes
              }}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="domino-effect"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Apply domino effect to subsequent bookings
              </Label>
              <p className="text-xs text-gray-500">
                This will shift all later bookings for <strong>{barberName}</strong> on{" "}
                <strong>{currentStartTime.format('MMMM D, YYYY')}</strong> by the same time difference
              </p>
            </div>
          </div>

          {/* Preview Button */}
          <div>
            <Button
              onClick={handlePreview}
              disabled={previewLoading || !selectedTime}
              className="w-full"
              variant="outline"
            >
              {previewLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Preview Changes
                </>
              )}
            </Button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Cannot apply changes:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Results */}
          {previewData && previewData.success && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold">
                    {previewData.affected_bookings.length > 0
                      ? `Preview: Will update 1 booking and shift ${previewData.affected_bookings.length} subsequent bookings`
                      : "Preview: Will update 1 booking (no subsequent bookings found)"}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Current Time</TableHead>
                      <TableHead>New Time</TableHead>
                      <TableHead>Shift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Original Booking */}
                    <TableRow className="bg-blue-50">
                      <TableCell className="font-medium">
                        {previewData.original_booking.booking_reference}
                      </TableCell>
                      <TableCell>{previewData.original_booking.customer_name}</TableCell>
                      <TableCell>
                        {formatTime(previewData.original_booking.old_start)} -{" "}
                        {formatTime(previewData.original_booking.old_end)}
                      </TableCell>
                      <TableCell>
                        {formatTime(previewData.original_booking.new_start)} -{" "}
                        {formatTime(previewData.original_booking.new_end)}
                      </TableCell>
                      <TableCell>
                        <span className={previewData.original_booking.delta_minutes >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatDelta(previewData.original_booking.delta_minutes)}
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* Affected Bookings */}
                    {previewData.affected_bookings.map((affectedBooking) => (
                      <TableRow key={affectedBooking.id}>
                        <TableCell className="font-medium">
                          {affectedBooking.booking_reference}
                        </TableCell>
                        <TableCell>{affectedBooking.customer_name}</TableCell>
                        <TableCell>
                          {formatTime(affectedBooking.old_start)} -{" "}
                          {formatTime(affectedBooking.old_end)}
                        </TableCell>
                        <TableCell>
                          {formatTime(affectedBooking.new_start)} -{" "}
                          {formatTime(affectedBooking.new_end)}
                        </TableCell>
                        <TableCell>
                          <span className={affectedBooking.delta_minutes >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatDelta(affectedBooking.delta_minutes)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Confirm Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleConfirm}
                  disabled={confirmLoading}
                  className="flex-1"
                >
                  {confirmLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm & Apply Changes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  disabled={confirmLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Info Note */}
          {!previewData && errors.length === 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Note:</strong> Select a date and time, then click "Preview Changes" to see which bookings will be affected before applying the changes.
              {applyDomino && " All affected customers will receive email notifications."}
            </div>
          )}
        </div>
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  ) : null

  return dialogContent
}
