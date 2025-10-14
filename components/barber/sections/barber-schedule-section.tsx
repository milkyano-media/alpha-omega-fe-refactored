"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar as CalendarIcon, AlertCircle } from "lucide-react"
import { API } from "@/lib/api-client"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import toast from "react-hot-toast"

dayjs.extend(utc)
dayjs.extend(timezone)

interface TeamMemberSchedule {
  id: number
  team_member_id: number
  schedule_type: 'working_hours' | 'break' | 'unavailable' | 'override'
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null // 0=Sunday, 6=Saturday
  start_date: string
  end_date: string | null
  start_time: string
  end_time: string
  title: string | null
  notes: string | null
  is_active: boolean
}

interface Booking {
  id: number
  service_name: string
  start_at: string
  end_at: string
  status: string
  user?: {
    name: string
  }
}

interface BarberScheduleSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function BarberScheduleSection({ activeSection }: BarberScheduleSectionProps) {
  const [loading, setLoading] = useState(false)
  const [teamMemberId, setTeamMemberId] = useState<number | null>(null)
  const [schedules, setSchedules] = useState<TeamMemberSchedule[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])

  // Fetch team member ID from user's profile
  const fetchTeamMemberId = async () => {
    try {
      // Get current user's team member ID
      const response = await API.get('/team-members/me')
      console.log('🔍 Team member response:', response.data)

      // Handle both response formats: response.data.data.id and response.data.id
      const teamMemberData = response.data?.data || response.data

      if (teamMemberData?.id) {
        setTeamMemberId(teamMemberData.id)
        console.log('✅ Team member ID set:', teamMemberData.id)
      } else {
        console.warn('⚠️ No team member ID found in response')
        console.log('Response structure:', response.data)
      }
    } catch (error: any) {
      console.error('❌ Error fetching team member ID:', error)
      toast.error('Failed to fetch barber profile')
    }
  }

  // Fetch schedules
  const fetchSchedules = async (tmId: number) => {
    try {
      setLoading(true)
      console.log(`🔍 Fetching schedules for team member ID: ${tmId}`)

      const response = await API.get(`/schedule/team-schedules/${tmId}`)
      console.log('📦 Schedule response:', response.data)

      // Handle both response formats: array directly or wrapped in data property
      const scheduleData = Array.isArray(response.data) ? response.data : response.data?.data

      if (scheduleData && Array.isArray(scheduleData)) {
        setSchedules(scheduleData)
        console.log(`✅ Loaded ${scheduleData.length} schedule entries`)
        console.log('Schedule data:', scheduleData)
      } else {
        console.warn('⚠️ No schedule data in response')
        console.log('Response structure:', response.data)
      }
    } catch (error) {
      console.error('❌ Error fetching schedules:', error)
      toast.error('Failed to fetch schedule')
    } finally {
      setLoading(false)
    }
  }

  // Fetch upcoming bookings
  const fetchUpcomingBookings = async () => {
    try {
      const response = await API.get('/bookings?page=1&limit=50')
      if (response.data?.bookings) {
        const now = dayjs()
        const upcoming = response.data.bookings
          .filter((b: Booking) => dayjs(b.start_at).isAfter(now))
          .slice(0, 5)
          .sort((a: Booking, b: Booking) =>
            dayjs(a.start_at).diff(dayjs(b.start_at))
          )
        setUpcomingBookings(upcoming)
      }
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error)
    }
  }

  useEffect(() => {
    if (activeSection === "schedule") {
      fetchTeamMemberId()
      fetchUpcomingBookings()
    }
  }, [activeSection])

  useEffect(() => {
    if (teamMemberId) {
      fetchSchedules(teamMemberId)
    }
  }, [teamMemberId])

  if (activeSection !== "schedule") {
    return null
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek]
  }

  const getScheduleTypeBadge = (type: string) => {
    switch (type) {
      case 'working_hours':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Working Hours</Badge>
      case 'break':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Break</Badge>
      case 'unavailable':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Unavailable</Badge>
      case 'override':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Override</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  // Group schedules by type
  const workingHours = schedules.filter(s => s.schedule_type === 'working_hours' && s.recurrence_type === 'weekly')
  const timeOff = schedules.filter(s => s.schedule_type === 'unavailable' || s.schedule_type === 'break')

  // Debug logging
  if (schedules.length > 0 && workingHours.length === 0) {
    console.warn('⚠️ Schedules exist but no working hours found after filtering')
    console.log('Total schedules:', schedules.length)
    console.log('Schedule types:', schedules.map(s => ({ type: s.schedule_type, recurrence: s.recurrence_type })))
  }

  return (
    <div className="space-y-6">
      {/* Weekly Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            My Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading schedule...</div>
            </div>
          ) : workingHours.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">No working hours set</p>
              <p className="text-sm text-gray-500 mt-1">Contact admin to set up your schedule</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const daySchedule = workingHours.find(s => s.day_of_week === day)
                return (
                  <div
                    key={day}
                    className={`p-4 rounded-lg border-2 ${
                      daySchedule
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{getDayName(day)}</span>
                      {daySchedule ? (
                        <span className="text-sm text-green-700">
                          {dayjs(`2000-01-01 ${daySchedule.start_time}`).format('h:mm A')} - {dayjs(`2000-01-01 ${daySchedule.end_time}`).format('h:mm A')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Off</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(booking => (
                <div
                  key={booking.id}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{booking.service_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {booking.user?.name || 'Customer'}
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4" />
                    <span>{dayjs(booking.start_at).tz('Australia/Melbourne').format('ddd, MMM D [at] h:mm A')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Off & Unavailability */}
      {timeOff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Time Off & Breaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeOff.map(schedule => (
                <div
                  key={schedule.id}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-900">
                      {schedule.title || 'Time Off'}
                    </div>
                    {getScheduleTypeBadge(schedule.schedule_type)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      {dayjs(schedule.start_date).format('MMM D, YYYY')}
                      {schedule.end_date && ` - ${dayjs(schedule.end_date).format('MMM D, YYYY')}`}
                    </div>
                    <div>
                      {dayjs(`2000-01-01 ${schedule.start_time}`).format('h:mm A')} - {dayjs(`2000-01-01 ${schedule.end_time}`).format('h:mm A')}
                    </div>
                    {schedule.notes && (
                      <div className="mt-2 text-sm text-gray-700">
                        {schedule.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
