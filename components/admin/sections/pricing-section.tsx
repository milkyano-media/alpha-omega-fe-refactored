"use client"

import { useEffect, useState } from "react"
import { API } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Search, RefreshCw, ChevronUp, ChevronDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import { getErrorMessage } from "@/lib/error-utils"
import { format } from "date-fns"

interface Service {
  id: number
  name: string
  base_price_cents: number
}

interface TeamMember {
  id: number
  first_name: string
  last_name: string
  status: string
}

interface ServicePricing {
  id: number
  service_id: number
  team_member_id: number
  price_cents: number
  duration_override: number | null
  is_available: boolean
  special_notes: string | null
  effective_from: string
  effective_until: string | null
  service?: Service
  teamMember?: TeamMember
  created_at: string
  updated_at: string
}

// Validation schema for service pricing form
const servicePricingSchema = z.object({
  service_id: z.string()
    .min(1, "Service selection is required"),
  
  team_member_id: z.string()
    .min(1, "Team member selection is required"),
  
  price_cents: z.string()
    .min(1, "Price is required")
    .regex(/^\d+$/, "Price must be a valid number")
    .refine((val) => parseInt(val) >= 100, "Price must be at least $1.00")
    .refine((val) => parseInt(val) <= 10000000, "Price must be less than $100,000.00"),
  
  duration_override: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 5 && num <= 480;
    }, "Duration must be between 5 and 480 minutes"),
  
  is_available: z.boolean(),
  
  special_notes: z.string()
    .max(500, "Special notes must be less than 500 characters")
    .optional(),
  
  effective_from: z.string()
    .min(1, "Effective from date is required")
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Effective from must be a valid date"),
  
  effective_until: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Effective until must be a valid date")
})
.refine((data) => {
  if (data.effective_until && data.effective_until !== "") {
    const fromDate = new Date(data.effective_from);
    const untilDate = new Date(data.effective_until);
    return untilDate > fromDate;
  }
  return true;
}, {
  message: "Effective until date must be after effective from date",
  path: ["effective_until"]
});

type ServicePricingFormData = z.infer<typeof servicePricingSchema>

interface PricingSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function PricingSection({ activeSection }: PricingSectionProps) {
  const [pricingData, setPricingData] = useState<ServicePricing[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [selectedService, setSelectedService] = useState<string>("all")
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("all")
  const [showDialog, setShowDialog] = useState(false)
  const [editingPricing, setEditingPricing] = useState<ServicePricing | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  })
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC")

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ServicePricingFormData>({
    resolver: zodResolver(servicePricingSchema),
    defaultValues: {
      service_id: "",
      team_member_id: "",
      price_cents: "",
      duration_override: "",
      is_available: true,
      special_notes: "",
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: ""
    }
  })

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load data - always run hooks
  useEffect(() => {
    if (activeSection === "pricing") {
      loadData()
      loadMetadata()
    }
  }, [activeSection])

  // Reload data when filters or pagination change
  useEffect(() => {
    if (activeSection === "pricing") {
      loadData()
    }
  }, [activeSection, pagination.currentPage, debouncedSearchTerm, selectedService, selectedTeamMember, sortBy, sortOrder])

  const loadData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: debouncedSearchTerm,
        service_id: selectedService === "all" ? "" : selectedService,
        team_member_id: selectedTeamMember === "all" ? "" : selectedTeamMember,
        sort_by: sortBy,
        sort_order: sortOrder
      })
      
      const response = await API.get(`/service-pricing?${params}`)
      const data = response.data.data || response.data
      
      if (data.service_pricing) {
        setPricingData(data.service_pricing)
        setPagination(data.pagination)
      } else {
        setPricingData(data || [])
      }
    } catch (error) {
      console.error("Error loading pricing data:", error)
      toast.error(getErrorMessage(error, "Failed to load pricing data"))
    } finally {
      setLoading(false)
    }
  }

  const loadMetadata = async () => {
    try {
      const [servicesResponse, teamMembersResponse] = await Promise.all([
        API.get("/services"),
        API.get("/team-members")
      ])
      
      const servicesData = servicesResponse.data.data || servicesResponse.data || []
      const teamMembersData = teamMembersResponse.data.data || teamMembersResponse.data || []
      
      setServices(Array.isArray(servicesData) ? servicesData : [])
      setTeamMembers(Array.isArray(teamMembersData) ? teamMembersData : [])
    } catch (error) {
      console.error("Error loading metadata:", error)
      toast.error(getErrorMessage(error, "Failed to load services and team members"))
      // Ensure arrays are set even on error
      setServices([])
      setTeamMembers([])
    }
  }

  const openCreateDialog = () => {
    setEditingPricing(null)
    reset({
      service_id: "",
      team_member_id: "",
      price_cents: "",
      duration_override: "",
      is_available: true,
      special_notes: "",
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: ""
    })
    setShowDialog(true)
  }

  const openEditDialog = (pricing: ServicePricing) => {
    setEditingPricing(pricing)
    reset({
      service_id: pricing.service_id.toString(),
      team_member_id: pricing.team_member_id.toString(),
      price_cents: pricing.price_cents.toString(),
      duration_override: pricing.duration_override?.toString() || "",
      is_available: pricing.is_available,
      special_notes: pricing.special_notes || "",
      effective_from: pricing.effective_from.split('T')[0],
      effective_until: pricing.effective_until?.split('T')[0] || ""
    })
    setShowDialog(true)
  }

  const onSubmit = async (data: ServicePricingFormData) => {
    try {
      setIsSubmitting(true)
      
      const pricingData = {
        service_id: parseInt(data.service_id),
        team_member_id: parseInt(data.team_member_id),
        price_cents: parseInt(data.price_cents),
        duration_override: data.duration_override ? parseInt(data.duration_override) : null,
        is_available: data.is_available,
        special_notes: data.special_notes || null,
        effective_from: data.effective_from,
        effective_until: data.effective_until || null
      }

      if (editingPricing) {
        await API.put(`/service-pricing/${editingPricing.id}`, pricingData)
        toast.success("Pricing updated successfully")
      } else {
        await API.post("/service-pricing", pricingData)
        toast.success("Pricing created successfully")
      }

      setShowDialog(false)
      // Reset to first page when adding new data
      setPagination(prev => ({ ...prev, currentPage: 1 }))
      loadData()
    } catch (error: any) {
      console.error("Error saving pricing:", error)
      toast.error(error.response?.data?.message || "Failed to save pricing")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (pricing: ServicePricing) => {
    if (!confirm(`Are you sure you want to delete this pricing rule?`)) return

    try {
      await API.delete(`/service-pricing/${pricing.id}`)
      toast.success("Pricing deleted successfully")
      // Stay on current page unless it becomes empty
      loadData()
    } catch (error: any) {
      console.error("Error deleting pricing:", error)
      toast.error(error.response?.data?.message || "Failed to delete pricing")
    }
  }

  const handleToggleAvailable = async (pricing: ServicePricing) => {
    try {
      if (pricing.is_available) {
        await API.delete(`/service-pricing/${pricing.id}`)
        toast.success("Pricing deactivated")
      } else {
        await API.patch(`/service-pricing/${pricing.id}/activate`)
        toast.success("Pricing activated")
      }
      loadData()
    } catch (error: any) {
      console.error("Error toggling pricing availability:", error)
      toast.error(error.response?.data?.message || "Failed to update pricing")
    }
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null
    return sortOrder === "ASC" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const { currentPage, totalPages } = pagination

    // Always show first page
    if (currentPage > 3) {
      buttons.push(
        <Button key="1" variant={currentPage === 1 ? "default" : "outline"} size="sm" onClick={() => handlePageChange(1)}>
          1
        </Button>
      )
      if (currentPage > 4) {
        buttons.push(<span key="dots1">...</span>)
      }
    }

    // Show pages around current page
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      )
    }

    // Always show last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        buttons.push(<span key="dots2">...</span>)
      }
      buttons.push(
        <Button
          key={totalPages}
          variant={currentPage === totalPages ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Button>
      )
    }

    return buttons
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy")
  }

  return (
    <div className={`space-y-6 ${activeSection !== "pricing" ? "hidden" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Service Pricing Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage per-barber pricing for services with effective dates
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pricing Rule
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search services or barbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {Array.isArray(services) && services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                <SelectTrigger>
                  <SelectValue placeholder="All barbers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All barbers</SelectItem>
                  {Array.isArray(teamMembers) && teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {`${member.first_name} ${member.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={loadData} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading pricing data...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Team Member</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("price_cents")}
                    >
                      <div className="flex items-center gap-1">
                        Price
                        {getSortIcon("price_cents")}
                      </div>
                    </TableHead>
                    <TableHead>Duration Override</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("effective_from")}
                    >
                      <div className="flex items-center gap-1">
                        Effective Period
                        {getSortIcon("effective_from")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("is_available")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon("is_available")}
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No pricing rules found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pricingData.map((pricing) => (
                      <TableRow key={pricing.id}>
                        <TableCell>
                          <div className="font-medium">
                            {pricing.service?.name || `Service ${pricing.service_id}`}
                          </div>
                          {pricing.special_notes && (
                            <div className="text-sm text-muted-foreground">
                              {pricing.special_notes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {pricing.teamMember ? `${pricing.teamMember.first_name} ${pricing.teamMember.last_name}` : `Member ${pricing.team_member_id}`}
                          </div>
                        </TableCell>
                        <TableCell>{formatPrice(pricing.price_cents)}</TableCell>
                        <TableCell>
                          {pricing.duration_override ? `${pricing.duration_override} min` : "Default"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>From: {formatDate(pricing.effective_from)}</div>
                            {pricing.effective_until && (
                              <div>Until: {formatDate(pricing.effective_until)}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pricing.is_available ? "default" : "secondary"}>
                            {pricing.is_available ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(pricing)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleAvailable(pricing)}
                            >
                              {pricing.is_available ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(pricing)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {pricingData.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {renderPaginationButtons()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPricing ? "Edit Pricing Rule" : "Create New Pricing Rule"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service_id">Service *</Label>
                <Select value={watch("service_id")} onValueChange={(value) => setValue("service_id", value)}>
                  <SelectTrigger className={errors.service_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(services) && services.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service_id && (
                  <p className="text-sm text-red-500">{errors.service_id.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_member_id">Team Member *</Label>
                <Select value={watch("team_member_id")} onValueChange={(value) => setValue("team_member_id", value)}>
                  <SelectTrigger className={errors.team_member_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select barber" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(teamMembers) && teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {`${member.first_name} ${member.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team_member_id && (
                  <p className="text-sm text-red-500">{errors.team_member_id.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price_cents">Price (cents) *</Label>
                <Input
                  id="price_cents"
                  type="number"
                  {...register("price_cents")}
                  placeholder="e.g., 3500 for $35.00"
                  className={errors.price_cents ? "border-red-500" : ""}
                />
                {errors.price_cents && (
                  <p className="text-sm text-red-500">{errors.price_cents.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_override">Duration Override (minutes)</Label>
                <Input
                  id="duration_override"
                  type="number"
                  {...register("duration_override")}
                  placeholder="Leave empty to use service default"
                  className={errors.duration_override ? "border-red-500" : ""}
                />
                {errors.duration_override && (
                  <p className="text-sm text-red-500">{errors.duration_override.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effective_from">Effective From *</Label>
                <Input
                  id="effective_from"
                  type="date"
                  {...register("effective_from")}
                  className={errors.effective_from ? "border-red-500" : ""}
                />
                {errors.effective_from && (
                  <p className="text-sm text-red-500">{errors.effective_from.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="effective_until">Effective Until</Label>
                <Input
                  id="effective_until"
                  type="date"
                  {...register("effective_until")}
                  className={errors.effective_until ? "border-red-500" : ""}
                />
                {errors.effective_until && (
                  <p className="text-sm text-red-500">{errors.effective_until.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_notes">Special Notes</Label>
              <Textarea
                id="special_notes"
                {...register("special_notes")}
                placeholder="Any special notes about this pricing (max 500 characters)"
                rows={2}
                className={errors.special_notes ? "border-red-500" : ""}
                maxLength={500}
              />
              {errors.special_notes && (
                <p className="text-sm text-red-500">{errors.special_notes.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_available"
                checked={watch("is_available")}
                onCheckedChange={(checked) => setValue("is_available", checked as boolean)}
              />
              <Label htmlFor="is_available">Available for booking</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (editingPricing ? "Update" : "Create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}