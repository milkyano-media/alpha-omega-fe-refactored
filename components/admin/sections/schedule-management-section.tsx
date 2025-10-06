"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Settings, Plus, Edit, Trash2 } from "lucide-react"
import { API } from "@/lib/api-client"

interface ScheduleManagementSectionProps {
  activeSection: string
  onSectionChange?: (section: string) => void
}

export function ScheduleManagementSection({ activeSection, onSectionChange }: ScheduleManagementSectionProps) {
  const [businessHours, setBusinessHours] = useState<any[]>([])
  const [teamSchedules, setTeamSchedules] = useState<any[]>([])
  const [businessClosures, setBusinessClosures] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch initial data
  useEffect(() => {
    if (activeSection === 'schedule') {
      fetchScheduleData()
    }
  }, [activeSection])

  const fetchScheduleData = async () => {
    setLoading(true)
    try {
      // Fetch team members for schedule management
      const teamResponse = await API.get('/team-members')
      setTeamMembers(teamResponse.data || [])

      // Note: We'll need to create these endpoints for schedule management
      // For now, we'll show the UI structure
      console.log('Schedule data fetched')
    } catch (error) {
      console.error('Error fetching schedule data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (activeSection !== 'schedule') {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <CardTitle>Schedule Management</CardTitle>
          <Badge variant="outline" className="ml-auto">
            Self-Managed System
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Manage business hours, team member schedules, and availability for your self-managed booking system
        </p>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="business-hours" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
            <TabsTrigger value="team-schedules">Team Schedules</TabsTrigger>
            <TabsTrigger value="closures">Holidays & Closures</TabsTrigger>
            <TabsTrigger value="analytics">Availability Analytics</TabsTrigger>
          </TabsList>

          {/* Business Hours Tab */}
          <TabsContent value="business-hours" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Operating Hours
              </h3>
              <Button size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Hours
              </Button>
            </div>

            <div className="grid gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                <div key={day} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-20 font-medium">{day}</div>
                    <Badge variant={index < 5 ? "default" : index === 5 ? "secondary" : "outline"}>
                      {index < 5 ? "Open" : index === 5 ? "Limited" : "Closed"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {index < 5 ? "9:00 AM - 6:00 PM" : index === 5 ? "10:00 AM - 4:00 PM" : "Closed"}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Team Schedules Tab */}
          <TabsContent value="team-schedules" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Member Schedules
              </h3>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule Override
              </Button>
            </div>

            <div className="grid gap-4">
              {teamMembers.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <div>
                        <h4 className="font-medium">{member.first_name} {member.last_name}</h4>
                        <p className="text-sm text-gray-600">{member.status}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        View Schedule
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">This Week:</span> Following business hours with 1 override
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Closures Tab */}
          <TabsContent value="closures" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Business Closures & Holidays
              </h3>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Closure
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming closures scheduled</p>
                <p className="text-sm">Add holidays, maintenance days, or special closures</p>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Availability Analytics
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-green-600">94%</div>
                <div className="text-sm text-gray-600">Average Availability</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-blue-600">127</div>
                <div className="text-sm text-gray-600">Available Slots This Week</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-orange-600">23</div>
                <div className="text-sm text-gray-600">Bookings This Week</div>
              </Card>
            </div>

            <Card className="p-4">
              <h4 className="font-medium mb-3">Team Member Utilization</h4>
              <div className="space-y-3">
                {teamMembers.slice(0, 4).map((member, index) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <span className="font-medium">{member.first_name} {member.last_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${[85, 72, 91, 68][index]}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">{[85, 72, 91, 68][index]}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}