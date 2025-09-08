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
import { Plus, Edit, Trash2, Search, RefreshCw } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import { getErrorMessage } from "@/lib/error-utils"
import { FormImageUpload } from "@/components/ui/form-image-upload"

interface ServiceCategory {
  id: number
  name: string
  description: string
  is_active: boolean
}

interface Service {
  id: number
  name: string
  description: string
  short_description: string
  base_price_cents: number
  currency: string
  duration_minutes: number
  category_id: number
  is_active: boolean
  is_featured: boolean
  display_order: number
  image_url: string
  serviceCategory?: ServiceCategory
  created_at: string
  updated_at: string
}

// Validation schema for service form
const serviceSchema = z.object({
  name: z.string()
    .min(1, "Service name is required")
    .min(2, "Service name must be at least 2 characters")
    .max(100, "Service name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s&'-]+$/, "Service name contains invalid characters"),
  
  description: z.string()
    .min(1, "Description is required")
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  
  short_description: z.string()
    .min(1, "Short description is required")
    .min(5, "Short description must be at least 5 characters")
    .max(200, "Short description must be less than 200 characters"),
  
  base_price_cents: z.string()
    .min(1, "Price is required")
    .regex(/^\d+$/, "Price must be a valid number")
    .refine((val) => parseInt(val) >= 100, "Price must be at least $1.00")
    .refine((val) => parseInt(val) <= 5000000, "Price must be less than $50,000.00"),
  
  currency: z.string()
    .min(1, "Currency is required")
    .length(3, "Currency must be a 3-letter code (e.g., AUD, USD)")
    .regex(/^[A-Z]{3}$/, "Currency must be uppercase letters only"),
  
  duration_minutes: z.string()
    .min(1, "Duration is required")
    .regex(/^\d+$/, "Duration must be a valid number")
    .refine((val) => parseInt(val) >= 5, "Duration must be at least 5 minutes")
    .refine((val) => parseInt(val) <= 480, "Duration must be less than 8 hours"),
  
  category_id: z.string()
    .min(1, "Category is required"),
  
  is_active: z.boolean(),
  
  is_featured: z.boolean(),
  
  display_order: z.string()
    .regex(/^\d+$/, "Display order must be a valid number")
    .refine((val) => parseInt(val) >= 0, "Display order must be 0 or greater")
    .refine((val) => parseInt(val) <= 999, "Display order must be less than 1000"),
  
  image_url: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, "Image URL must be a valid URL")
})

type ServiceFormData = z.infer<typeof serviceSchema>

interface ServicesSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function ServicesSection({ activeSection }: ServicesSectionProps) {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  })
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC")

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      short_description: "",
      base_price_cents: "",
      currency: "AUD",
      duration_minutes: "30",
      category_id: "",
      is_active: true,
      is_featured: false,
      display_order: "0",
      image_url: ""
    }
  })

  // Load services and categories - always run hooks
  useEffect(() => {
    if (activeSection === "services") {
      loadData()
    }
  }, [activeSection])

  const loadData = async (page = pagination.currentPage, categoryFilter = selectedCategory) => {
    try {
      setLoading(true)
      
      // Build query parameters for server-side pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder
      })
      
      if (categoryFilter && categoryFilter !== "all") {
        params.append('category_id', categoryFilter)
      }
      
      const [servicesResponse, categoriesResponse] = await Promise.all([
        API.get(`/services?${params.toString()}`),
        API.get("/service-categories")
      ])
      
      const servicesData = servicesResponse.data.data || servicesResponse.data || {}
      
      if (servicesData.services && servicesData.pagination) {
        // Server-side paginated response
        setServices(servicesData.services)
        setPagination(servicesData.pagination)
      } else {
        // Fallback for legacy response format
        setServices(Array.isArray(servicesData) ? servicesData : [])
      }
      
      setCategories(categoriesResponse.data.data || categoriesResponse.data || [])
    } catch (error) {
      console.error("Error loading services:", error)
      toast.error(getErrorMessage(error, "Failed to load services"))
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingService(null)
    reset({
      name: "",
      description: "",
      short_description: "",
      base_price_cents: "",
      currency: "AUD",
      duration_minutes: "",
      category_id: "",
      is_active: true,
      is_featured: false,
      display_order: "0",
      image_url: ""
    })
    setShowDialog(true)
  }

  const openEditDialog = (service: Service) => {
    setEditingService(service)
    reset({
      name: service.name,
      description: service.description || "",
      short_description: service.short_description || "",
      base_price_cents: (service.base_price_cents || 0).toString(),
      currency: service.currency || "AUD",
      duration_minutes: (service.duration_minutes || 0).toString(),
      category_id: service.category_id?.toString() || "",
      is_active: service.is_active,
      is_featured: service.is_featured,
      display_order: (service.display_order || 0).toString(),
      image_url: service.image_url || ""
    })
    setShowDialog(true)
  }

  const onSubmit = async (data: ServiceFormData) => {
    try {
      setIsSubmitting(true)
      
      const serviceData = {
        name: data.name,
        description: data.description,
        short_description: data.short_description,
        base_price_cents: parseInt(data.base_price_cents) || null,
        currency: data.currency,
        duration_minutes: parseInt(data.duration_minutes) || null,
        category_id: data.category_id && data.category_id !== "none" ? parseInt(data.category_id) : null,
        is_active: data.is_active,
        is_featured: data.is_featured,
        display_order: parseInt(data.display_order) || 0,
        image_url: data.image_url || null
      }

      if (editingService) {
        await API.put(`/services/${editingService.id}`, serviceData)
        toast.success("Service updated successfully")
      } else {
        await API.post("/services", serviceData)
        toast.success("Service created successfully")
      }

      setShowDialog(false)
      loadData(pagination.currentPage)
    } catch (error: any) {
      console.error("Error saving service:", error)
      toast.error(getErrorMessage(error, "Failed to save service"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) return

    try {
      await API.delete(`/services/${service.id}`)
      toast.success("Service deleted successfully")
      loadData()
    } catch (error: any) {
      console.error("Error deleting service:", error)
      toast.error(getErrorMessage(error, "Failed to delete service"))
    }
  }

  // Handler functions for server-side filtering
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // Debounce search to avoid too many API calls
    setTimeout(() => {
      loadData(1) // Reset to page 1 when searching
    }, 500)
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    loadData(1, value) // Reset to page 1 when filtering, pass new category value directly
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    loadData(1) // Reset to page 1 when sorting
  }

  const handlePageChange = (page: number) => {
    loadData(page)
  }

  // Use services directly since filtering is done server-side
  const filteredServices = services

  const formatPrice = (cents: number | null) => {
    if (!cents) return "Not set"
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "Not set"
    return `${minutes} min`
  }

  return (
    <div className={`space-y-6 ${activeSection !== "services" ? "hidden" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Services Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your service offerings, pricing, and details
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search Services</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => loadData(pagination.currentPage)} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading services...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent" 
                      onClick={() => handleSort('name')}
                    >
                      Service {sortBy === 'name' && (sortOrder === 'ASC' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent" 
                      onClick={() => handleSort('is_active')}
                    >
                      Status {sortBy === 'is_active' && (sortOrder === 'ASC' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No services found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{service.name}</div>
                            {service.short_description && (
                              <div className="text-sm text-muted-foreground">
                                {service.short_description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {service.serviceCategory ? (
                            <Badge variant="secondary">{service.serviceCategory.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Uncategorized</span>
                          )}
                        </TableCell>
                        <TableCell>{formatPrice(service.base_price_cents)}</TableCell>
                        <TableCell>{formatDuration(service.duration_minutes)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {service.is_featured && (
                              <Badge variant="outline">Featured</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(service)}
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
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{" "}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{" "}
                {pagination.totalItems} services
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    const pageNumber = i + 1
                    return (
                      <Button
                        key={pageNumber}
                        variant={pagination.currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
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
        <DialogContent className="max-w-6xl w-[98vw] h-[98vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingService ? "Edit Service" : "Create New Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-4 pr-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g., Haircut & Styling"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Category *</Label>
                <Select value={watch("category_id")} onValueChange={(value) => setValue("category_id", value)}>
                  <SelectTrigger className={errors.category_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="none">No category</SelectItem> */}
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-sm text-red-500">{errors.category_id.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_description">Short Description *</Label>
              <Input
                id="short_description"
                {...register("short_description")}
                placeholder="Brief description for listings"
                className={errors.short_description ? "border-red-500" : ""}
              />
              {errors.short_description && (
                <p className="text-sm text-red-500">{errors.short_description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full Description *</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Detailed service description"
                rows={3}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="base_price_cents">Base Price (cents) *</Label>
                <Input
                  id="base_price_cents"
                  type="number"
                  {...register("base_price_cents")}
                  placeholder="e.g., 3500 for $35.00"
                  className={errors.base_price_cents ? "border-red-500" : ""}
                />
                {errors.base_price_cents && (
                  <p className="text-sm text-red-500">{errors.base_price_cents.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Input
                  id="currency"
                  {...register("currency")}
                  placeholder="AUD"
                  className={errors.currency ? "border-red-500" : ""}
                  maxLength={3}
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.currency && (
                  <p className="text-sm text-red-500">{errors.currency.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  {...register("duration_minutes")}
                  placeholder="e.g., 45"
                  className={errors.duration_minutes ? "border-red-500" : ""}
                />
                {errors.duration_minutes && (
                  <p className="text-sm text-red-500">{errors.duration_minutes.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order *</Label>
                <Input
                  id="display_order"
                  type="number"
                  {...register("display_order")}
                  placeholder="0"
                  className={errors.display_order ? "border-red-500" : ""}
                />
                {errors.display_order && (
                  <p className="text-sm text-red-500">{errors.display_order.message}</p>
                )}
              </div>
            </div>

            {/* Full-width Image Upload */}
            <FormImageUpload
              label="Service Image"
              value={watch("image_url")}
              onChange={(url) => setValue("image_url", url)}
              onError={(error) => {
                if (error) {
                  // Set manual validation error for image_url field
                  // Note: This integrates with the existing zod validation
                } else {
                  // Clear any validation errors
                }
              }}
              placeholder="Upload service image or enter URL"
              uploadType="service"
              maxSizeKB={5120}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className={errors.image_url ? "border-red-500" : ""}
            />
            {errors.image_url && (
              <p className="text-sm text-red-500">{errors.image_url.message}</p>
            )}

            {/* Settings checkboxes */}
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={watch("is_active")}
                  onCheckedChange={(checked) => setValue("is_active", checked as boolean)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_featured"
                  checked={watch("is_featured")}
                  onCheckedChange={(checked) => setValue("is_featured", checked as boolean)}
                />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
            </div>


            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (editingService ? "Update" : "Create")}
              </Button>
            </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}