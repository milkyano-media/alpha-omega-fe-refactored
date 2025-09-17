import apiClient from './api-client';

interface FormSubmissionData {
  formData: Record<string, any>;
  spreadsheetUrl?: string;
  emailReceiver?: string;
  metadata?: {
    formType?: string;
    subject?: string;
    fromName?: string;
  };
}

interface FormSubmissionConfig {
  formType: string;
  fromName?: string;
  subjectTemplate?: (formData: Record<string, any>) => string;
}

class FormSubmissionService {
  /**
   * Submit form data using the flexible form submission API
   */
  static async submitForm(
    formData: Record<string, any>,
    config: FormSubmissionConfig
  ): Promise<any> {
    // Get configuration from environment variables
    const spreadsheetUrl = process.env.NEXT_PUBLIC_FORM_SPREADSHEET_URL;
    const emailReceiver = process.env.NEXT_PUBLIC_FORM_EMAIL_RECEIVER;

    // Debug: Log environment variables (remove in production)
    console.log('🔧 Environment variables:');
    console.log('📊 Spreadsheet URL:', spreadsheetUrl);
    console.log('📧 Email Receiver:', emailReceiver);

    // Validate required environment variables
    if (!spreadsheetUrl || !emailReceiver) {
      console.error('❌ Missing environment variables:');
      console.error('NEXT_PUBLIC_FORM_SPREADSHEET_URL:', spreadsheetUrl);
      console.error('NEXT_PUBLIC_FORM_EMAIL_RECEIVER:', emailReceiver);
      throw new Error(
        'Form configuration missing. Please set NEXT_PUBLIC_FORM_SPREADSHEET_URL and NEXT_PUBLIC_FORM_EMAIL_RECEIVER environment variables.'
      );
    }

    // Generate subject if template provided
    const subject = config.subjectTemplate
      ? config.subjectTemplate(formData)
      : `New ${config.formType} Submission`;

    const submissionData: FormSubmissionData = {
      formData,
      spreadsheetUrl,
      emailReceiver,
      metadata: {
        formType: config.formType,
        subject,
        fromName: config.fromName || 'Form Submission'
      }
    };

    // Submit to the flexible form submissions endpoint
    return await apiClient.post('/form-submissions', submissionData);
  }

  /**
   * Submit barber application using the new flexible format
   */
  static async submitBarberApplication(applicationData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    experience: string;
    specializations: string;
    availability: string;
    portfolio?: string;
  }): Promise<any> {
    return this.submitForm(
      {
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        email: applicationData.email,
        phoneNumber: applicationData.phoneNumber,
        experience: applicationData.experience,
        specializations: applicationData.specializations,
        availability: applicationData.availability,
        portfolio: applicationData.portfolio || null
      },
      {
        formType: 'barber-application',
        fromName: 'Alpha Omega Barber Application',
        subjectTemplate: (data) => `New Barber Application - ${data.firstName} ${data.lastName}`
      }
    );
  }

  /**
   * Submit project inquiry using the flexible format
   */
  static async submitProjectInquiry(projectData: {
    name: string;
    email: string;
    project: string;
    budget?: string;
    message?: string;
  }): Promise<any> {
    return this.submitForm(
      projectData,
      {
        formType: 'project-inquiry',
        fromName: 'Project Contact Form',
        subjectTemplate: (data) => `New Project Inquiry - ${data.name} (${data.project})`
      }
    );
  }

  /**
   * Submit contact form using the flexible format
   */
  static async submitContactForm(contactData: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }): Promise<any> {
    return this.submitForm(
      contactData,
      {
        formType: 'contact-form',
        fromName: 'Contact Form',
        subjectTemplate: (data) => data.subject || `New Contact Form - ${data.name}`
      }
    );
  }

  /**
   * Generic form submission for any custom form
   */
  static async submitCustomForm(
    formData: Record<string, any>,
    formType: string,
    options?: {
      fromName?: string;
      customSubject?: string;
    }
  ): Promise<any> {
    return this.submitForm(
      formData,
      {
        formType,
        fromName: options?.fromName || 'Custom Form',
        subjectTemplate: () => options?.customSubject || `New ${formType} Submission`
      }
    );
  }
}

export default FormSubmissionService;