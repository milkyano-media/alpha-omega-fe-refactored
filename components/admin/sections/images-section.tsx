"use client"

import { useEffect, useState, useCallback } from "react"
import { API } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Trash2, Search, RefreshCw, Image as ImageIcon, Eye } from "lucide-react"
import toast from "react-hot-toast"
import { getErrorMessage } from "@/lib/error-utils"

// Helper function to convert relative URLs to absolute URLs
const getImageUrl = (url: string) => {
  if (!url) return ""
  if (url.startsWith("http")) return url
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  return `${baseUrl.replace("/api", "")}${url}`
}

interface UploadedImage {
  id: number
  type: "profile" | "branding" | "gallery"
  url: string
  thumbnailUrl?: string
  originalName: string
  size: number
  uploadedAt: string
  associatedId?: number // For profile images, this is teamMemberId
}

interface ImagesData {
  images: UploadedImage[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
}

interface ImagesSectionProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function ImagesSection({ activeSection }: ImagesSectionProps) {
  const [imagesData, setImagesData] = useState<ImagesData>({
    images: [],
    pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 }
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploadType, setUploadType] = useState<"gallery" | "branding">("gallery")
  const [brandingType, setBrandingType] = useState("")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<{ id: number; type: string } | null>(null)

  const loadImages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        ...(filterType !== "all" && { type: filterType }),
        ...(debouncedSearchTerm.trim() && { search: debouncedSearchTerm.trim() })
      })
      
      const response = await API.get(`/images?${params}`)
      console.log("API Response:", response)
      if (response.data) {
        // Map backend response to frontend structure
        setImagesData({
          images: response.data.images || [],
          pagination: {
            currentPage: response.data.currentPage || 1,
            totalPages: response.data.totalPages || 1,
            totalItems: response.data.totalCount || 0,
            itemsPerPage: 20
          }
        })
      }
    } catch (error) {
      console.error("Failed to load images:", error)
      toast.error(getErrorMessage(error, "Failed to load images"))
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterType, debouncedSearchTerm])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      // Reset to first page when searching
      if (searchTerm !== debouncedSearchTerm) {
        setCurrentPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, debouncedSearchTerm])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  // Show section only when active
  if (activeSection !== "images") {
    return null
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files)
  }

  // File validation function
  const validateUpload = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    // Check if files are selected
    if (!selectedFiles || selectedFiles.length === 0) {
      errors.files = "Please select files to upload";
      return errors;
    }
    
    // File size validation (10MB max per file)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    Array.from(selectedFiles!).forEach((file) => {
      if (file.size > maxFileSize) {
        errors.files = `File "${file.name}" is too large. Maximum size is 10MB`;
      }
    });
    
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    Array.from(selectedFiles!).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        errors.files = `File "${file.name}" is not a supported image format. Allowed: JPEG, PNG, WebP, GIF`;
      }
    });
    
    // Gallery specific validation
    if (uploadType === "gallery") {
      if (selectedFiles.length > 10) {
        errors.files = "Maximum 10 files can be uploaded at once for gallery";
      }
    }
    
    // Branding specific validation
    if (uploadType === "branding") {
      if (!brandingType) {
        errors.brandingType = "Please select a branding type";
      }

      if (selectedFiles.length > 1) {
        errors.files = "Only one file can be uploaded at a time for branding";
      }
    }
    
    return errors;
  };

  const handleUpload = async () => {
    // Validate upload
    const errors = validateUpload();
    
    if (Object.keys(errors).length > 0) {
      // Show the first error
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      
      if (uploadType === "gallery") {
        // Multiple files for gallery
        Array.from(selectedFiles!).forEach(file => {
          formData.append("gallery_images", file)
        })
        
        const response = await API.post("/images/gallery", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        })
        
        // Always show success toast for 200 responses
        toast.success(`${selectedFiles!.length} gallery images uploaded successfully`)
        loadImages()
      } else if (uploadType === "branding") {
        // Single file for branding
        formData.append("branding_image", selectedFiles![0])
        formData.append("type", brandingType)

        const response = await API.post("/images/branding", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        })

        // Always show success toast for 200 responses
        toast.success(`${brandingType} image uploaded successfully`)
        loadImages()
      }
    } catch (error: any) {
      console.error("Upload failed:", error)
      toast.error(getErrorMessage(error, "Upload failed"))
    } finally {
      setUploading(false)
      // Always close dialog and reset form after upload attempt
      setUploadDialogOpen(false)
      setSelectedFiles(null)
      setBrandingType("")
    }
  }

  const handleDeleteImage = (imageId: number, type: string) => {
    setImageToDelete({ id: imageId, type })
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return

    try {
      // Optimistically remove image from UI immediately
      setImagesData(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== imageToDelete.id)
      }))

      // Close view dialog if this image was being viewed
      if (selectedImage?.id === imageToDelete.id) {
        setViewDialogOpen(false)
        setSelectedImage(null)
      }

      // Show success toast immediately
      toast.success("Image deleted successfully")

      // Call API in background
      await API.delete(`/images/${imageToDelete.id}?type=${imageToDelete.type}`)

      // Refresh the list to ensure consistency
      loadImages()
    } catch (error: any) {
      console.error("Delete failed:", error)
      toast.error(getErrorMessage(error, "Failed to delete image"))
      // Reload images on error to restore correct state
      loadImages()
    } finally {
      setDeleteConfirmOpen(false)
      setImageToDelete(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "gallery": return "bg-blue-100 text-blue-800"
      case "branding": return "bg-green-100 text-green-800"
      case "profile": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image Gallery Management
          </CardTitle>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search Images</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div>
            <Label>Filter by Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="gallery">Gallery</SelectItem>
                <SelectItem value="branding">Branding</SelectItem>
                <SelectItem value="profile">Profile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button variant="outline" onClick={loadImages} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Images Grid */}
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {imagesData.images.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No images found</p>
                <p className="text-sm">Upload some images to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {imagesData.images.map((image) => (
                  <div
                    key={image.id}
                    className="relative group border rounded-lg overflow-hidden bg-gray-50"
                  >
                    <div className="aspect-square">
                      <img
                        src={getImageUrl(image.thumbnailUrl || image.url)}
                        alt={image.originalName}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setSelectedImage(image)
                          setViewDialogOpen(true)
                        }}
                      />
                    </div>
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedImage(image)
                            setViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteImage(image.id, image.type)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className={`text-xs ${getTypeColor(image.type)}`}>
                        {image.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {imagesData.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {imagesData.pagination.totalPages}
                  {" "}({imagesData.pagination.totalItems} total)
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === imagesData.pagination.totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Images</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Upload Type</Label>
                <Select
                  value={uploadType}
                  onValueChange={(value: "gallery" | "branding") => setUploadType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gallery">Gallery Images</SelectItem>
                    <SelectItem value="branding">Branding Images</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {uploadType === "branding" && (
                <div>
                  <Label htmlFor="brandingType">Branding Type</Label>
                  <Select
                    value={brandingType}
                    onValueChange={setBrandingType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branding type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logo">Logo</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="favicon">Favicon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="fileInput">
                  Select Images {uploadType === "gallery" ? "(multiple allowed)" : "(single file)"}
                </Label>
                <Input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  multiple={uploadType === "gallery"}
                  onChange={handleFileSelect}
                />
              </div>

              {selectedFiles && selectedFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFiles}
                  className="flex-1"
                >
                  {uploading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            {selectedImage && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedImage.originalName}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={getImageUrl(selectedImage.url)}
                      alt={selectedImage.originalName}
                      className="max-w-full max-h-96 object-contain rounded-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Type</Label>
                      <Badge className={`w-fit ${getTypeColor(selectedImage.type)}`}>
                        {selectedImage.type}
                      </Badge>
                    </div>
                    <div>
                      <Label>File Size</Label>
                      <p className="text-muted-foreground">{formatFileSize(selectedImage.size)}</p>
                    </div>
                    <div>
                      <Label>Uploaded</Label>
                      <p className="text-muted-foreground">{formatDate(selectedImage.uploadedAt)}</p>
                    </div>
                    <div>
                      <Label>URL</Label>
                      <p className="text-muted-foreground text-xs break-all">{selectedImage.url}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => window.open(getImageUrl(selectedImage.url), "_blank")}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open Full Size
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteImage(selectedImage.id, selectedImage.type)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete this image? This action cannot be undone.
              </p>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteImage}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}