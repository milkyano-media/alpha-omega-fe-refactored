"use client"

import React, { useState, useRef } from 'react'
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Badge } from "./badge"
import { Card, CardContent } from "./card"
import { Upload, X, Eye, Image as ImageIcon, Loader2 } from "lucide-react"
import { API } from "@/lib/api-client"
import toast from "react-hot-toast"
import { getErrorMessage } from "@/lib/error-utils"

interface FormImageUploadProps {
  value?: string // Current image URL
  onChange: (imageUrl: string) => void // Callback when image URL changes
  onError?: (error: string) => void // Callback for validation errors
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  maxSizeKB?: number // Maximum file size in KB, default 5MB
  accept?: string // Accepted file types
  uploadType?: "gallery" | "branding" | "profile" | "service" // Upload endpoint type
  className?: string
}

export function FormImageUpload({
  value,
  onChange,
  onError,
  label = "Image",
  placeholder = "Upload an image or enter URL",
  required = false,
  disabled = false,
  maxSizeKB = 5120, // 5MB default
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  uploadType = "service",
  className = ""
}: FormImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    // File type validation
    const allowedTypes = accept.split(',').map(type => type.trim())
    if (!allowedTypes.includes(file.type)) {
      return `File type not supported. Allowed types: ${allowedTypes.join(', ')}`
    }

    // File size validation
    const maxSize = maxSizeKB * 1024 // Convert to bytes
    if (file.size > maxSize) {
      return `File size too large. Maximum size: ${(maxSizeKB / 1024).toFixed(1)}MB`
    }

    return null
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      if (onError) onError(validationError)
      toast.error(validationError)
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      
      // Determine the correct endpoint and form field based on upload type
      let endpoint: string
      let fieldName: string
      
      switch (uploadType) {
        case "gallery":
          endpoint = "/images/gallery"
          fieldName = "gallery_images"
          break
        case "branding":
          endpoint = "/images/branding"
          fieldName = "branding_image"
          formData.append("type", "branding") // Generic branding type
          break
        case "profile":
          endpoint = "/images/profile"
          fieldName = "profile_image"
          break
        case "service":
        default:
          // Use dedicated service endpoint
          endpoint = "/images/service"
          fieldName = "service_image"
          break
      }
      
      formData.append(fieldName, file)
      
      const response = await API.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      
      console.log('Upload response:', response)
      
      // Handle the actual response structure: {data: {...}, status_code: 200, message: '...'}
      if (response?.status_code !== 200) {
        throw new Error(response?.message || "Upload failed")
      }
      
      // Extract image URL from the nested data structure
      const relativeUrl = response?.data?.image_url || 
                         response?.data?.url || 
                         response?.data?.public_url ||
                         response?.data?.publicUrl ||
                         // Fallback to direct properties
                         response?.image_url || 
                         response?.url || 
                         response?.public_url ||
                         response?.publicUrl
      
      // Convert relative URL to absolute URL pointing to backend
      const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:3001"
      const uploadedUrl = relativeUrl?.startsWith('/') ? `${backendBaseUrl}${relativeUrl}` : relativeUrl
      
      if (uploadedUrl) {
        onChange(uploadedUrl)
        toast.success("Image uploaded successfully")
        if (onError) onError("") // Clear any previous errors
      } else {
        console.error('No URL found in response:', response)
        throw new Error("No URL returned from upload")
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to upload image")
      if (onError) onError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
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
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    onChange(url)
    if (onError) onError("") // Clear validation errors when typing
  }

  // Clear image
  const handleClear = () => {
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (onError) onError("")
  }

  // Open file dialog
  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label htmlFor="image-upload">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      {/* Current Image Preview */}
      {value && value.trim() !== "" && (
        <Card className="p-2">
          <CardContent className="flex items-center gap-3 p-2">
            <div className="relative w-16 h-16 rounded border overflow-hidden bg-gray-100">
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjIiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI2IDMwTDMwIDM0TDM4IDI2TDQ0IDMyVjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K"
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{value.split('/').pop()}</p>
              <Badge variant="secondary" className="text-xs">Current Image</Badge>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(value, '_blank')}
                disabled={disabled}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
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
              <p className="text-sm text-gray-600">Uploading image...</p>
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
                  {accept.replace(/image\//g, '').toUpperCase()} up to {(maxSizeKB / 1024).toFixed(1)}MB
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
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
      </div>

      {/* Manual URL Input */}
      <div className="space-y-2">
        <Label htmlFor="manual-url" className="text-sm text-gray-600">
          Or enter image URL manually:
        </Label>
        <Input
          id="manual-url"
          value={value || ""}
          onChange={handleUrlChange}
          placeholder={placeholder}
          disabled={disabled}
          className="text-sm"
        />
      </div>
    </div>
  )
}