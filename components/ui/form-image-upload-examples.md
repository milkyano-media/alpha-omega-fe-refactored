# FormImageUpload Component Examples

The `FormImageUpload` component provides a unified interface for uploading images directly in forms, with drag-and-drop functionality and manual URL input as a fallback.

## Basic Usage in React Hook Form

### Services Form (Already Implemented)
```tsx
import { FormImageUpload } from "@/components/ui/form-image-upload"

// In your form component:
<FormImageUpload
  label="Service Image"
  value={watch("image_url")}
  onChange={(url) => setValue("image_url", url)}
  onError={(error) => {
    // Handle validation errors
  }}
  placeholder="Upload service image or enter URL"
  uploadType="service"
  maxSizeKB={5120} // 5MB
  accept="image/jpeg,image/jpg,image/png,image/webp"
  required={false}
/>
```

### Team Member Profile Image Example
```tsx
// For team member forms (when implemented):
<FormImageUpload
  label="Profile Image"
  value={watch("profile_image_url")}
  onChange={(url) => setValue("profile_image_url", url)}
  onError={(error) => {
    // Handle errors - could set form validation state
    if (error) {
      setError("profile_image_url", { message: error })
    } else {
      clearErrors("profile_image_url")
    }
  }}
  placeholder="Upload team member photo"
  uploadType="profile"
  maxSizeKB={2048} // 2MB for profiles
  accept="image/jpeg,image/jpg,image/png"
  required={true}
/>
```

### Business Branding Images Example
```tsx
// For business settings/branding:
<FormImageUpload
  label="Logo Image"
  value={logoUrl}
  onChange={setLogoUrl}
  onError={(error) => toast.error(error)}
  placeholder="Upload company logo"
  uploadType="branding"
  maxSizeKB={1024} // 1MB for logos
  accept="image/png,image/svg+xml"
  required={false}
/>
```

### Gallery Images Example
```tsx
// For multiple gallery images (note: this is for single image selection)
<FormImageUpload
  label="Gallery Image"
  value={watch("gallery_image")}
  onChange={(url) => setValue("gallery_image", url)}
  placeholder="Upload gallery image"
  uploadType="gallery"
  maxSizeKB={10240} // 10MB for high-quality gallery
  accept="image/jpeg,image/jpg,image/png,image/webp"
/>
```

## Integration with Zod Validation

### Service Schema Example (Already Implemented)
```tsx
const serviceSchema = z.object({
  // ... other fields
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
```

### Team Member Schema Example
```tsx
const teamMemberSchema = z.object({
  // ... other fields
  profile_image_url: z.string()
    .min(1, "Profile image is required")
    .refine((val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, "Profile image URL must be valid"),
    
  gallery_images: z.array(z.string().url()).optional()
})
```

## Component Props

- **value**: Current image URL (string)
- **onChange**: Callback when image URL changes `(url: string) => void`
- **onError**: Optional error callback `(error: string) => void`
- **label**: Field label (default: "Image")
- **placeholder**: Placeholder text
- **required**: Whether the field is required
- **disabled**: Disable the component
- **maxSizeKB**: Max file size in KB (default: 5120 = 5MB)
- **accept**: Accepted MIME types (default: jpeg,jpg,png,webp)
- **uploadType**: Upload endpoint type ("gallery" | "branding" | "profile" | "service")
- **className**: Additional CSS classes

## Upload Types and Endpoints

- **service**: Uses `/images/branding` with type="service"
- **profile**: Uses `/images/profile/:teamMemberId` 
- **branding**: Uses `/images/branding` with type="branding"
- **gallery**: Uses `/images/gallery` for multiple images

## Features

✅ **Drag & Drop**: Visual feedback and easy file dropping
✅ **File Validation**: Size and type checking with clear error messages  
✅ **Image Preview**: Shows current image with view/clear options
✅ **Progress Indicator**: Loading state during upload
✅ **Manual URL Input**: Fallback for external images or paste URLs
✅ **Error Handling**: Integrated with form validation systems
✅ **Responsive Design**: Works on mobile and desktop
✅ **Accessibility**: Proper labels and keyboard navigation

## Backend Requirements

The component expects these API endpoints to exist:
- `POST /api/images/branding` - For service and branding images
- `POST /api/images/profile/:id` - For profile images  
- `POST /api/images/gallery` - For gallery images

Response format expected:
```json
{
  "status_code": 200,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://example.com/uploaded-image.jpg",
    "image_url": "https://example.com/uploaded-image.jpg"
  }
}
```

## Future Team Members Form

When implementing team member management, use the FormImageUpload component for:
1. **Profile Image**: Single required image for team member profiles
2. **Gallery Images**: Multiple optional images for portfolios
3. **Proper validation** with the team member schema
4. **Integration** with existing `/images/profile/:teamMemberId` endpoint