# Flexible Form Submission System

This project now includes a flexible form submission system that can handle any form structure with dynamic Google Sheets and email configuration.

## Environment Setup

Add these environment variables to your `.env.local` file:

```env
# Form Submission Configuration
NEXT_PUBLIC_FORM_SPREADSHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
NEXT_PUBLIC_FORM_EMAIL_RECEIVER=your-email@example.com
```

## Backend API Endpoints

### New Flexible Endpoint

```
POST /api/form-submissions
```

**Request Body:**
```json
{
  "formData": {
    "name": "Darwin Prayoga",
    "project": "Website Redesign",
    "budget": "5,000 USD",
    "email": "darwin@example.com"
  },
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/abc123/edit",
  "emailReceiver": "client@example.com",
  "metadata": {
    "formType": "project-inquiry",
    "subject": "New Project Inquiry",
    "fromName": "Contact Form"
  }
}
```

### Legacy Endpoint (Backward Compatible)

```
POST /api/barber-applications
```

**Request Body:** (Original format still works)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+61 412 345 678",
  "experience": "5 years experience...",
  "specializations": "Fades, beard styling",
  "availability": "Full-time",
  "portfolio": "https://instagram.com/john"
}
```

## Frontend Usage

### Using the Form Submission Service

Import the service:
```typescript
import FormSubmissionService from "@/lib/form-submission-service";
```

### Pre-built Methods

#### Barber Application
```typescript
await FormSubmissionService.submitBarberApplication({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phoneNumber: "+61 412 345 678",
  experience: "5 years of experience...",
  specializations: "Fades, beard styling",
  availability: "Full-time",
  portfolio: "https://instagram.com/john"
});
```

#### Project Inquiry
```typescript
await FormSubmissionService.submitProjectInquiry({
  name: "Darwin Prayoga",
  email: "darwin@example.com",
  project: "Website Redesign",
  budget: "5,000 USD",
  message: "Looking to redesign our website..."
});
```

#### Contact Form
```typescript
await FormSubmissionService.submitContactForm({
  name: "Jane Smith",
  email: "jane@example.com",
  subject: "Question about services",
  message: "I have a question about your services..."
});
```

#### Custom Form
```typescript
await FormSubmissionService.submitCustomForm(
  {
    // Any form data structure
    customerName: "Alex Johnson",
    serviceType: "Premium Package",
    requestedDate: "2024-01-15",
    specialRequests: "Please include extra features"
  },
  "service-booking", // Form type
  {
    fromName: "Service Booking Form",
    customSubject: "New Service Booking Request"
  }
);
```

### Generic Submission
```typescript
await FormSubmissionService.submitForm(
  formData, // Any object structure
  {
    formType: "custom-form-type",
    fromName: "My Custom Form",
    subjectTemplate: (data) => `New submission from ${data.name}`
  }
);
```

## Features

### 🎯 **Complete Flexibility**
- Handle any form structure without code changes
- No predefined schemas required

### 📊 **Dynamic Google Sheets Integration**
- Automatically creates headers based on form fields
- Appends data to any Google Sheets URL
- Handles different form structures in the same sheet

### 📧 **Smart Email Generation**
- Dynamic HTML email templates
- Auto-formatting for emails, phones, URLs
- Professional responsive design
- Intelligent field icons and formatting

### 🛡️ **Error Resilience**
- Graceful handling of Google Sheets failures
- Email service fallback (Resend → SMTP)
- Detailed error logging and user feedback

### 🔄 **Backward Compatibility**
- Existing barber application form continues working
- Legacy API endpoints maintained
- Gradual migration path available

### ⚙️ **Environment-Driven Configuration**
- No hardcoded spreadsheet URLs or emails
- Easy deployment across different environments
- Secure configuration management

## Example Forms

### Simple Contact Form
```typescript
// components/contact-form.tsx
const contactData = {
  name: formValues.name,
  email: formValues.email,
  message: formValues.message
};

await FormSubmissionService.submitContactForm(contactData);
```

### Complex Multi-Field Form
```typescript
// Any structure works!
const complexData = {
  personalInfo: {
    firstName: "John",
    lastName: "Doe"
  },
  preferences: ["option1", "option2"],
  metadata: {
    source: "website",
    campaign: "summer2024"
  }
};

await FormSubmissionService.submitCustomForm(
  complexData,
  "complex-form",
  { fromName: "Complex Form System" }
);
```

## Email Output Examples

The system automatically generates professional emails:

- **Field Detection**: Automatically formats emails, phones, URLs as clickable links
- **Smart Icons**: Adds relevant icons (👤 for names, 📧 for emails, 💰 for budget, etc.)
- **Large Text Handling**: Special formatting for long text fields like experience/messages
- **Responsive Design**: Professional styling that works on all devices

## Migration from Old System

The old barber application system has been completely replaced but remains backward compatible:

1. **Database**: Old `barber_applications` table → New `form_submissions` table with JSONB
2. **API**: New `/form-submissions` endpoint with legacy `/barber-applications` compatibility
3. **Frontend**: Updated to use new flexible system via environment variables

## Getting Started

1. **Set Environment Variables**: Add spreadsheet URL and email receiver to `.env.local`
2. **Configure Google Sheets**: See `GOOGLE_SHEETS_SETUP.md` in the backend for detailed setup
3. **Use the Service**: Import `FormSubmissionService` in your components
4. **Choose Method**: Use pre-built methods or create custom submissions
5. **Test**: Submit forms and check your configured spreadsheet and email

## Troubleshooting

### Common Frontend Issues

#### Environment Variables Not Working
```bash
# Make sure variables start with NEXT_PUBLIC_
NEXT_PUBLIC_FORM_SPREADSHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_ID/edit
NEXT_PUBLIC_FORM_EMAIL_RECEIVER=your-email@example.com
```

#### Form Submission Errors
- Check browser console for detailed error messages
- Verify environment variables are set correctly
- Ensure backend server is running

### Backend Issues

#### Google Sheets Integration Fails
The system is designed to be resilient - **forms will still work** even if Google Sheets fails:

- ✅ Form data is always saved to database
- ✅ Email notifications still work
- ⚠️ Google Sheets sync may fail (check logs)

#### Error Messages
- `"Requested entity was not found"` → Invalid spreadsheet URL
- `"No access to spreadsheet"` → Check sharing permissions
- `"Authentication not configured"` → Set up service account

### Quick Fix for Testing

If Google Sheets isn't working immediately, you can still test the system:

1. **Forms will submit successfully** (saved to database)
2. **Emails will be sent** (if email service is configured)
3. **Google Sheets sync will show warning** but won't break the form

Check the backend console logs for detailed status information.

That's it! The system handles everything else automatically.