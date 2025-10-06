"use client"

import React, { useEffect, useState } from "react"
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
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Search, RefreshCw, Wrench, Tag, CreditCard, ChevronUp, ChevronDown, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import { getErrorMessage } from "@/lib/error-utils"
import { FormImageUpload } from "@/components/ui/form-image-upload"
import { FormGalleryUpload } from "@/components/ui/form-gallery-upload"

// Types
interface ServiceCategory {
  id: number
  name: string
  description: string
  slug: string
  display_order: number
  is_active: boolean
  icon: string
  color_theme: string
  seo_title: string
  seo_description: string
  created_at: string
  updated_at: string
  services?: Service[]
}

interface Service {
  id: number
  name: string
  description?: string
  short_description?: string
  base_price_cents: number
  duration_minutes: number
  category_id: number
  is_active: boolean
  is_featured: boolean
  display_order: number
  image_url?: string
  gallery_images?: string[]
  booking_settings?: {
    advance_booking_days?: number
    cancellation_hours?: number
    buffer_time_minutes?: number
    requires_deposit?: boolean
  }
  seo_title?: string
  seo_description?: string
  serviceCategory?: ServiceCategory
  created_at: string
  updated_at: string
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

// Validation Schemas
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(255),
  description: z.string().optional().or(z.literal("")),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug format invalid"),
  display_order: z.number().min(0),
  is_active: z.boolean(),
  icon: z.string().optional().or(z.literal("")),
  color_theme: z.string().optional().or(z.literal("")),
  seo_title: z.string().optional().or(z.literal("")),
  seo_description: z.string().optional().or(z.literal(""))
})

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required").max(255),
  description: z.string().optional().or(z.literal("")),
  short_description: z.string().optional().or(z.literal("")).refine(
    (val) => !val || val.length <= 500, 
    "Short description must be 500 characters or less"
  ),
  base_price_cents: z.number().min(0, "Price must be positive"),
  duration_minutes: z.number().min(1, "Duration must be at least 1 minute"),
  category_id: z.number().min(1, "Category is required"),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  display_order: z.number().min(0),
  image_url: z.string().optional().or(z.literal("")),
  gallery_images: z.array(z.string()).optional(),
  booking_settings: z.object({
    advance_booking_days: z.number().min(0).optional(),
    cancellation_hours: z.number().min(0).optional(),
    buffer_time_minutes: z.number().min(0).optional(),
    requires_deposit: z.boolean().optional()
  }).optional(),
  seo_title: z.string().optional().or(z.literal("")).refine(
    (val) => !val || val.length <= 255,
    "SEO title must be 255 characters or less"
  ),
  seo_description: z.string().optional().or(z.literal(""))
})

const pricingSchema = z.object({
  service_id: z.number().min(1, "Service is required"),
  team_member_id: z.number().min(1, "Team member is required"),
  price_cents: z.number().min(0, "Price must be positive"),
  duration_override: z.number().min(1).optional().or(z.literal("")),
  is_available: z.boolean(),
  special_notes: z.string().optional().or(z.literal("")),
  effective_from: z.string().min(1, "Effective date is required"),
  effective_until: z.string().optional().or(z.literal(""))
})

type CategoryFormData = z.infer<typeof categorySchema>
type ServiceFormData = z.infer<typeof serviceSchema>
type PricingFormData = z.infer<typeof pricingSchema>

interface ServicesManagementSectionProps {
  activeSection: string
  onSectionChange?: (section: string) => void
}

// Constants
const DEFAULT_COLOR = '#6366f1'
const TABS = {
  CATEGORIES: 'categories',
  SERVICES: 'services',
  PRICING: 'pricing'
}

function ServicesManagementSection({ activeSection }: ServicesManagementSectionProps) {
  // State
  const [activeTab, setActiveTab] = useState(TABS.CATEGORIES)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [pricing, setPricing] = useState<ServicePricing[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // General pagination and sorting state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Categories state
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  
  // Services state
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [formResetKey, setFormResetKey] = useState(0)
  
  // Pricing state
  const [editingPricing, setEditingPricing] = useState<ServicePricing | null>(null)
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>('all')

  // Forms
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      slug: "",
      display_order: 0,
      is_active: true,
      icon: "",
      color_theme: "",
      seo_title: "",
      seo_description: ""
    }
  })

  const serviceForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      short_description: "",
      base_price_cents: 0,
      duration_minutes: 30,
      category_id: 0,
      is_active: true,
      is_featured: false,
      display_order: 0,
      image_url: "",
      gallery_images: [],
      booking_settings: {
        advance_booking_days: 7,
        cancellation_hours: 24,
        buffer_time_minutes: 15,
        requires_deposit: false
      },
      seo_title: "",
      seo_description: ""
    }
  })

  const pricingForm = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      service_id: 0,
      team_member_id: 0,
      price_cents: 0,
      duration_override: "",
      is_available: true,
      special_notes: "",
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: ""
    }
  })

  // Data fetching
  const fetchCategories = async () => {
    try {
      const response = await API.get('/service-categories')
      const data = response?.data?.data || response?.data || []
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to fetch categories')
    }
  }

  const fetchServices = async () => {
    try {
      const response = await API.get('/services')
      const data = response?.data?.data || response?.data || []
      setServices(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to fetch services')
    }
  }

  const fetchPricing = async () => {
    try {
      const response = await API.get('/service-pricing')
      console.log('🔍 Service Pricing Full Response:', JSON.stringify(response, null, 2))
      
      // Handle the actual API response structure
      let data = []
      if (response?.data?.data?.service_pricing) {
        // Paginated response format: { data: { service_pricing: [...], pagination: {...} } }
        data = response.data.data.service_pricing
      } else if (response?.data?.service_pricing) {
        // Direct service_pricing format: { service_pricing: [...], pagination: {...} }
        data = response.data.service_pricing
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        // ApiResponse format: { data: [...], status_code: 200, message: "..." }
        data = response.data.data
      } else if (Array.isArray(response?.data)) {
        // Direct array response
        data = response.data
      }
      
      console.log('🔍 Service Pricing Extracted Data:', { 
        data, 
        isArray: Array.isArray(data), 
        length: Array.isArray(data) ? data.length : 'not an array',
        responseStructure: {
          hasResponseData: !!response?.data,
          responseDataKeys: response?.data ? Object.keys(response.data) : [],
          responseDataType: typeof response?.data,
          responseDataData: response?.data?.data ? 'has nested data' : 'no nested data'
        }
      })
      
      if (!Array.isArray(data)) {
        console.error('🚨 Pricing data is not an array:', data)
        setPricing([])
        return
      }
      
      console.log('🎯 Setting pricing data:', data.length, 'items')
      setPricing(data)
    } catch (error) {
      console.error('Error fetching pricing:', error)
      toast.error('Failed to fetch pricing')
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await API.get('/team-members')
      const data = response?.data?.data || response?.data || []
      setTeamMembers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to fetch team members')
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchCategories(),
        fetchServices(),
        fetchPricing(),
        fetchTeamMembers()
      ])
    } finally {
      setLoading(false)
    }
  }

  // Effects
  useEffect(() => {
    if (activeSection === "services-management") {
      fetchAllData()
    }
  }, [activeSection])

  // Auto-generate slug from category name
  const categoryNameValue = categoryForm.watch("name")
  useEffect(() => {
    if (!editingCategory && categoryNameValue) {
      const slug = categoryNameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
      categoryForm.setValue("slug", slug)
    }
  }, [categoryNameValue, editingCategory, categoryForm])

  // Reset pagination when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm, statusFilter, categoryFilter, availabilityFilter, teamMemberFilter, sortField, sortDirection])

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort icon component
  const SortIcon = ({ field }: { field: string }) => {
    const isActive = sortField === field
    if (!isActive) return (
      <div className="flex flex-col opacity-40 group-hover:opacity-60 transition-opacity">
        <ChevronUp className="h-3 w-3 -mb-0.5" />
        <ChevronDown className="h-3 w-3" />
      </div>
    )
    return (
      <div className="flex items-center">
        {sortDirection === 'asc' ? 
          <ChevronUp className="h-4 w-4 text-primary font-bold" /> : 
          <ChevronDown className="h-4 w-4 text-primary font-bold" />}
      </div>
    )
  }

  // Utility functions
  const getColorWithFallback = (color: string | null | undefined) => {
    return color && color.trim() ? color : DEFAULT_COLOR
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  // Category handlers
  const handleCreateCategory = () => {
    setEditingCategory(null)
    categoryForm.reset()
    setIsDialogOpen(true)
  }

  const handleEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category)
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      display_order: category.display_order,
      is_active: category.is_active,
      icon: category.icon || "",
      color_theme: category.color_theme || "",
      seo_title: category.seo_title || "",
      seo_description: category.seo_description || ""
    })
    setIsDialogOpen(true)
  }

  const handleDeleteCategory = async (category: ServiceCategory) => {
    if (!confirm(`Delete "${category.name}"? This action cannot be undone.`)) return
    
    try {
      await API.delete(`/service-categories/${category.id}`)
      toast.success("Category deleted")
      fetchCategories()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onSubmitCategory = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await API.put(`/service-categories/${editingCategory.id}`, data)
        toast.success("Category updated")
      } else {
        await API.post('/service-categories', data)
        toast.success("Category created")
      }
      setIsDialogOpen(false)
      fetchCategories()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  // Service handlers
  const handleCreateService = () => {
    setEditingService(null)
    setFormResetKey(prev => prev + 1)
    serviceForm.reset({
      name: "",
      description: "",
      short_description: "",
      base_price_cents: 0,
      duration_minutes: 30,
      category_id: 0,
      is_active: true,
      is_featured: false,
      display_order: 0,
      image_url: "",
      gallery_images: [],
      booking_settings: {
        advance_booking_days: 7,
        cancellation_hours: 24,
        buffer_time_minutes: 15,
        requires_deposit: false
      },
      seo_title: "",
      seo_description: ""
    })
    setIsDialogOpen(true)
  }

  const handleCloseServiceDialog = () => {
    setIsDialogOpen(false)
    setEditingService(null)
    setFormResetKey(prev => prev + 1)
    serviceForm.reset({
      name: "",
      description: "",
      short_description: "",
      base_price_cents: 0,
      duration_minutes: 30,
      category_id: 0,
      is_active: true,
      is_featured: false,
      display_order: 0,
      image_url: "",
      gallery_images: [],
      booking_settings: {
        advance_booking_days: 7,
        cancellation_hours: 24,
        buffer_time_minutes: 15,
        requires_deposit: false
      },
      seo_title: "",
      seo_description: ""
    })
  }

  const handleEditService = (service: Service) => {
    console.log('🔍 Service data received:', {
      id: service.id,
      name: service.name,
      short_description: service.short_description,
      seo_title: service.seo_title,
      seo_description: service.seo_description,
      gallery_images: service.gallery_images,
      booking_settings: service.booking_settings,
      base_price_cents: service.base_price_cents,
      price_in_dollars: service.base_price_cents / 100
    })
    setEditingService(service)
    serviceForm.reset({
      name: service.name,
      description: service.description || "",
      short_description: service.short_description || "",
      base_price_cents: service.base_price_cents / 100, // Convert cents to dollars for display
      duration_minutes: service.duration_minutes,
      category_id: service.category_id,
      is_active: service.is_active,
      is_featured: service.is_featured,
      display_order: service.display_order,
      image_url: service.image_url || "",
      gallery_images: Array.isArray(service.gallery_images) ? service.gallery_images : [],
      booking_settings: typeof service.booking_settings === 'object' && service.booking_settings ? {
        advance_booking_days: service.booking_settings.advance_booking_days || 7,
        cancellation_hours: service.booking_settings.cancellation_hours || 24,
        buffer_time_minutes: service.booking_settings.buffer_time_minutes || 15,
        requires_deposit: service.booking_settings.requires_deposit || false
      } : {
        advance_booking_days: 7,
        cancellation_hours: 24,
        buffer_time_minutes: 15,
        requires_deposit: false
      },
      seo_title: service.seo_title || "",
      seo_description: service.seo_description || ""
    })
    setIsDialogOpen(true)
  }

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Delete "${service.name}"? This action cannot be undone.`)) return
    
    try {
      await API.delete(`/services/${service.id}`)
      toast.success("Service deleted")
      fetchServices()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onSubmitService = async (data: ServiceFormData) => {
    try {
      console.log('🚀 Form data being submitted:', {
        ...data,
        base_price_cents: data.base_price_cents,
        action: editingService ? 'UPDATE' : 'CREATE'
      })
      
      if (editingService) {
        await API.put(`/services/${editingService.id}`, data)
        toast.success("Service updated")
      } else {
        await API.post('/services', data)
        toast.success("Service created")
      }
      handleCloseServiceDialog()
      fetchServices()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  // Pricing handlers
  const handleCreatePricing = () => {
    setEditingPricing(null)
    pricingForm.reset()
    setIsDialogOpen(true)
  }

  const handleEditPricing = (pricing: ServicePricing) => {
    setEditingPricing(pricing)
    pricingForm.reset({
      service_id: pricing.service_id,
      team_member_id: pricing.team_member_id,
      price_cents: pricing.price_cents / 100, // Convert cents to dollars for display
      duration_override: pricing.duration_override || "",
      is_available: pricing.is_available,
      special_notes: pricing.special_notes || "",
      effective_from: pricing.effective_from.split('T')[0],
      effective_until: pricing.effective_until ? pricing.effective_until.split('T')[0] : ""
    })
    setIsDialogOpen(true)
  }

  const handleDeletePricing = async (pricing: ServicePricing) => {
    if (!confirm("Delete this pricing rule? This action cannot be undone.")) return
    
    try {
      await API.delete(`/service-pricing/${pricing.id}`)
      toast.success("Pricing deleted")
      fetchPricing()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onSubmitPricing = async (data: PricingFormData) => {
    try {
      const formattedData = {
        ...data,
        duration_override: data.duration_override ? Number(data.duration_override) : null,
        effective_until: data.effective_until || null
      }

      if (editingPricing) {
        await API.put(`/service-pricing/${editingPricing.id}`, formattedData)
        toast.success("Pricing updated")
      } else {
        await API.post('/service-pricing', formattedData)
        toast.success("Pricing created")
      }
      setIsDialogOpen(false)
      fetchPricing()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  // Sorting function
  const sortData = <T,>(data: T[], field: string, direction: 'asc' | 'desc'): T[] => {
    return [...data].sort((a, b) => {
      let aVal = field.includes('.') ? field.split('.').reduce((obj: any, key) => obj?.[key], a) : (a as any)[field]
      let bVal = field.includes('.') ? field.split('.').reduce((obj: any, key) => obj?.[key], b) : (b as any)[field]
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return direction === 'asc' ? 1 : -1
      if (bVal == null) return direction === 'asc' ? -1 : 1
      
      // Convert to string for comparison if needed
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  }

  // Advanced filtering for categories
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && category.is_active) ||
                         (statusFilter === 'inactive' && !category.is_active)
    return matchesSearch && matchesStatus
  })

  // Advanced filtering for services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && service.is_active) ||
                         (statusFilter === 'inactive' && !service.is_active)
    const matchesCategory = categoryFilter === 'all' || service.category_id.toString() === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Advanced filtering for pricing
  const filteredPricing = pricing.filter(p => {
    const matchesSearch = p.service?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${p.teamMember?.first_name} ${p.teamMember?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAvailability = availabilityFilter === 'all' ||
                               (availabilityFilter === 'available' && p.is_available) ||
                               (availabilityFilter === 'unavailable' && !p.is_available)
    const matchesTeamMember = teamMemberFilter === 'all' || p.team_member_id.toString() === teamMemberFilter
    return matchesSearch && matchesAvailability && matchesTeamMember
  })

  // Always log pricing data for debugging
  console.log('🔍 Pricing Debug (Always On):', {
    rawPricing: pricing,
    rawPricingCount: pricing.length,
    filteredPricingCount: filteredPricing.length,
    firstRawItem: pricing[0] || 'none',
    firstFilteredItem: filteredPricing[0] || 'none'
  })

  // Sorted data
  const sortedCategories = sortData(filteredCategories, sortField, sortDirection)
  const sortedServices = sortData(filteredServices, sortField, sortDirection)
  const sortedPricing = sortData(filteredPricing, sortField, sortDirection)

  // Debug logging for pricing data
  console.log('🔍 Pricing Data Debug:', {
    rawPricingLength: pricing.length,
    filteredPricingLength: filteredPricing.length,
    sortedPricingLength: sortedPricing.length,
    activeTab,
    searchTerm,
    availabilityFilter,
    teamMemberFilter,
    sortField,
    sortDirection,
    samplePricingItem: pricing[0] || null
  })

  // Pagination calculations
  const getCurrentPageData = <T,>(data: T[]) => {
    const total = data.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const currentPageData = data.slice(startIndex, startIndex + pageSize)
    return { currentPageData, total, totalPages, startIndex }
  }

  const categoriesPage = getCurrentPageData(sortedCategories)
  const servicesPage = getCurrentPageData(sortedServices)
  const pricingPage = getCurrentPageData(sortedPricing)

  // Additional pagination debug for pricing
  if (activeTab === TABS.PRICING) {
    console.log('🔍 Pricing Pagination Debug:', {
      currentPage,
      pageSize,
      totalPricingItems: pricingPage.total,
      totalPages: pricingPage.totalPages,
      currentPageDataLength: pricingPage.currentPageData.length,
      startIndex: pricingPage.startIndex,
      sampleCurrentPageItem: pricingPage.currentPageData[0] || null
    })
  }

  if (activeSection !== "services-management") return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wrench className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Services Management</h2>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value={TABS.CATEGORIES} className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categories ({categories.length})
            </TabsTrigger>
            <TabsTrigger value={TABS.SERVICES} className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Services ({services.length})
            </TabsTrigger>
            <TabsTrigger value={TABS.PRICING} className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pricing ({pricing.length})
            </TabsTrigger>
          </TabsList>

          {/* Search and Controls */}
          <div className="space-y-4 my-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" onClick={fetchAllData} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={() => {
                  if (activeTab === TABS.CATEGORIES) handleCreateCategory()
                  else if (activeTab === TABS.SERVICES) handleCreateService()
                  else if (activeTab === TABS.PRICING) handleCreatePricing()
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add {activeTab === TABS.CATEGORIES ? 'Category' : activeTab === TABS.SERVICES ? 'Service' : 'Pricing'}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activeTab === TABS.SERVICES && (
                    <div>
                      <Label className="text-sm font-medium">Category</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {activeTab === TABS.PRICING && (
                    <>
                      <div>
                        <Label className="text-sm font-medium">Availability</Label>
                        <Select value={availabilityFilter} onValueChange={(value: 'all' | 'available' | 'unavailable') => setAvailabilityFilter(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Team Member</Label>
                        <Select value={teamMemberFilter} onValueChange={setTeamMemberFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            {teamMembers.map(member => (
                              <SelectItem key={member.id} value={member.id.toString()}>
                                {member.first_name} {member.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Page Size</Label>
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 per page</SelectItem>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="20">20 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Categories Tab */}
          <TabsContent value={TABS.CATEGORIES}>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'name' ? 'text-primary' : ''}`}>Name</span>
                        <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('display_order')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'display_order' ? 'text-primary' : ''}`}>Order</span>
                        <SortIcon field="display_order" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('is_active')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'is_active' ? 'text-primary' : ''}`}>Status</span>
                        <SortIcon field="is_active" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesPage.currentPageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {searchTerm || statusFilter !== 'all' ? 'No categories match your filters.' : 'No categories found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoriesPage.currentPageData.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full border border-gray-200"
                              style={{ backgroundColor: getColorWithFallback(category.color_theme) }}
                            />
                            {category.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">
                            {category.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {category.services?.length || 0} services
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{category.display_order}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Categories Pagination */}
            {categoriesPage.total > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {categoriesPage.startIndex + 1} to {Math.min(categoriesPage.startIndex + pageSize, categoriesPage.total)} of {categoriesPage.total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{currentPage} of {categoriesPage.totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(categoriesPage.totalPages, currentPage + 1))}
                    disabled={currentPage === categoriesPage.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value={TABS.SERVICES}>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'name' ? 'text-primary' : ''}`}>Name</span>
                        <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('serviceCategory.name')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'serviceCategory.name' ? 'text-primary' : ''}`}>Category</span>
                        <SortIcon field="serviceCategory.name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('base_price_cents')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'base_price_cents' ? 'text-primary' : ''}`}>Price</span>
                        <SortIcon field="base_price_cents" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('duration_minutes')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'duration_minutes' ? 'text-primary' : ''}`}>Duration</span>
                        <SortIcon field="duration_minutes" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('is_active')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'is_active' ? 'text-primary' : ''}`}>Status</span>
                        <SortIcon field="is_active" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicesPage.currentPageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' ? 'No services match your filters.' : 'No services found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    servicesPage.currentPageData.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {service.image_url && (
                              <img src={service.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                            )}
                            <div>
                              {service.name}
                              {service.is_featured && (
                                <Badge variant="secondary" className="ml-2 text-xs">Featured</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {service.serviceCategory?.name || 'No category'}
                        </TableCell>
                        <TableCell>{formatPrice(service.base_price_cents)}</TableCell>
                        <TableCell>{service.duration_minutes} min</TableCell>
                        <TableCell>
                          <Badge variant={service.is_active ? "default" : "secondary"}>
                            {service.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditService(service)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteService(service)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Services Pagination */}
            {servicesPage.total > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {servicesPage.startIndex + 1} to {Math.min(servicesPage.startIndex + pageSize, servicesPage.total)} of {servicesPage.total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{currentPage} of {servicesPage.totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(servicesPage.totalPages, currentPage + 1))}
                    disabled={currentPage === servicesPage.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value={TABS.PRICING}>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('service.name')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'service.name' ? 'text-primary' : ''}`}>Service</span>
                        <SortIcon field="service.name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('teamMember.first_name')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'teamMember.first_name' ? 'text-primary' : ''}`}>Team Member</span>
                        <SortIcon field="teamMember.first_name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('price_cents')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'price_cents' ? 'text-primary' : ''}`}>Price</span>
                        <SortIcon field="price_cents" />
                      </div>
                    </TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('is_available')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'is_available' ? 'text-primary' : ''}`}>Available</span>
                        <SortIcon field="is_available" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 group transition-colors" 
                      onClick={() => handleSort('effective_from')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${sortField === 'effective_from' ? 'text-primary' : ''}`}>Effective</span>
                        <SortIcon field="effective_from" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingPage.currentPageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <CreditCard className="h-8 w-8 text-muted-foreground" />
                          <div className="text-sm text-muted-foreground">
                            {searchTerm || availabilityFilter !== 'all' || teamMemberFilter !== 'all' ? 
                              'No pricing rules match your filters.' : 
                              'No pricing rules found. Create your first pricing rule to get started.'}
                          </div>
                          {!(searchTerm || availabilityFilter !== 'all' || teamMemberFilter !== 'all') && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleCreatePricing}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Pricing Rule
                            </Button>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            Total pricing records: {pricing.length}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pricingPage.currentPageData.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.service?.name || 'Unknown Service'}</TableCell>
                        <TableCell>
                          {p.teamMember ? `${p.teamMember.first_name} ${p.teamMember.last_name}` : 'Unknown Member'}
                        </TableCell>
                        <TableCell>{formatPrice(p.price_cents)}</TableCell>
                        <TableCell>
                          {p.duration_override ? `${p.duration_override} min` : 'Default'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.is_available ? "default" : "secondary"}>
                            {p.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          From: {new Date(p.effective_from).toLocaleDateString()}
                          {p.effective_until && (
                            <div>Until: {new Date(p.effective_until).toLocaleDateString()}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditPricing(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePricing(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pricing Pagination */}
            {pricingPage.total > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {pricingPage.startIndex + 1} to {Math.min(pricingPage.startIndex + pageSize, pricingPage.total)} of {pricingPage.total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{currentPage} of {pricingPage.totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(pricingPage.totalPages, currentPage + 1))}
                    disabled={currentPage === pricingPage.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {/* Category Dialog */}
        <Dialog open={isDialogOpen && activeTab === TABS.CATEGORIES} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create Category"}
              </DialogTitle>
            </DialogHeader>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_name">Name</Label>
                  <Input id="category_name" {...categoryForm.register("name")} />
                  {categoryForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="category_slug">Slug</Label>
                  <Input id="category_slug" {...categoryForm.register("slug")} />
                  {categoryForm.formState.errors.slug && (
                    <p className="text-sm text-destructive">{categoryForm.formState.errors.slug.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="category_description">Description</Label>
                <Textarea id="category_description" {...categoryForm.register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_order">Display Order</Label>
                  <Input 
                    id="category_order" 
                    type="number" 
                    {...categoryForm.register("display_order", { valueAsNumber: true })} 
                  />
                </div>
                <div>
                  <Label htmlFor="category_color">Color Theme</Label>
                  <Input id="category_color" {...categoryForm.register("color_theme")} placeholder="#FF5733" />
                </div>
              </div>
              <FormField
                control={categoryForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Active
                    </FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={categoryForm.formState.isSubmitting}>
                  {categoryForm.formState.isSubmitting ? "Saving..." : editingCategory ? "Update" : "Create"}
                </Button>
              </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Service Dialog */}
        <Dialog 
          key={editingService?.id || 'new-service'}
          open={isDialogOpen && activeTab === TABS.SERVICES} 
          onOpenChange={(open) => {
            if (!open) {
              handleCloseServiceDialog()
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Create Service"}
              </DialogTitle>
            </DialogHeader>
            <Form {...serviceForm}>
              <form 
                key={editingService?.id || 'new-service-form'}
                onSubmit={serviceForm.handleSubmit(onSubmitService)} 
                className="space-y-6 max-h-[80vh] overflow-y-auto"
              >
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div>
                  <Label htmlFor="service_name">Name *</Label>
                  <Input id="service_name" {...serviceForm.register("name")} />
                  {serviceForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{serviceForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="service_category">Category *</Label>
                  <Select 
                    value={serviceForm.watch("category_id")?.toString() || ""} 
                    onValueChange={(value) => serviceForm.setValue("category_id", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {serviceForm.formState.errors.category_id && (
                    <p className="text-sm text-destructive">{serviceForm.formState.errors.category_id.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="service_short_description">Short Description</Label>
                  <Textarea 
                    id="service_short_description" 
                    placeholder="Brief description for cards and listings (max 500 characters)"
                    {...serviceForm.register("short_description")} 
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    {serviceForm.watch("short_description")?.length || 0}/500 characters
                  </p>
                  {serviceForm.formState.errors.short_description && (
                    <p className="text-sm text-destructive">{serviceForm.formState.errors.short_description.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="service_description">Full Description</Label>
                  <Textarea 
                    id="service_description" 
                    placeholder="Complete service description"
                    {...serviceForm.register("description")} 
                    rows={4}
                  />
                </div>
              </div>

              {/* Pricing & Duration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing & Duration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="service_price">Base Price ($) *</Label>
                    <Input 
                      id="service_price" 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      {...serviceForm.register("base_price_cents", { 
                        setValueAs: (v) => Math.round(parseFloat(v || "0") * 100)
                      })} 
                    />
                    {serviceForm.formState.errors.base_price_cents && (
                      <p className="text-sm text-destructive">{serviceForm.formState.errors.base_price_cents.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="service_duration">Duration (minutes) *</Label>
                    <Input 
                      id="service_duration" 
                      type="number" 
                      placeholder="30"
                      {...serviceForm.register("duration_minutes", { valueAsNumber: true })} 
                    />
                    {serviceForm.formState.errors.duration_minutes && (
                      <p className="text-sm text-destructive">{serviceForm.formState.errors.duration_minutes.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Media</h3>
                
                <FormImageUpload
                  key={`main-image-${formResetKey}`}
                  label="Main Service Image"
                  value={serviceForm.watch("image_url")}
                  onChange={(url) => serviceForm.setValue("image_url", url)}
                  onError={(error) => {
                    if (error) {
                      serviceForm.setError("image_url", { message: error })
                    } else {
                      serviceForm.clearErrors("image_url")
                    }
                  }}
                  placeholder="Upload service image or enter URL"
                  uploadType="service"
                  maxSizeKB={5120}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                />
                
                <FormGalleryUpload
                  key={`gallery-images-${formResetKey}`}
                  label="Gallery Images"
                  value={serviceForm.watch("gallery_images")}
                  onChange={(urls) => serviceForm.setValue("gallery_images", urls)}
                  onError={(error) => {
                    if (error) {
                      serviceForm.setError("gallery_images", { message: error })
                    } else {
                      serviceForm.clearErrors("gallery_images")
                    }
                  }}
                  placeholder="Upload gallery images or enter URLs"
                  uploadType="gallery"
                  maxFiles={10}
                  maxSizeKB={5120}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                />
              </div>

              {/* Booking Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Booking Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="advance_booking">Advance Booking (days)</Label>
                    <Input 
                      id="advance_booking" 
                      type="number" 
                      min="0"
                      placeholder="7"
                      {...serviceForm.register("booking_settings.advance_booking_days", { valueAsNumber: true })} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="cancellation_hours">Cancellation Notice (hours)</Label>
                    <Input 
                      id="cancellation_hours" 
                      type="number" 
                      min="0"
                      placeholder="24"
                      {...serviceForm.register("booking_settings.cancellation_hours", { valueAsNumber: true })} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buffer_time">Buffer Time (minutes)</Label>
                    <Input 
                      id="buffer_time" 
                      type="number" 
                      min="0"
                      placeholder="15"
                      {...serviceForm.register("booking_settings.buffer_time_minutes", { valueAsNumber: true })} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input 
                      id="display_order" 
                      type="number" 
                      min="0"
                      placeholder="0"
                      {...serviceForm.register("display_order", { valueAsNumber: true })} 
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="requires_deposit" 
                    {...serviceForm.register("booking_settings.requires_deposit")} 
                  />
                  <Label htmlFor="requires_deposit">Requires Deposit</Label>
                </div>
              </div>

              {/* SEO Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">SEO Settings</h3>
                
                <div>
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input 
                    id="seo_title" 
                    placeholder="Service name - Your Business"
                    {...serviceForm.register("seo_title")} 
                  />
                  <p className="text-xs text-muted-foreground">
                    {serviceForm.watch("seo_title")?.length || 0}/255 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo_description">SEO Description</Label>
                  <Textarea 
                    id="seo_description" 
                    placeholder="Description for search engines"
                    {...serviceForm.register("seo_description")} 
                    rows={3}
                  />
                </div>
              </div>

              {/* Status & Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Status & Features</h3>
                
                <div className="flex items-center space-x-6">
                  <FormField
                    control={serviceForm.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Active
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={serviceForm.control}
                    name="is_featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Featured on Homepage
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseServiceDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={serviceForm.formState.isSubmitting}>
                  {serviceForm.formState.isSubmitting ? "Saving..." : editingService ? "Update Service" : "Create Service"}
                </Button>
              </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Pricing Dialog */}
        <Dialog open={isDialogOpen && activeTab === TABS.PRICING} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPricing ? "Edit Pricing" : "Create Pricing"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={pricingForm.handleSubmit(onSubmitPricing)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricing_service">Service</Label>
                  <Select 
                    value={pricingForm.watch("service_id")?.toString() || ""} 
                    onValueChange={(value) => pricingForm.setValue("service_id", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pricingForm.formState.errors.service_id && (
                    <p className="text-sm text-destructive">{pricingForm.formState.errors.service_id.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pricing_member">Team Member</Label>
                  <Select 
                    value={pricingForm.watch("team_member_id")?.toString() || ""} 
                    onValueChange={(value) => pricingForm.setValue("team_member_id", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pricingForm.formState.errors.team_member_id && (
                    <p className="text-sm text-destructive">{pricingForm.formState.errors.team_member_id.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricing_price">Price ($)</Label>
                  <Input 
                    id="pricing_price" 
                    type="number" 
                    step="0.01"
                    {...pricingForm.register("price_cents", { 
                      setValueAs: (v) => Math.round(parseFloat(v || "0") * 100)
                    })} 
                  />
                  {pricingForm.formState.errors.price_cents && (
                    <p className="text-sm text-destructive">{pricingForm.formState.errors.price_cents.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pricing_duration">Duration Override (minutes)</Label>
                  <Input 
                    id="pricing_duration" 
                    type="number" 
                    {...pricingForm.register("duration_override")} 
                    placeholder="Leave empty for default"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricing_from">Effective From</Label>
                  <Input id="pricing_from" type="date" {...pricingForm.register("effective_from")} />
                  {pricingForm.formState.errors.effective_from && (
                    <p className="text-sm text-destructive">{pricingForm.formState.errors.effective_from.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pricing_until">Effective Until (optional)</Label>
                  <Input id="pricing_until" type="date" {...pricingForm.register("effective_until")} />
                </div>
              </div>
              <div>
                <Label htmlFor="pricing_notes">Special Notes</Label>
                <Textarea id="pricing_notes" {...pricingForm.register("special_notes")} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pricing_available"
                  checked={pricingForm.watch("is_available")}
                  onCheckedChange={(checked) => pricingForm.setValue("is_available", checked as boolean)}
                />
                <Label htmlFor="pricing_available">Available</Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pricingForm.formState.isSubmitting}>
                  {pricingForm.formState.isSubmitting ? "Saving..." : editingPricing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export { ServicesManagementSection }