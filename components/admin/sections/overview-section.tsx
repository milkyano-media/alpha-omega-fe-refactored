"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CreditCard, Users, Wrench } from "lucide-react"

interface OverviewSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function OverviewSection({ activeSection, onSectionChange }: OverviewSectionProps) {

  const stats = [
    {
      title: "Total Bookings",
      value: "1,234",
      description: "+20% from last month",
      icon: Calendar,
    },
    {
      title: "Revenue",
      value: "$12,345",
      description: "+15% from last month", 
      icon: CreditCard,
    },
    {
      title: "Services",
      value: "8",
      description: "Active services",
      icon: Wrench,
    },
    {
      title: "Team Members",
      value: "4",
      description: "Active barbers",
      icon: Users,
    },
  ]

  const quickActions = [
    {
      title: "Manage Bookings",
      description: "View and manage customer bookings",
      action: () => onSectionChange?.("bookings"),
    },
    {
      title: "Update Services",
      description: "Add or edit service offerings",
      action: () => onSectionChange?.("services"),
    },
    {
      title: "Team Management",
      description: "Manage your team members",
      action: () => onSectionChange?.("team"),
    },
    {
      title: "Business Settings",
      description: "Configure business preferences",
      action: () => onSectionChange?.("settings"),
    },
  ]

  return (
    <div className={`space-y-6 ${activeSection !== "overview" ? "hidden" : ""}`}>
      <div>
        <h3 className="text-lg font-medium">Dashboard Overview</h3>
        <p className="text-sm text-muted-foreground">
          Quick insights and actions for your business
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map((action) => (
              <div 
                key={action.title}
                className="cursor-pointer rounded-lg border p-4 hover:bg-accent transition-colors"
                onClick={action.action}
              >
                <h4 className="font-medium">{action.title}</h4>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}