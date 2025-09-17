"use client"

import React, { useState, useRef } from 'react'
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
// import { Badge } from "./badge"
import { Card, CardContent } from "./card"
import { Upload, X, Eye, Image as ImageIcon, Loader2, Plus } from "lucide-react"
import { API } from "@/lib/api-client"
import toast from "react-hot-toast"
import { getErrorMessage } from "@/lib/error-utils"

interface FormGalleryUploadProps {
  value?: string[] // Array of current image URLs
  onChange: (imageUrls: string[]) => void // Callback when image URLs change
  onError?: (error: string) => void // Callback for validation errors
  label?: string
  placeholder?: string
  disabled?: boolean
  maxFiles?: number // Maximum number of files (default 10)
  maxSizeKB?: number // Maximum file size in KB per file, default 5MB
  accept?: string // Accepted file types
  uploadType?: "gallery" | "service" | "portfolio" // Upload endpoint type
  className?: string
}

export function FormGalleryUpload({
  value = [],
  onChange,
  onError,
  label = "Gallery Images",
  placeholder = "Upload images or enter URLs",
  disabled = false,
  maxFiles = 10,
  maxSizeKB = 5120, // 5MB default
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  uploadType = "gallery",
  className = ""
}: FormGalleryUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [newUrl, setNewUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate files before upload
  const validateFiles = (files: FileList): string | null => {
    if (files.length > maxFiles) {
      return `Maximum ${maxFiles} files allowed`
    }

    // Check if adding these files would exceed the limit
    if (value.length + files.length > maxFiles) {
      return `Adding ${files.length} files would exceed the maximum of ${maxFiles} total images`
    }

    // File type and size validation
    const allowedTypes = accept.split(',').map(type => type.trim())
    const maxSize = maxSizeKB * 1024 // Convert to bytes
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (!allowedTypes.includes(file.type)) {
        return `File "${file.name}" type not supported. Allowed types: ${allowedTypes.join(', ')}`
      }
      
      if (file.size > maxSize) {
        return `File "${file.name}" is too large. Maximum size: ${(maxSizeKB / 1024).toFixed(1)}MB`
      }
    }

    return null
  }

  // Handle multiple file upload
  const handleFileUpload = async (files: FileList) => {
    // Validate files
    const validationError = validateFiles(files)
    if (validationError) {
      if (onError) onError(validationError)
      toast.error(validationError)
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      
      // Add all files to FormData with correct field name based on upload type
      const fieldName = uploadType === "service" ? "service_image" : "gallery_images"
      Array.from(files).forEach(file => {
        formData.append(fieldName, file)
      })
      
      const endpoint = uploadType === "service" ? "/images/service" : "/images/gallery"
      
      const response = await API.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      
      console.log('Upload response:', response)
      console.log('Response data type:', typeof response?.data)
      console.log('Is response data array:', Array.isArray(response?.data))
      console.log('Response data content:', response?.data)
      
      // Handle the actual response structure: {data: [...], status_code: 200, message: '...'}
      // Note: API client already extracts response.data, so we get the backend response directly
      if (response?.status_code !== 200) {
        throw new Error(response?.message || "Upload failed")
      }
      
      // Extract image URLs from the response
      let newUrls: string[] = []
      
      if (Array.isArray(response?.data)) {
        // Gallery uploads return array in data field: {data: [{url: "...", filename: "..."}, ...]}
        console.log('Processing array data, items:', response.data.length)
        newUrls = response.data.map((item: any) => {
          console.log('Processing item:', item)
          // Check various possible URL field names
          return item?.url || item?.publicUrl || item?.public_url || item?.image_url
        }).filter(Boolean)
        console.log('Extracted URLs from array:', newUrls)
      } else if (response?.data?.urls && Array.isArray(response.data.urls)) {
        newUrls = response.data.urls
      } else if (response?.data?.images && Array.isArray(response.data.images)) {
        newUrls = response.data.images.map((img: any) => img.url || img.image_url || img.publicUrl).filter(Boolean)
      } else if (response?.data?.url) {
        newUrls = [response.data.url]
      } else if (response?.data?.image_url) {
        newUrls = [response.data.image_url]
      } else if (response?.data?.publicUrl) {
        newUrls = [response.data.publicUrl]
      }
      
      // Convert relative URLs to absolute URLs pointing to backend
      const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:3001"
      const uploadedUrls = newUrls.map(url => 
        url?.startsWith('/') ? `${backendBaseUrl}${url}` : url
      ).filter(Boolean)
      
      if (uploadedUrls.length > 0) {
        const updatedUrls = [...value, ...uploadedUrls]
        onChange(updatedUrls)
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`)
        if (onError) onError("") // Clear any previous errors
      } else {
        console.error('No URLs found in response:', response)
        throw new Error("No URLs returned from upload")
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to upload images")
      if (onError) onError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  // Handle manual URL input
  const handleAddUrl = () => {
    if (!newUrl.trim()) return
    
    // Basic URL validation
    try {
      new URL(newUrl)
    } catch {
      const error = "Please enter a valid URL"
      if (onError) onError(error)
      toast.error(error)
      return
    }
    
    if (value.length >= maxFiles) {
      const error = `Maximum ${maxFiles} images allowed`
      if (onError) onError(error)
      toast.error(error)
      return
    }
    
    if (value.includes(newUrl)) {
      const error = "This URL is already in the gallery"
      if (onError) onError(error)
      toast.error(error)
      return
    }
    
    onChange([...value, newUrl])
    setNewUrl("")
    if (onError) onError("") // Clear validation errors
  }

  // Remove image from gallery
  const handleRemoveImage = (index: number) => {
    const updatedUrls = value.filter((_, i) => i !== index)
    onChange(updatedUrls)
    if (onError) onError("")
  }

  // Open file dialog
  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Label htmlFor="gallery-upload">
        {label} ({value.length}/{maxFiles})
      </Label>
      
      {/* Current Images Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {value.map((imageUrl, index) => (
            <Card key={index} className="p-2">
              <CardContent className="p-2">
                <div className="relative aspect-square rounded border overflow-hidden bg-gray-100 mb-2">
                  <img
                    src={imageUrl}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjIiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI2IDMwTDMwIDM0TDM4IDI2TDQ0IDMyVjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K"
                    }}
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(imageUrl, '_blank')}
                    disabled={disabled}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveImage(index)}
                    disabled={disabled}
                    className="flex-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {value.length < maxFiles && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={disabled ? undefined : openFileDialog}
        >
          <div className="text-center">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Uploading images...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {accept.replace(/image\//g, '').toUpperCase()} up to {(maxSizeKB / 1024).toFixed(1)}MB each
                  </p>
                  <p className="text-xs text-gray-500">
                    Maximum {maxFiles} images, {maxFiles - value.length} remaining
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple
            onChange={handleFileSelect}
            disabled={disabled || uploading}
          />
        </div>
      )}

      {/* Manual URL Input */}
      {value.length < maxFiles && (
        <div className="space-y-2">
          <Label htmlFor="manual-url" className="text-sm text-gray-600">
            Or add image URL manually:
          </Label>
          <div className="flex gap-2">
            <Input
              id="manual-url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="text-sm flex-1"
            />
            <Button
              type="button"
              onClick={handleAddUrl}
              disabled={disabled || !newUrl.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}